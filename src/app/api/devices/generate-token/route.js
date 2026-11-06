import { NextResponse } from "next/server";
import crypto from "crypto";
import { setDocument } from "@/lib/firebase/firestoreService";

export async function POST(request) {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body is optional
    }

    const { target_device_id, ttl_hours = 24 } = body;

    const token = crypto.randomBytes(24).toString("hex");
    const now = Date.now();
    const expiresAt = now + Math.max(1, Number(ttl_hours) || 24) * 3600 * 1000;

    await setDocument("device_enrollment_tokens", token, {
      token,
      created_at: now,
      expires_at: expiresAt,
      used: false,
      target_device_id: target_device_id || null,
      created_by: "system_admin"
    });

    return NextResponse.json({
      success: true,
      enrollment_token: token,
      target_device_id: target_device_id || null,
      expires_at: expiresAt
    });
  } catch (error) {
    console.error("Generate enrollment token error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
