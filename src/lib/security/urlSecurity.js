/**
 * ENTERPRISE NATIVE URL SECURITY & ANTI-TAMPERING ENGINE (W3C Web Crypto Compatible)
 * 
 * Provides defense-in-depth protections for web URLs:
 * 1. Path Traversal & Dot-Dot-Slash Dropping (Zero 3rd party tools)
 * 2. HTTP Parameter Pollution (HPP) Filter
 * 3. Polyglot / Injection / Null Byte URL Filter
 * 4. Open Redirect & Protocol Manipulation Defense
 * 5. HMAC-SHA256 Cryptographic URL Signing & Tamper Verification
 */

import { HARDENED_ROUTES } from "./routesConfig";

// Suspicious patterns in URL paths or query values
const PATH_TRAVERSAL_REGEX = /(\.\.[\/\\]|%2e%2e[\/\\]|%252e%252e[\/\\]|\.\.%2f|\.\.%5c)/i;
const NULL_BYTE_OR_CRLF_REGEX = /(%00|%0d|%0a|\x00|\r|\n)/i;
const DANGEROUS_PROTOCOL_REGEX = /^(https?:|ftp:|javascript:|data:|file:|vbscript:|\/\/)/i;
const DANGEROUS_PAYLOAD_REGEX = /(<script|onload=|onerror=|<img|<svg|exec\(|base64_decode|union\s+select)/i;

/**
 * Inspects URL pathname for traversal, null bytes, and malicious sequences.
 */
export function validateUrlPath(pathname) {
  if (!pathname || typeof pathname !== "string") {
    return { valid: false, reason: "EMPTY_PATH" };
  }

  // Traversal check
  if (PATH_TRAVERSAL_REGEX.test(pathname) || pathname.includes("/../") || pathname.includes("\\..\\")) {
    return { valid: false, reason: "PATH_TRAVERSAL_DETECTED" };
  }

  // Null byte or CRLF injection
  if (NULL_BYTE_OR_CRLF_REGEX.test(pathname)) {
    return { valid: false, reason: "ILLEGAL_CONTROL_CHAR_IN_PATH" };
  }

  // Polyglot injection in path
  if (DANGEROUS_PAYLOAD_REGEX.test(pathname)) {
    return { valid: false, reason: "DANGEROUS_PAYLOAD_IN_PATH" };
  }

  return { valid: true };
}

/**
 * Validates search parameters against HTTP Parameter Pollution (HPP) and injection.
 */
export function validateUrlParams(searchParams) {
  if (!searchParams) return { valid: true };

  const seenKeys = new Set();

  for (const [key, value] of searchParams.entries()) {
    // 1. HTTP Parameter Pollution Check (Duplicate query parameter keys)
    if (seenKeys.has(key)) {
      return { valid: false, reason: `HTTP_PARAMETER_POLLUTION_DETECTED: ${key}` };
    }
    seenKeys.add(key);

    // 2. Prototype Pollution Keys
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return { valid: false, reason: `PROTOTYPE_POLLUTION_KEY: ${key}` };
    }

    // 3. Null bytes or CRLF in query parameters
    if (NULL_BYTE_OR_CRLF_REGEX.test(key) || NULL_BYTE_OR_CRLF_REGEX.test(value)) {
      return { valid: false, reason: "NULL_BYTE_OR_CRLF_IN_PARAMS" };
    }

    // 4. Script injection in query parameter values
    if (DANGEROUS_PAYLOAD_REGEX.test(value)) {
      return { valid: false, reason: "DANGEROUS_PAYLOAD_IN_PARAMS" };
    }

    // 5. Length limit on individual query parameter values (prevent ReDoS or memory exhaustion)
    if (value.length > 2048) {
      return { valid: false, reason: "EXCESSIVE_PARAM_LENGTH" };
    }
  }

  return { valid: true };
}

/**
 * Validates that redirect destination URLs are strictly internal relative routes.
 * Blocks Open Redirect, external protocol redirection, and protocol-relative URLs.
 */
export function sanitizeRedirectUrl(rawUrl, fallback = HARDENED_ROUTES.OVERVIEW) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return fallback;
  }

  const trimmed = rawUrl.trim();

  // Reject protocol-relative URLs (e.g. "//evil.com")
  if (trimmed.startsWith("//")) {
    return fallback;
  }

  // Reject external protocols (e.g. "https://evil.com", "javascript:alert(1)")
  if (DANGEROUS_PROTOCOL_REGEX.test(trimmed)) {
    return fallback;
  }

  // Must begin with single forward slash
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Ensure no path traversal within redirect destination
  if (PATH_TRAVERSAL_REGEX.test(trimmed)) {
    return fallback;
  }

  return trimmed;
}

/**
 * Helper to compute HMAC-SHA256 hex string via W3C Web Crypto
 */
async function computeHmacSha256Hex(keyString, messageString) {
  const enc = new TextEncoder();
  const keyData = enc.encode(keyString);
  const msgData = enc.encode(messageString);

  const cryptoObj = typeof crypto !== "undefined" ? crypto : globalThis.crypto;
  const cryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: { name: "SHA-256" } },
    false,
    ["sign"]
  );

  const signature = await cryptoObj.subtle.sign("HMAC", cryptoKey, msgData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generates an HMAC-SHA256 cryptographically signed URL with expiration timestamp and unique nonce.
 */
export async function generateSignedUrl(pathname, secret, queryParams = {}) {
  const ts = Math.floor(Date.now() / 1000);
  const randomBytes = new Uint8Array(8);
  const cryptoObj = typeof crypto !== "undefined" ? crypto : globalThis.crypto;
  cryptoObj.getRandomValues(randomBytes);
  const nonce = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("");

  const params = new URLSearchParams(queryParams);
  params.set("ts", String(ts));
  params.set("nonce", nonce);

  const payloadToSign = `${pathname}?${params.toString()}`;
  const sig = await computeHmacSha256Hex(secret, payloadToSign);
  params.set("sig", sig);

  return `${pathname}?${params.toString()}`;
}

/**
 * Verifies that a signed URL has a valid HMAC-SHA256 signature, has not been tampered with,
 * and has not expired.
 */
export async function verifySignedUrl(pathname, searchParams, secret, maxAgeSeconds = 1800) {
  const sig = searchParams.get("sig");
  const ts = searchParams.get("ts");
  const nonce = searchParams.get("nonce");

  if (!sig || !ts || !nonce) {
    return { valid: false, reason: "MISSING_SIGNATURE_PARAMETERS" };
  }

  const now = Math.floor(Date.now() / 1000);
  const tokenTs = parseInt(ts, 10);
  if (isNaN(tokenTs) || Math.abs(now - tokenTs) > maxAgeSeconds) {
    return { valid: false, reason: "URL_SIGNATURE_EXPIRED" };
  }

  // Reconstruct parameter string without signature
  const clone = new URLSearchParams(searchParams);
  clone.delete("sig");
  const payloadToSign = `${pathname}?${clone.toString()}`;
  const expectedSig = await computeHmacSha256Hex(secret, payloadToSign);

  // Constant-time string comparison
  if (sig.length !== expectedSig.length) {
    return { valid: false, reason: "INVALID_SIGNATURE_LENGTH" };
  }

  let mismatch = 0;
  for (let i = 0; i < sig.length; i++) {
    mismatch |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }

  const isValid = mismatch === 0;
  return { valid: isValid, reason: isValid ? "OK" : "INVALID_SIGNATURE" };
}
