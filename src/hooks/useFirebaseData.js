"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { ref, onValue, off, query, limitToLast, orderByChild } from "firebase/database";
import { database, auth } from "@/lib/firebase/client";
import { organizeConversations } from "@/lib/utils/conversationGrouper";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";

function parseRtdbSnapshot(val, selectedDeviceId) {
  const items = [];
  if (!val || typeof val !== "object") return items;

  if (selectedDeviceId) {
    for (const [msgKey, msgVal] of Object.entries(val)) {
      if (msgVal && typeof msgVal === "object") {
        items.push({ key: msgKey, val: { ...msgVal, device_id: msgVal.device_id || selectedDeviceId } });
      }
    }
  } else {
    for (const [devKey, devVal] of Object.entries(val)) {
      if (devVal && typeof devVal === "object") {
        for (const [msgKey, msgVal] of Object.entries(devVal)) {
          if (msgVal && typeof msgVal === "object") {
            items.push({ key: msgKey, val: { ...msgVal, device_id: msgVal.device_id || devKey } });
          }
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

  // 1. Listen to Firebase Realtime Database
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const dbPath = selectedDeviceId
      ? `notifications_log/${selectedDeviceId}`
      : "notifications_log";

    // Immediate REST synchronization for instant loading
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
        // Non-blocking initial REST fetch
      }
    };

    fetchImmediateRest();

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

