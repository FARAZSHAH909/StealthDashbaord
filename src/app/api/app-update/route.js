import { NextResponse } from "next/server";
import { secureApiHandler } from "@/lib/api/secureApiHandler";

const RTDB_URL = process.env.FIREBASE_DATABASE_URL || "https://stealthapp-50da2-default-rtdb.firebaseio.com";

/**
 * GET: Fetch both Production (app_update) and Staging (app_update_staging) configurations in real-time.
 * Cryptographically Protected: Requires verified administrative authentication.
 */
export const GET = secureApiHandler({
  allowedMethods: ["GET"],
  requiredRole: "admin",
  handler: async () => {
    const [prodRes, stagingRes] = await Promise.all([
      fetch(`${RTDB_URL}/app_update.json`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      }),
      fetch(`${RTDB_URL}/app_update_staging.json`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      }),
    ]);

    const [prodData, stagingData] = await Promise.all([
      prodRes.json(),
      stagingRes.json(),
    ]);

    return NextResponse.json({
      success: true,
      production: prodData || {},
      staging: stagingData || {},
    });
  },
});

/**
 * Mutating methods rejected - Strict Read-Only Mode enforced per security policy
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Read-only mode active. App release records cannot be modified from the dashboard.",
    },
    { status: 403 }
  );
}

export async function PUT() {
  return POST();
}

export async function PATCH() {
  return POST();
}
