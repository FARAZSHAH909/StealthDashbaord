import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminAuth } from "@/lib/firebase/admin";
import { getDocument, updateDocument } from "@/lib/firebase/firestoreService";
import { verifyP256Signature } from "@/lib/encryption/signatureUtils";

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes

// Module-level secure private secret for fallback device token HMAC signing (never client-exposed)
const FALLBACK_HMAC_SECRET = process.env.DEVICE_TOKEN_SECRET || process.env.COOKIE_ENCRYPTION_KEY || process.env.ADMIN_INVITE_SECRET || crypto.randomBytes(32).toString("hex");

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { device_id, timestamp, signature } = body;

    if (!device_id || typeof device_id !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'device_id'" }, { status: 400 });
    }

    if (!timestamp || typeof timestamp !== "number") {
      return NextResponse.json({ error: "Missing or invalid 'timestamp'" }, { status: 400 });
    }

    if (!signature || typeof signature !== "string") {
      return NextResponse.json({ error: "Missing or invalid 'signature'" }, { status: 400 });
    }

    // 1. Clock Skew Check (Replay Prevention for Auth Challenges)
    const now = Date.now();
    if (Math.abs(now - timestamp) > MAX_CLOCK_SKEW_MS) {
      return NextResponse.json(
        { error: "Authentication challenge expired or excessive clock skew" },
        { status: 401 }
      );
    }

    // 2. Fetch Device Record from Firestore
    const deviceData = await getDocument("devices_management", device_id);

    if (!deviceData) {
      return NextResponse.json({ error: "Device is not registered" }, { status: 403 });
    }

    if (deviceData.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Device is not active (current status: ${deviceData.status})` },
        { status: 403 }
      );
    }

    const publicSigningKeySpki = deviceData.device_public_signing_key_spki;
    if (!publicSigningKeySpki) {
      return NextResponse.json({ error: "Device record is missing public signing key" }, { status: 500 });
    }

    // 3. Cryptographic Signature Verification over Challenge
    const challenge = `AUTH_CHALLENGE:${device_id}:${timestamp}`;
    const isValidSignature = await verifyP256Signature(publicSigningKeySpki, challenge, signature);

    if (!isValidSignature) {
      return NextResponse.json({ error: "Invalid cryptographic challenge signature" }, { status: 401 });
    }

    // 4. Mint Custom Token with uid = device_id
    let customToken;
    if (adminAuth && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        customToken = await adminAuth.createCustomToken(device_id, {
          role: "device",
          device_id
        });
      } catch (authErr) {
        console.warn("Firebase Admin createCustomToken failed, generating signed device token:", authErr.message);
      }
    }

    if (!customToken) {
      // Deterministic signed fallback token using server-side private secret
      const tokenPayload = JSON.stringify({ uid: device_id, role: "device", exp: now + 3600000 });
      const hmac = crypto.createHmac("sha256", FALLBACK_HMAC_SECRET)
        .update(tokenPayload)
        .digest("base64url");
      customToken = `dev_tok_${Buffer.from(tokenPayload).toString("base64url")}.${hmac}`;
    }

    // Best-effort update of last_seen
    updateDocument("devices_management", device_id, { last_seen: now }).catch(() => {});

    return NextResponse.json({
      success: true,
      custom_token: customToken,
      device_id,
      expires_in: 3600
    });
  } catch (error) {
    console.error("Device auth token minting error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
