import crypto from "crypto";
import { adminAuth } from "../firebase/admin.js";

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.COOKIE_ENCRYPTION_KEY ||
  process.env.ADMIN_INVITE_SECRET ||
  "stealth_enterprise_session_hmac_master_key_2026";

/**
 * Creates a cryptographically signed session token using HMAC-SHA256
 */
export function createSignedSessionToken({ uid, email, role, emailVerified = true }) {
  const payload = {
    uid: String(uid),
    email: String(email || ""),
    role: role || null,
    emailVerified: Boolean(emailVerified),
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `sess_${payloadB64}.${hmac}`;
}

/**
 * Verifies a signed session token. Returns the decoded payload if valid and not expired, or null if invalid or tampered with.
 */
export function verifySignedSessionToken(tokenString) {
  if (!tokenString || typeof tokenString !== "string" || !tokenString.startsWith("sess_")) {
    return null;
  }

  try {
    const raw = tokenString.slice(5); // Remove 'sess_'
    const dotIndex = raw.lastIndexOf(".");
    if (dotIndex === -1) return null;

    const payloadB64 = raw.slice(0, dotIndex);
    const signature = raw.slice(dotIndex + 1);

    const expectedHmac = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(payloadB64)
      .digest("base64url");

    // Timing-safe signature comparison
    if (
      signature.length !== expectedHmac.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHmac))
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (!payload.exp || payload.exp < Date.now()) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Strictly verifies a Firebase ID token cryptographically.
 * Never performs unverified base64 decoding.
 */
export async function verifyFirebaseIdTokenStrict(idToken) {
  if (!idToken || typeof idToken !== "string") {
    return null;
  }

  // 1. If Admin SDK has private keys, verify with Admin SDK
  if (adminAuth && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role || null,
        email_verified: decoded.email_verified ?? true,
        exp: decoded.exp,
      };
    } catch (adminErr) {
      console.warn("[verifyFirebaseIdTokenStrict] Admin SDK verification failed:", adminErr.message);
      return null;
    }
  }

  // 2. Cryptographic verification via Google Identity Toolkit REST API
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    console.error("[verifyFirebaseIdTokenStrict] Missing Firebase API Key for cryptographic verification");
    return null;
  }

  try {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    if (data && data.users && data.users.length > 0) {
      const u = data.users[0];
      let customRole = null;
      if (u.customAttributes) {
        try {
          const parsed = JSON.parse(u.customAttributes);
          customRole = parsed.role;
        } catch {}
      }

      return {
        uid: u.localId,
        email: u.email,
        role: customRole,
        email_verified: u.emailVerified ?? true,
      };
    }
  } catch (lookupErr) {
    console.error("[verifyFirebaseIdTokenStrict] Google Identity verification error:", lookupErr.message);
  }

  return null;
}
