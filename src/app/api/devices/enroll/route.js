import { NextResponse } from "next/server";
import { getDocument, setDocument, updateDocument } from "@/lib/firebase/firestoreService";

// Strict field allowlist - any unexpected fields cause immediate 400 rejection
const ALLOWED_FIELDS = new Set([
  "device_id",
  "wrapped_device_key",
  "device_public_signing_key_spki",
  "key_version",
  "model",
  "os_version",
  "enrollment_token"
]);

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    // 1. Strict Allowlist Validation
    const keys = Object.keys(body);
    for (const key of keys) {
      if (!ALLOWED_FIELDS.has(key)) {
        return NextResponse.json(
          { error: `Unauthorized field in enrollment payload: '${key}'` },
          { status: 400 }
        );
      }
    }

    const {
      device_id,
      wrapped_device_key,
      device_public_signing_key_spki,
      key_version = 1,
      model = "Unknown Android Device",
      os_version = "Unknown OS",
      enrollment_token
    } = body;

    // 2. Validate Required Fields & Data Formats
    if (!device_id || typeof device_id !== "string" || !/^[a-zA-Z0-9_-]{4,128}$/.test(device_id)) {
      return NextResponse.json(
        { error: "Invalid or missing 'device_id'. Must be 4-128 alphanumeric/hyphen/underscore characters." },
        { status: 400 }
      );
    }

    if (!wrapped_device_key || typeof wrapped_device_key !== "string") {
      return NextResponse.json(
        { error: "Missing 'wrapped_device_key' field." },
        { status: 400 }
      );
    }

    // Validate RSA-3072 ciphertext length (384 bytes = 512 base64 characters)
    const rawWrappedKey = Buffer.from(wrapped_device_key, "base64");
    if (rawWrappedKey.length !== 384) {
      return NextResponse.json(
        { error: `Invalid wrapped_device_key length (${rawWrappedKey.length} bytes). Expected 384 bytes for RSA-3072.` },
        { status: 400 }
      );
    }

    if (!device_public_signing_key_spki || typeof device_public_signing_key_spki !== "string") {
      return NextResponse.json(
        { error: "Missing 'device_public_signing_key_spki' field." },
        { status: 400 }
      );
    }

    const rawSpki = Buffer.from(device_public_signing_key_spki, "base64");
    if (rawSpki.length < 64 || rawSpki.length > 256) {
      return NextResponse.json(
        { error: `Invalid device_public_signing_key_spki length (${rawSpki.length} bytes). Expected EC P-256 SPKI.` },
        { status: 400 }
      );
    }

    if (!enrollment_token || typeof enrollment_token !== "string" || enrollment_token.length < 8) {
      return NextResponse.json(
        { error: "Invalid or missing 'enrollment_token'." },
        { status: 400 }
      );
    }

    // 3. Validate Token
    const tokenData = await getDocument("device_enrollment_tokens", enrollment_token);
    if (!tokenData) {
      return NextResponse.json({ error: "Enrollment token not found" }, { status: 403 });
    }

    if (tokenData.used) {
      return NextResponse.json({ error: "Enrollment token has already been used" }, { status: 403 });
    }

    if (tokenData.expires_at && tokenData.expires_at < Date.now()) {
      return NextResponse.json({ error: "Enrollment token has expired" }, { status: 403 });
    }

    if (tokenData.target_device_id && tokenData.target_device_id !== device_id) {
      return NextResponse.json({ error: "Enrollment token was issued for a different device" }, { status: 403 });
    }

    // 4. Check If Device Already Enrolled & Active
    const existingDevice = await getDocument("devices_management", device_id);
    if (existingDevice && existingDevice.status === "ACTIVE") {
      return NextResponse.json({ error: "Device is already enrolled and active" }, { status: 409 });
    }

    // 5. Consume Token
    await updateDocument("device_enrollment_tokens", enrollment_token, {
      used: true,
      used_at: Date.now(),
      used_by: device_id
    });

    // 6. Provision Device Document
    const now = Date.now();
    await setDocument("devices_management", device_id, {
      device_id,
      wrapped_device_key,
      device_public_signing_key_spki,
      key_version: Number(key_version) || 1,
      model: String(model).substring(0, 100),
      os_version: String(os_version).substring(0, 100),
      status: "ACTIVE",
      enrolled_at: now,
      last_seen: now
    });

    // 7. Initialize Authoritative Replay Ledger
    await setDocument("devices_management", `${device_id}/replay_ledger/active`, {
      device_id,
      max_seen_seq: 0,
      accepted_mask: "0",
      last_received_at: now,
      updated_at: now
    });

    return NextResponse.json({
      success: true,
      message: "Device enrolled successfully",
      device_id,
      key_version: Number(key_version) || 1,
      status: "ACTIVE"
    });
  } catch (error) {
    console.error("Device enrollment error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
