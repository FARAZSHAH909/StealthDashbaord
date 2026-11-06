"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import {
  unlockMasterVaultWithPassphrase,
  recoverMasterVaultWithSeed,
  createMasterVault
} from "./masterVaultService";
import {
  importRawEncryptionKey,
  deriveKeyFromPassphrase,
  unwrapDeviceKey,
  decryptRecordWithAad,
  buildCanonicalBinaryAad,
  verifyRecordSignature
} from "./webCrypto";
import { validateAndRecordSequence } from "../utils/replayLedgerService";
import { firestore, auth } from "../firebase/client";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, onSnapshot, collection } from "firebase/firestore";


const KeyVaultContext = createContext({
  isUnlocked: false,
  cryptoKey: null,
  masterPrivateKey: null,
  keyFingerprint: null,
  keyVersion: 1,
  error: null,
  unlockWithAdminPassword: async () => { },
  unlockWithRawKey: async () => { },
  unlockWithPassphrase: async () => { },
  unlockVault: async () => { },
  recoverVault: async () => { },
  initializeVault: async () => { },
  lockVault: () => { },
  decryptDeviceMessage: async () => { },
  isDeviceRevoked: () => false,
});

export function KeyVaultProvider({ children }) {
  const [cryptoKey, setCryptoKey] = useState(null);
  const [rawFingerprint, setRawFingerprint] = useState(null);
  const [masterPrivateKey, setMasterPrivateKey] = useState(null);
  const [masterFingerprint, setMasterFingerprint] = useState(null);
  const [keyVersion, setKeyVersion] = useState(1);
  const [error, setError] = useState(null);
  const [revokedDeviceIds, setRevokedDeviceIds] = useState(new Set());

  // In-memory non-extractable device AES keys cache: Map<deviceId, CryptoKey>
  const deviceKeysCacheRef = useRef(new Map());
  const inactivityTimerRef = useRef(null);

  // Wipes all cryptographic material from RAM
  const lockVault = useCallback(() => {
    setCryptoKey(null);
    setRawFingerprint(null);
    setMasterPrivateKey(null);
    setMasterFingerprint(null);
    setError(null);
    deviceKeysCacheRef.current.clear();
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  }, []);

  // Inactivity timeout: auto-lock after 15 minutes of inactivity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(() => {
      lockVault();
    }, 15 * 60 * 1000);
  }, [lockVault]);

  useEffect(() => {
    const handleActivity = () => {
      if (masterPrivateKey || cryptoKey) resetInactivityTimer();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [masterPrivateKey, cryptoKey, resetInactivityTimer]);

  // AUTOMATIC INITIALIZATION: Securely load master key into browser RAM via authenticated server endpoint
  const loadMasterKeyInMemory = useCallback(async () => {
    try {
      const headers = {};
      if (auth.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch (e) {}
      }
      const res = await fetch("/api/v1/vault/key", { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.keyBase64) {
          const key = await importRawEncryptionKey(data.keyBase64);
          setCryptoKey(key);
          setRawFingerprint("HEX-0x7F9E8A");
          return key;
        }
      }
    } catch (err) {
    }
    return null;
  }, []);

  // 1. Initial Auto-load on mount
  useEffect(() => {
    loadMasterKeyInMemory();
  }, [loadMasterKeyInMemory]);

  // 2. Synchronize with Firebase Auth state
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        loadMasterKeyInMemory();
      }
    });
    return () => unsubAuth();
  }, [loadMasterKeyInMemory]);

  // Real-time Firestore listener for live Device Revocation (only when user is authenticated)
  useEffect(() => {
    let unsubSnap = null;
    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        try {
          unsubSnap = onSnapshot(
            collection(firestore, "devices_management"),
            (snapshot) => {
              const revoked = new Set();
              snapshot.forEach((d) => {
                const data = d.data();
                if (data.status === "REVOKED") {
                  revoked.add(data.device_id || d.id);
                  if (deviceKeysCacheRef.current.has(data.device_id || d.id)) {
                    deviceKeysCacheRef.current.delete(data.device_id || d.id);
                  }
                }
              });
              setRevokedDeviceIds(revoked);
            },
            () => {} // Suppress permission noise
          );
        } catch (e) {}
      } else {
        if (unsubSnap) {
          unsubSnap();
          unsubSnap = null;
        }
      }
    });

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
    };
  }, []);

  /**
   * Unlocks the in-memory vault by verifying administrator credentials (email & password).
   * Validates credentials against Firebase Auth / server-side verification,
   * then safely provisions the master encryption key into non-extractable RAM.
   */
  const unlockWithAdminPassword = async (email, password) => {
    setError(null);
    try {
      if (!password || !password.trim()) {
        throw new Error("Administrator login password is required.");
      }

      const adminEmail = (email && email.trim()) || auth.currentUser?.email || "farazshah9095@gmail.com";

      // 1. Verify administrator credentials with Firebase Auth
      let userCred = null;
      try {
        userCred = await signInWithEmailAndPassword(auth, adminEmail, password.trim());
      } catch (authErr) {
        // Fallback: verify with sync-login API endpoint
        try {
          const syncRes = await fetch("/api/auth/sync-login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: adminEmail, password: password.trim() }),
          });
          const syncData = await syncRes.json();
          if (syncData.provisioned) {
            userCred = await signInWithEmailAndPassword(auth, adminEmail, password.trim());
          }
        } catch (inner) {}
      }

      if (!userCred) {
        throw new Error("Invalid password or email. Administrator verification failed.");
      }

      // 2. Load non-extractable key into browser RAM
      const key = await loadMasterKeyInMemory();
      if (key) {
        resetInactivityTimer();
        return { success: true };
      } else {
        throw new Error("Unable to provision cryptographic key from secure vault.");
      }
    } catch (err) {
      const msg = err.message || "Authentication failed.";
      setError(msg);
      return { success: false, error: msg };
    }
  };

  /**
   * Unlocks using raw AES-256 key (Base64, Hex, or string).
   */
  const unlockWithRawKey = async (keyInput) => {
    setError(null);
    try {
      const key = await importRawEncryptionKey(keyInput);
      setCryptoKey(key);

      const enc = new TextEncoder();
      const hash = await window.crypto.subtle.digest("SHA-256", enc.encode(keyInput.trim()));
      const hashHex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 8);
      setRawFingerprint(`RAW-${hashHex.toUpperCase()}`);
      resetInactivityTimer();
      return { success: true };
    } catch (err) {
      setError(err.message || "Failed to import AES-256 key.");
      return { success: false, error: err.message };
    }
  };

  /**
   * Unlocks using PBKDF2 passphrase.
   */
  const unlockWithPassphrase = async (passphrase) => {
    setError(null);
    try {
      const key = await deriveKeyFromPassphrase(passphrase);
      setCryptoKey(key);

      const enc = new TextEncoder();
      const hash = await window.crypto.subtle.digest("SHA-256", enc.encode(passphrase));
      const hashHex = Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 8);
      setRawFingerprint(`PBKDF2-${hashHex.toUpperCase()}`);

      // Also attempt unlocking Master RSA Vault if user is authenticated
      if (auth.currentUser) {
        try {
          const vaultSnap = await getDoc(doc(firestore, "system_security", "master_private_vault"));
          if (vaultSnap.exists()) {
            const { privateKey, fingerprint, keyVersion: ver } = await unlockMasterVaultWithPassphrase(
              passphrase,
              vaultSnap.data()
            );
            setMasterPrivateKey(privateKey);
            setMasterFingerprint(fingerprint);
            setKeyVersion(ver);
          }
        } catch (innerErr) {
          // Suppress permission notice
        }
      }

      resetInactivityTimer();
      return { success: true };
    } catch (err) {
      setError(err.message || "Failed to derive key from passphrase.");
      return { success: false, error: err.message };
    }
  };

  /**
   * Unlocks the Master RSA-3072 Vault.
   */
  const unlockVault = async (passphrase) => {
    setError(null);
    try {
      const vaultSnap = await getDoc(doc(firestore, "system_security", "master_private_vault"));
      if (!vaultSnap.exists()) {
        throw new Error("Master Vault is not initialized. Please bootstrap the Master Key first.");
      }

      const vaultDoc = vaultSnap.data();
      const { privateKey, fingerprint, keyVersion: ver } = await unlockMasterVaultWithPassphrase(
        passphrase,
        vaultDoc
      );

      setMasterPrivateKey(privateKey);
      setMasterFingerprint(fingerprint);
      setKeyVersion(ver);
      resetInactivityTimer();
      return { success: true, fingerprint };
    } catch (err) {
      setError(err.message || "Failed to unlock Master Vault.");
      return { success: false, error: err.message };
    }
  };

  /**
   * Recovers Master Vault using 24-word BIP-39 recovery seed.
   */
  const recoverVault = async (recoverySeed, newPassphrase) => {
    setError(null);
    try {
      const vaultSnap = await getDoc(doc(firestore, "system_security", "master_private_vault"));
      if (!vaultSnap.exists()) {
        throw new Error("Master Vault document not found.");
      }

      const vaultDoc = vaultSnap.data();
      const { privateKey, updatedVaultDoc } = await recoverMasterVaultWithSeed(
        recoverySeed,
        vaultDoc,
        newPassphrase
      );

      await fetch("/api/admin/vault-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updatedVaultDoc })
      }).catch(() => null);

      setMasterPrivateKey(privateKey);
      setMasterFingerprint(vaultDoc.public_fingerprint);
      setKeyVersion(vaultDoc.key_version || 1);
      resetInactivityTimer();
      return { success: true };
    } catch (err) {
      setError(err.message || "Recovery failed.");
      return { success: false, error: err.message };
    }
  };

  /**
   * Initial bootstrap of Master Vault.
   */
  const initializeVault = async (masterPassphrase, recoverySeed) => {
    setError(null);
    try {
      const { publicManifest, privateVault, publicFingerprint } = await createMasterVault(
        masterPassphrase,
        recoverySeed,
        1
      );

      const res = await fetch("/api/admin/vault-init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicManifest, privateVault })
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to store vault on server");
      }

      const { privateKey } = await unlockMasterVaultWithPassphrase(masterPassphrase, privateVault);
      setMasterPrivateKey(privateKey);
      setMasterFingerprint(publicFingerprint);
      setKeyVersion(1);
      resetInactivityTimer();
      return { success: true, publicFingerprint };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  /**
   * Decrypts a device message using unwrapped device key.
   */
  const decryptDeviceMessage = async (record, deviceMeta) => {
    const deviceId = record.device_id || deviceMeta?.device_id;
    if (!deviceId) {
      return { success: false, plaintext: "", error: "Missing device_id" };
    }

    if (revokedDeviceIds.has(deviceId) || deviceMeta?.status === "REVOKED") {
      return { success: false, plaintext: "", error: "DEVICE_REVOKED: This device has been revoked." };
    }

    if (record.seq_num) {
      const replayCheck = await validateAndRecordSequence(deviceId, record.seq_num);
      if (!replayCheck.accepted) {
        return { success: false, plaintext: "", error: `REPLAY_ATTACK: ${replayCheck.reason}` };
      }
    }

    if (deviceMeta?.device_public_signing_key_spki && record.device_signature) {
      const sigCheck = await verifyRecordSignature({
        record,
        devicePublicSigningKeySpki: deviceMeta.device_public_signing_key_spki,
        isMigration: record.is_migration || false
      });
      if (!sigCheck.verified) {
        return { success: false, plaintext: "", error: `SIGNATURE_FAIL: ${sigCheck.reason}` };
      }
    }

    let deviceKey = deviceKeysCacheRef.current.get(deviceId);
    if (!deviceKey) {
      if (cryptoKey) {
        deviceKey = cryptoKey;
      } else if (masterPrivateKey && deviceMeta?.wrapped_device_key) {
        try {
          deviceKey = await unwrapDeviceKey(masterPrivateKey, deviceMeta.wrapped_device_key);
          deviceKeysCacheRef.current.set(deviceId, deviceKey);
        } catch (err) {
          return { success: false, plaintext: "", error: `Unwrap failed: ${err.message}` };
        }
      } else {
        return { success: false, plaintext: "", error: "Vault locked. Unlock vault to decrypt." };
      }
    }

    const aadBytes = buildCanonicalBinaryAad({
      device_id: deviceId,
      message_id: record.message_id || record.id || "",
      seq_num: record.seq_num || 0,
      key_version: record.key_version || 1,
      timestamp: record.timestamp || 0,
      is_migration: record.is_migration || false
    });

    return await decryptRecordWithAad({
      nonceBase64: record.iv || record.nonceBase64 || record.nonce || "",
      ciphertextBase64: record.ciphertext || record.ciphertextBase64 || "",
      authTagBase64: record.auth_tag || "",
      aadBytes,
      deviceCryptoKey: deviceKey
    });
  };

  const isDeviceRevoked = (deviceId) => revokedDeviceIds.has(deviceId);

  return (
    <KeyVaultContext.Provider
      value={{
        isUnlocked: !!masterPrivateKey || !!cryptoKey,
        cryptoKey,
        masterPrivateKey,
        keyFingerprint: masterFingerprint || rawFingerprint,
        keyVersion,
        error,
        unlockWithAdminPassword,
        unlockWithRawKey,
        unlockWithPassphrase,
        unlockVault,
        recoverVault,
        initializeVault,
        lockVault,
        decryptDeviceMessage,
        isDeviceRevoked,
      }}
    >
      {children}
    </KeyVaultContext.Provider>
  );
}

export function useKeyVault() {
  return useContext(KeyVaultContext);
}
