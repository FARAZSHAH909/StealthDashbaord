import { NextResponse } from "next/server";
import { adminDatabase } from "@/lib/firebase/admin";
import { recordSecurityAudit } from "@/lib/monitoring/securityAuditLogger";

const RTDB_URL = process.env.FIREBASE_DATABASE_URL || "https://stealthapp-50da2-default-rtdb.firebaseio.com";

// Only invoke adminDatabase if explicit service credentials are configured to avoid 30s metadata discovery hang
const hasAdminCredentials = Boolean(
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY &&
  adminDatabase
);

/**
 * GET: Fetch current App Update configuration from Firebase RTDB
 */
export async function GET() {
  try {
    if (hasAdminCredentials) {
      try {
        const snap = await adminDatabase.ref("app_update").once("value");
        const val = snap.val();
        if (val) {
          return NextResponse.json({ success: true, data: val });
        }
      } catch (adminErr) {
        console.warn("[AppUpdateAPI] Admin fetch warning:", adminErr.message);
      }
    }

    // Direct high-speed REST fetch (< 100ms)
    const res = await fetch(`${RTDB_URL}/app_update.json`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    const data = await res.json();
    return NextResponse.json({ success: true, data: data || {} });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch app update config: " + error.message },
      { status: 500 }
    );
  }
}

/**
 * POST / PUT: Update App Update configuration in Firebase RTDB
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      apk_url,
      version_code,
      version_name,
      title,
      message,
      force_update,
    } = body;

    // Validate fields
    if (!apk_url || typeof apk_url !== "string" || !apk_url.trim()) {
      return NextResponse.json({ success: false, error: "Valid APK URL is required" }, { status: 400 });
    }

    const cleanPayload = {
      apk_url: apk_url.trim(),
      version_code: Number(version_code) || 1,
      version_name: String(version_name || "1.0").trim(),
      title: String(title || "System Security Update").trim(),
      message: String(message || "New update available.").trim(),
      force_update: Boolean(force_update),
      updated_at: Date.now(),
    };

    let saved = false;

    // 1. Try Firebase Admin SDK only if credentials exist
    if (hasAdminCredentials) {
      try {
        await adminDatabase.ref("app_update").update(cleanPayload);
        saved = true;
      } catch (adminErr) {
        console.warn("[AppUpdateAPI] Admin update warning:", adminErr.message);
      }
    }

    // 2. Direct high-speed REST update (< 100ms)
    if (!saved) {
      const res = await fetch(`${RTDB_URL}/app_update.json`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload),
      });
      if (!res.ok) {
        throw new Error(`Firebase REST returned status ${res.status}`);
      }
    }

    // Record audit log
    try {
      recordSecurityAudit({
        type: "APP_RELEASE_UPDATED",
        severity: "INFO",
        details: {
          version_name: cleanPayload.version_name,
          version_code: cleanPayload.version_code,
          force_update: cleanPayload.force_update,
          apk_url: cleanPayload.apk_url,
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      message: "App update configuration published to Firebase Realtime Database",
      data: cleanPayload,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update app release: " + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  return POST(request);
}
