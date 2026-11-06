/**
 * ENTERPRISE MASTER KEY VAULT & DISASTER RECOVERY SERVICE
 *
 * Implements:
 * - RSA-3072 Asymmetric Key Wrapping (NIST SP 800-57 recommended)
 * - PBKDF2-HMAC-SHA256 Key Derivation (600,000 iterations, 128-bit random salt)
 * - Dual-Container Envelope Storage:
 *     Container A: Encrypted with Admin Passphrase (K_vault)
 *     Container B: Encrypted with 24-Word BIP-39 Emergency Recovery Seed (K_recovery)
 * - W3C SubtleCrypto non-extractable runtime memory isolation
 * - Cryptographic SHA-256 Public Key Fingerprinting
 * - Zero-Persistence In-Memory Decryption
 */

import { entropyToMnemonic, mnemonicToEntropy } from "./bip39.js";

const PBKDF2_ITERATIONS = 600000;
const PBKDF2_KEY_LENGTH = 256;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12;
const TAG_LENGTH_BITS = 128;

function getCrypto() {
  if (typeof window !== "undefined" && window.crypto) return window.crypto;
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  throw new Error("Web Crypto API is not available in the current runtime environment.");
}

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a cryptographically random 256-bit (24-word) BIP-39 recovery seed.
 */
export async function generateEmergencyRecoverySeed() {
  const cryptoObj = getCrypto();
  const entropy = new Uint8Array(32);
  cryptoObj.getRandomValues(entropy);
  const mnemonic = await entropyToMnemonic(entropy);
  entropy.fill(0); // Best-effort zeroization of raw entropy bytes
  return mnemonic;
}

/**
 * Derives a 256-bit AES key from a passphrase or seed using PBKDF2-HMAC-SHA256.
 */
export async function deriveKeyPbkdf2(secretText, saltBytes, domainTag = "") {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const inputToDerive = domainTag ? `${domainTag}:${secretText}` : secretText;

  const baseKey = await cryptoObj.subtle.importKey(
    "raw",
    enc.encode(inputToDerive),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await cryptoObj.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: PBKDF2_KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Generates the master RSA-3072 keypair and packages the dual-container vault.
 *
 * @param {string} masterPassphrase - High-entropy administrator passphrase
 * @param {string} recoveryMnemonic - 24-word BIP-39 emergency recovery phrase
 * @param {number} keyVersion - Master key version number (defaults to 1)
 */
export async function createMasterVault(masterPassphrase, recoveryMnemonic, keyVersion = 1) {
  const cryptoObj = getCrypto();

  // 1. Validate recovery mnemonic syntax & checksum
  await mnemonicToEntropy(recoveryMnemonic);

  // 2. Generate RSA-3072 Keypair
  const rsaKeyPair = await cryptoObj.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 3072,
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true, // Extractable only during bootstrap serialization
    ["encrypt", "decrypt"]
  );

  // 3. Export raw key buffers
  const spkiBytes = await cryptoObj.subtle.exportKey("spki", rsaKeyPair.publicKey);
  const pkcs8Bytes = await cryptoObj.subtle.exportKey("pkcs8", rsaKeyPair.privateKey);

  // 4. Compute SHA-256 fingerprint over public key SPKI
  const fpHash = await cryptoObj.subtle.digest("SHA-256", spkiBytes);
  const publicFingerprint = Array.from(new Uint8Array(fpHash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

  // 5. Container A: Encrypt PKCS8 under Master Passphrase (K_vault)
  const saltA = new Uint8Array(SALT_LENGTH_BYTES);
  const ivA = new Uint8Array(IV_LENGTH_BYTES);
  cryptoObj.getRandomValues(saltA);
  cryptoObj.getRandomValues(ivA);

  const vaultKey = await deriveKeyPbkdf2(masterPassphrase, saltA, "MASTER_VAULT_PASSPHRASE");
  const encryptedPkcs8A = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv: ivA, tagLength: TAG_LENGTH_BITS },
    vaultKey,
    pkcs8Bytes
  );

  // 6. Container B: Encrypt PKCS8 under Recovery Seed (K_recovery) with independent salt & domain separation
  const saltB = new Uint8Array(SALT_LENGTH_BYTES);
  const ivB = new Uint8Array(IV_LENGTH_BYTES);
  cryptoObj.getRandomValues(saltB);
  cryptoObj.getRandomValues(ivB);

  const recoveryKey = await deriveKeyPbkdf2(recoveryMnemonic, saltB, "EMERGENCY_RECOVERY_SEED");
  const encryptedPkcs8B = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv: ivB, tagLength: TAG_LENGTH_BITS },
    recoveryKey,
    pkcs8Bytes
  );

  // Best-effort cleanup of sensitive plaintext PKCS8 bytes
  new Uint8Array(pkcs8Bytes).fill(0);

  // 7. Structure Master Public Key Manifest (Stored in system_security/master_public_key)
  const publicManifest = {
    key_version: keyVersion,
    algorithm: "RSA-OAEP-3072",
    hash: "SHA-256",
    mgf: "MGF1-SHA256",
    public_key_spki: bufferToBase64(spkiBytes),
    fingerprint_sha256: publicFingerprint,
    created_at: Date.now(),
  };

  // 8. Structure Encrypted Master Private Vault (Stored in system_security/master_private_vault)
  const privateVault = {
    key_version: keyVersion,
    public_fingerprint: publicFingerprint,
    created_at: Date.now(),
    kdf: {
      algorithm: "PBKDF2-HMAC-SHA256",
      iterations: PBKDF2_ITERATIONS,
      key_length: PBKDF2_KEY_LENGTH,
    },
    container_passphrase: {
      salt: bufferToBase64(saltA),
      iv: bufferToBase64(ivA),
      encrypted_private_key: bufferToBase64(encryptedPkcs8A),
    },
    container_recovery: {
      salt: bufferToBase64(saltB),
      iv: bufferToBase64(ivB),
      encrypted_private_key: bufferToBase64(encryptedPkcs8B),
    },
  };

  return {
    publicManifest,
    privateVault,
    publicFingerprint,
  };
}

