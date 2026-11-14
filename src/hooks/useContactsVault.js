"use client";

import { useState, useEffect, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { database, auth } from "@/lib/firebase/client";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { decryptVaultField } from "@/lib/encryption/vaultDecryptor";

function parseContactsSnapshot(val, selectedDeviceId) {
  const items = [];
  if (!val || typeof val !== "object") return items;

  const seenIds = new Set();

  function addContact(contactKey, contactVal, devId) {
    if (!contactVal || typeof contactVal !== "object") return;
    const contactId = contactVal.contact_id || contactKey;
    const uniqueKey = `${contactVal.device_id || devId}:::${contactId}`;
    if (seenIds.has(uniqueKey)) return;
    seenIds.add(uniqueKey);

    items.push({
      key: contactKey,
      id: contactId,
      deviceId: contactVal.device_id || devId,
      name: contactVal.name || "",
      phoneNumber: contactVal.phone_number || "",
      iv: contactVal.iv || "",
      authTag: contactVal.auth_tag || "",
      timestamp: Number(contactVal.timestamp) || 0,
      isDeleted: Boolean(contactVal.is_deleted),
      deletedAt: Number(contactVal.deleted_at) || 0,
      syncStatus: Boolean(contactVal.sync_status),
    });
  }

  if (selectedDeviceId) {
    for (const [contactKey, contactVal] of Object.entries(val)) {
      addContact(contactKey, contactVal, selectedDeviceId);
    }
  } else {
    for (const [devKey, devVal] of Object.entries(val)) {
      if (devVal && typeof devVal === "object") {
        for (const [contactKey, contactVal] of Object.entries(devVal)) {
          addContact(contactKey, contactVal, devKey);
        }
      }
    }
  }

  // Sort descending by timestamp or name
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}

export function useContactsVault(selectedDeviceId = null) {
  const [rawItems, setRawItems] = useState([]);
  const [decryptedItems, setDecryptedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { cryptoKey, isUnlocked } = useKeyVault();

  // 1. Fetch from Firebase RTDB with WebSocket + REST Polling
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const dbPath = selectedDeviceId
      ? `contacts_vault/${selectedDeviceId}`
      : "contacts_vault";

    const fetchImmediateRest = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const authParam = token ? `?auth=${token}` : "";
        const url = `https://stealthapp-50da2-default-rtdb.firebaseio.com/${dbPath}.json${authParam}`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data && typeof data === "object" && !data.error) {
          const parsed = parseContactsSnapshot(data, selectedDeviceId);
          setRawItems(parsed);
          setLoading(false);
        }
      } catch (err) {
        // Non-blocking
      }
    };

    fetchImmediateRest();

    const pollInterval = setInterval(() => {
      if (isMounted) fetchImmediateRest();
    }, 4000);

    const dbRef = ref(database, dbPath);
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (!isMounted) return;
        try {
          const val = snapshot.val();
          const parsed = parseContactsSnapshot(val, selectedDeviceId);
          setRawItems(parsed);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError("Failed to parse Contacts vault records: " + err.message);
          setLoading(false);
        }
      },
      (err) => {
        if (!isMounted) return;
        setError("Firebase connection error: " + err.message);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [selectedDeviceId]);

  // 2. Browser-Side Decryption Engine
  useEffect(() => {
    let isCancelled = false;

    async function decryptAll() {
      if (!rawItems.length) {
        setDecryptedItems([]);
        return;
      }

      const results = await Promise.all(
        rawItems.map(async (item) => {
          const decryptedName = await decryptVaultField(item.name, item.iv, cryptoKey);
          const decryptedPhone = await decryptVaultField(item.phoneNumber, item.iv, cryptoKey);

          const isNameDecrypted = decryptedName !== item.name || !/^[A-Za-z0-9+/=]{20,}$/.test(item.name);
          const isPhoneDecrypted = decryptedPhone !== item.phoneNumber || !/^[A-Za-z0-9+/=]{20,}$/.test(item.phoneNumber);

          return {
            ...item,
            decryptedName: decryptedName || "Unnamed Contact",
            decryptedPhoneNumber: decryptedPhone || "No Phone",
            isDecrypted: isUnlocked && (isNameDecrypted || isPhoneDecrypted),
          };
        })
      );

      if (!isCancelled) {
        setDecryptedItems(results);
      }
    }

    decryptAll();

    return () => {
      isCancelled = true;
    };
  }, [rawItems, cryptoKey, isUnlocked]);

  // 3. Computed Metrics
  const stats = useMemo(() => {
    let total = decryptedItems.length;
    let active = 0;
    let deleted = 0;
    const deviceSet = new Set();

    for (const item of decryptedItems) {
      if (item.deviceId) deviceSet.add(item.deviceId);
      if (item.isDeleted) {
        deleted++;
      } else {
        active++;
      }
    }

    return {
      total,
      active,
      deleted,
      devices: Array.from(deviceSet),
    };
  }, [decryptedItems]);

  return {
    contactsList: decryptedItems,
    stats,
    loading,
    error,
  };
}
