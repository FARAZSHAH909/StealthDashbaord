import { NextResponse } from "next/server";

const RTDB_URL = process.env.FIREBASE_DATABASE_URL || "https://stealthapp-50da2-default-rtdb.firebaseio.com";

/**
 * GET: Fetch both Production (app_update) and Staging (app_update_staging) configurations in real-time
 */
export async function GET() {
  try {
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
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch app configurations: " + error.message },
      { status: 500 }
    );
  }
}

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
