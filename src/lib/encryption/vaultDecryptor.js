/**
 * VAULT PAYLOAD DECRYPTION ENGINE (SMS & CONTACTS)
 *
 * Implements:
 * - W3C WebCrypto AES-256-GCM browser-side transient decryption
 * - Support for self-contained packed format ([12-byte IV] + [Ciphertext + 16-byte Tag])
 * - Support for separate IV / Auth Tag envelope payloads
 * - Graceful fallback to plaintext when already human-readable
 * - Zero persistence guarantee: Decrypted records reside strictly in ephemeral memory
 */

import { base64ToUint8Array } from "./webCrypto.js";

export async function decryptVaultField(rawText, ivBase64 = null, cryptoKey = null) {
  if (!rawText) return "";
  const trimmed = String(rawText).trim();
  if (!trimmed) return "";

  // 1. If key is missing, return raw ciphertext (or pseudonymous label)
  if (!cryptoKey) {
    return trimmed;
  }

  // 2. Strategy 1: Check if already plaintext (e.g., standard phone number, email, or clear text)
  if (/^(\+?[\d\s-()]{7,25}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})$/.test(trimmed)) {
    return trimmed;
  }

  const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj?.subtle) {
    return trimmed;
  }

  // 3. Strategy 2: Self-contained packed format: [12-byte IV] + [Ciphertext + 16-byte Tag]
  try {
    const bytes = base64ToUint8Array(trimmed);
    if (bytes.length >= 28) {
      const iv = bytes.slice(0, 12);
      const payload = bytes.slice(12);
      const decryptedBuffer = await cryptoObj.subtle.decrypt(
        { name: "AES-GCM", iv, tagLength: 128 },
        cryptoKey,
        payload
      );
      const plaintext = new TextDecoder("utf-8").decode(decryptedBuffer);
      if (plaintext && plaintext.trim()) {
        return plaintext.trim();
      }
    }
  } catch (err) {
    // Continue to next strategy
  }

  // 4. Strategy 3: Decrypt with separately provided IV
  if (ivBase64) {
    try {
      const iv = base64ToUint8Array(ivBase64);
      const cipherBytes = base64ToUint8Array(trimmed);
      if (iv.length === 12 && cipherBytes.length >= 16) {
        const decryptedBuffer = await cryptoObj.subtle.decrypt(
          { name: "AES-GCM", iv, tagLength: 128 },
          cryptoKey,
          cipherBytes
        );
        const plaintext = new TextDecoder("utf-8").decode(decryptedBuffer);
        if (plaintext && plaintext.trim()) {
          return plaintext.trim();
        }
      }
    } catch (err) {
      // Continue
    }
  }

  // 5. Plaintext fallback if clearly readable
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed) || trimmed.length < 16) {
    return trimmed;
  }

  return trimmed;
}
