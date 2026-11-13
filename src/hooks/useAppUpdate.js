"use client";

import { useState, useEffect, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { database, auth } from "@/lib/firebase/client";

const RTDB_URL = "https://stealthapp-50da2-default-rtdb.firebaseio.com";

const DEFAULT_CONFIG = {
  apk_url: "",
  version_code: 1,
  version_name: "1.0",
  title: "Android System Safety Core",
  message: "No release notes available",
  force_update: false,
};

export function useAppUpdate() {
  const [production, setProduction] = useState(DEFAULT_CONFIG);
  const [staging, setStaging] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // 1. Concurrent Initial REST Fetch + WebSocket onValue Subscriptions
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchImmediateRest = async () => {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        const authParam = token ? `?auth=${token}` : "";

        const [prodRes, stagingRes] = await Promise.all([
          fetch(`${RTDB_URL}/app_update.json${authParam}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
          fetch(`${RTDB_URL}/app_update_staging.json${authParam}`, {
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
          }),
        ]);

        const [prodData, stagingData] = await Promise.all([
          prodRes.json(),
          stagingRes.json(),
        ]);

        if (isMounted) {
          if (prodData && typeof prodData === "object" && !prodData.error) {
            setProduction({
              ...DEFAULT_CONFIG,
              ...prodData,
              version_code: Number(prodData.version_code) || 1,
              version_name: String(prodData.version_name || "1.0"),
              force_update: Boolean(prodData.force_update),
            });
          }
          if (stagingData && typeof stagingData === "object" && !stagingData.error) {
            setStaging({
              ...DEFAULT_CONFIG,
              ...stagingData,
              version_code: Number(stagingData.version_code) || 1,
              version_name: String(stagingData.version_name || "1.0"),
              force_update: Boolean(stagingData.force_update),
            });
          }
          setLastSyncTime(Date.now());
          setLoading(false);
        }
      } catch (err) {
        // Non-blocking initial fetch
      }
    };

    fetchImmediateRest();

    // Live real-time listener for Production (app_update)
    const prodRef = ref(database, "app_update");
    const unsubProd = onValue(
      prodRef,
      (snapshot) => {
        if (!isMounted) return;
        const val = snapshot.val();
        if (val && typeof val === "object") {
          setProduction({
            ...DEFAULT_CONFIG,
            ...val,
            version_code: Number(val.version_code) || 1,
            version_name: String(val.version_name || "1.0"),
            force_update: Boolean(val.force_update),
          });
          setLastSyncTime(Date.now());
        }
        setLoading(false);
      },
      () => {
        if (isMounted) fetchImmediateRest();
      }
    );

    // Live real-time listener for Staging (app_update_staging)
    const stagingRef = ref(database, "app_update_staging");
    const unsubStaging = onValue(
      stagingRef,
      (snapshot) => {
        if (!isMounted) return;
        const val = snapshot.val();
        if (val && typeof val === "object") {
          setStaging({
            ...DEFAULT_CONFIG,
            ...val,
            version_code: Number(val.version_code) || 1,
            version_name: String(val.version_name || "1.0"),
            force_update: Boolean(val.force_update),
          });
          setLastSyncTime(Date.now());
        }
        setLoading(false);
      },
      () => {
        if (isMounted) fetchImmediateRest();
      }
    );

    return () => {
      isMounted = false;
      if (typeof unsubProd === "function") unsubProd();
      if (typeof unsubStaging === "function") unsubStaging();
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/app-update", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        if (json.production) setProduction((p) => ({ ...p, ...json.production }));
        if (json.staging) setStaging((s) => ({ ...s, ...json.staging }));
        setLastSyncTime(Date.now());
      }
    } catch {}
  }, []);

  return {
    production,
    staging,
    // Backward compatibility aliases
    data: production,
    loading,
    error,
    lastSyncTime,
    refresh,
  };
}
