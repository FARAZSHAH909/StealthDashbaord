"use client";

import { useState, useEffect, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import { database, auth } from "@/lib/firebase/client";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { decryptVaultField } from "@/lib/encryption/vaultDecryptor";

function parseSmsSnapshot(val, selectedDeviceId) {
  const items = [];
  if (!val || typeof val !== "object") return items;

  const seenIds = new Set();

  function addSms(smsKey, smsVal, devId) {
    if (!smsVal || typeof smsVal !== "object") return;
    const smsId = smsVal.sms_id || smsKey;
    const uniqueKey = `${smsVal.device_id || devId}:::${smsId}`;
    if (seenIds.has(uniqueKey)) return;
    seenIds.add(uniqueKey);

    items.push({
      key: smsKey,
      id: smsId,
      deviceId: smsVal.device_id || devId,
      address: smsVal.address || "",
      body: smsVal.body || "",
      iv: smsVal.iv || "",
      authTag: smsVal.auth_tag || "",
      type: Number(smsVal.type) || 1, // 1 = Inbox, 2 = Sent
      timestamp: Number(smsVal.timestamp) || 0,
      isDeleted: Boolean(smsVal.is_deleted),
      deletedAt: Number(smsVal.deleted_at) || 0,
      syncStatus: Boolean(smsVal.sync_status),
    });
  }

  if (selectedDeviceId) {
    for (const [smsKey, smsVal] of Object.entries(val)) {
      addSms(smsKey, smsVal, selectedDeviceId);
    }
  } else {
    for (const [devKey, devVal] of Object.entries(val)) {
      if (devVal && typeof devVal === "object") {
        for (const [smsKey, smsVal] of Object.entries(devVal)) {
          addSms(smsKey, smsVal, devKey);
        }
      }
    }
  }

  // Sort descending (newest first)
  items.sort((a, b) => b.timestamp - a.timestamp);
  return items;
}

export function useSmsVault(selectedDeviceId = null) {
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
      ? `sms_vault/${selectedDeviceId}`
      : "sms_vault";

    const fetchImmediateRest = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const authParam = token ? `?auth=${token}` : "";
        const url = `https://stealthapp-50da2-default-rtdb.firebaseio.com/${dbPath}.json${authParam}`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data && typeof data === "object" && !data.error) {
          const parsed = parseSmsSnapshot(data, selectedDeviceId);
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
          const parsed = parseSmsSnapshot(val, selectedDeviceId);
          setRawItems(parsed);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError("Failed to parse SMS vault records: " + err.message);
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
          const decryptedAddress = await decryptVaultField(item.address, item.iv, cryptoKey);
          const decryptedBody = await decryptVaultField(item.body, item.iv, cryptoKey);

          const isAddrDecrypted = decryptedAddress !== item.address || !/^[A-Za-z0-9+/=]{20,}$/.test(item.address);
          const isBodyDecrypted = decryptedBody !== item.body || !/^[A-Za-z0-9+/=]{20,}$/.test(item.body);

          return {
            ...item,
            decryptedAddress: decryptedAddress || "Unknown",
            decryptedBody: decryptedBody || "(Empty Message)",
            isDecrypted: isUnlocked && (isAddrDecrypted || isBodyDecrypted),
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
    let inbox = 0;
    let sent = 0;
    const deviceSet = new Set();

    for (const item of decryptedItems) {
      if (item.deviceId) deviceSet.add(item.deviceId);
      if (item.isDeleted) {
        deleted++;
      } else {
        active++;
      }
      if (item.type === 2) {
        sent++;
      } else {
        inbox++;
      }
    }

    return {
      total,
      active,
      deleted,
      inbox,
      sent,
      devices: Array.from(deviceSet),
    };
  }, [decryptedItems]);

  return {
    smsList: decryptedItems,
    stats,
    loading,
    error,
  };
}