/**
 * Unlocks the Master Private Key from the vault using the Administrator Passphrase.
 * The private key is imported into RAM with extractable = false.
 *
 * @param {string} masterPassphrase - Admin passphrase
 * @param {object} privateVaultDoc - Firestore document system_security/master_private_vault
 * @returns {Promise<{ privateKey: CryptoKey, fingerprint: string, keyVersion: number }>}
 */
export async function unlockMasterVaultWithPassphrase(masterPassphrase, privateVaultDoc) {
  const cryptoObj = getCrypto();

  if (!privateVaultDoc || !privateVaultDoc.container_passphrase) {
    throw new Error("Invalid or uninitialized master vault container.");
  }

  const saltBytes = base64ToBuffer(privateVaultDoc.container_passphrase.salt);
  const ivBytes = base64ToBuffer(privateVaultDoc.container_passphrase.iv);
  const encryptedBytes = base64ToBuffer(privateVaultDoc.container_passphrase.encrypted_private_key);

  // Derive K_vault using documented iterations
  const vaultKey = await deriveKeyPbkdf2(masterPassphrase, saltBytes, "MASTER_VAULT_PASSPHRASE");

  try {
    const pkcs8Decrypted = await cryptoObj.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes, tagLength: TAG_LENGTH_BITS },
      vaultKey,
      encryptedBytes
    );

    // Import into RAM as non-extractable private key
    const privateKey = await cryptoObj.subtle.importKey(
      "pkcs8",
      pkcs8Decrypted,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false, // non-extractable!
      ["decrypt"]
    );

    // Best-effort cleanup of decrypted PKCS8 buffer
    new Uint8Array(pkcs8Decrypted).fill(0);

    return {
      privateKey,
      fingerprint: privateVaultDoc.public_fingerprint,
      keyVersion: privateVaultDoc.key_version || 1,
    };
  } catch (err) {
    throw new Error("Invalid master passphrase. Decryption authentication tag mismatch.");
  }
}

/**
 * Recovers the Master Private Key using the 24-Word BIP-39 Emergency Recovery Phrase
 * and re-encrypts Container A with a newly supplied passphrase.
 *
 * @param {string} recoveryMnemonic - 24-word emergency recovery phrase
 * @param {object} privateVaultDoc - Firestore document system_security/master_private_vault
 * @param {string} newPassphrase - New administrator passphrase
 * @returns {Promise<{ privateKey: CryptoKey, updatedVaultDoc: object }>}
 */
export async function recoverMasterVaultWithSeed(recoveryMnemonic, privateVaultDoc, newPassphrase) {
  const cryptoObj = getCrypto();

  if (!privateVaultDoc || !privateVaultDoc.container_recovery) {
    throw new Error("Emergency recovery container is missing or corrupted.");
  }

  // Validate phrase
  await mnemonicToEntropy(recoveryMnemonic);

  const saltB = base64ToBuffer(privateVaultDoc.container_recovery.salt);
  const ivB = base64ToBuffer(privateVaultDoc.container_recovery.iv);
  const encryptedB = base64ToBuffer(privateVaultDoc.container_recovery.encrypted_private_key);

  const recoveryKey = await deriveKeyPbkdf2(recoveryMnemonic, saltB, "EMERGENCY_RECOVERY_SEED");

  let pkcs8Decrypted;
  try {
    pkcs8Decrypted = await cryptoObj.subtle.decrypt(
      { name: "AES-GCM", iv: ivB, tagLength: TAG_LENGTH_BITS },
      recoveryKey,
      encryptedB
    );
  } catch (err) {
    throw new Error("Invalid emergency recovery phrase. Checksum or word verification failed.");
  }

  // Re-encrypt Container A with newPassphrase using fresh salt and IV
  const newSaltA = new Uint8Array(SALT_LENGTH_BYTES);
  const newIvA = new Uint8Array(IV_LENGTH_BYTES);
  cryptoObj.getRandomValues(newSaltA);
  cryptoObj.getRandomValues(newIvA);

  const newVaultKey = await deriveKeyPbkdf2(newPassphrase, newSaltA, "MASTER_VAULT_PASSPHRASE");
  const newEncryptedA = await cryptoObj.subtle.encrypt(
    { name: "AES-GCM", iv: newIvA, tagLength: TAG_LENGTH_BITS },
    newVaultKey,
    pkcs8Decrypted
  );

  // Import into RAM
  const privateKey = await cryptoObj.subtle.importKey(
    "pkcs8",
    pkcs8Decrypted,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["decrypt"]
  );

  new Uint8Array(pkcs8Decrypted).fill(0);

  const updatedVaultDoc = {
    ...privateVaultDoc,
    recovered_at: Date.now(),
    container_passphrase: {
      salt: bufferToBase64(newSaltA),
      iv: bufferToBase64(newIvA),
      encrypted_private_key: bufferToBase64(newEncryptedA),
    },
  };

  return {
    privateKey,
    updatedVaultDoc,
  };
}
