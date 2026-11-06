/**
 * CRYPTOGRAPHIC SIGNATURE & TRANSCODING UTILITIES
 *
 * Implements:
 * - Bidirectional ASN.1 DER <-> IEEE P1363 Signature Transcoder
 * - EC P-256 (secp256r1) Digital Signature Verification
 * - Hardware Keystore format normalization across Android OEMs and Web Crypto API
 */

function bufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts an ASN.1 DER-encoded ECDSA signature (from Android KeyStore)
 * to a 64-byte IEEE P1363 format (r || s, 32 bytes each) expected by Web Crypto API.
 */
export function derToP1363(derBytes) {
  const bytes = derBytes instanceof Uint8Array ? derBytes : new Uint8Array(derBytes);
  let offset = 0;
  if (bytes[offset++] !== 0x30) throw new Error("Expected ASN.1 SEQUENCE header 0x30");
  let seqLen = bytes[offset++];
  if ((seqLen & 0x80) !== 0) {
    const lenBytes = seqLen & 0x7f;
    seqLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      seqLen = (seqLen << 8) | bytes[offset++];
    }
  }

  if (bytes[offset++] !== 0x02) throw new Error("Expected ASN.1 INTEGER for r");
  let rLen = bytes[offset++];
  let rStart = offset;
  offset += rLen;

  if (bytes[offset++] !== 0x02) throw new Error("Expected ASN.1 INTEGER for s");
  let sLen = bytes[offset++];
  let sStart = offset;

  // Trim leading zero padding if length > 32
  while (rLen > 32 && bytes[rStart] === 0) {
    rStart++;
    rLen--;
  }
  while (sLen > 32 && bytes[sStart] === 0) {
    sStart++;
    sLen--;
  }

  if (rLen > 32 || sLen > 32) {
    throw new Error("ECDSA integer exceeds 32 bytes for P-256 curve");
  }

  const p1363 = new Uint8Array(64);
  p1363.set(bytes.subarray(rStart, rStart + rLen), 32 - rLen);
  p1363.set(bytes.subarray(sStart, sStart + sLen), 64 - sLen);
  return p1363;
}

/**
 * Converts a 64-byte IEEE P1363 ECDSA signature (r || s) to ASN.1 DER format.
 */
export function p1363ToDer(p1363Bytes) {
  const bytes = p1363Bytes instanceof Uint8Array ? p1363Bytes : new Uint8Array(p1363Bytes);
  if (bytes.length !== 64) {
    throw new Error(`Expected 64-byte P1363 signature, received ${bytes.length} bytes`);
  }
  let r = bytes.subarray(0, 32);
  let s = bytes.subarray(32, 64);

  let rStart = 0;
  while (rStart < 31 && r[rStart] === 0) rStart++;
  r = r.subarray(rStart);
  const rPad = (r[0] & 0x80) !== 0 ? [0x00] : [];

  let sStart = 0;
  while (sStart < 31 && s[sStart] === 0) sStart++;
  s = s.subarray(sStart);
  const sPad = (s[0] & 0x80) !== 0 ? [0x00] : [];

  const rTotalLen = rPad.length + r.length;
  const sTotalLen = sPad.length + s.length;
  const seqBodyLen = 2 + rTotalLen + 2 + sTotalLen;

  const der = [0x30];
  if (seqBodyLen >= 128) {
    der.push(0x81, seqBodyLen);
  } else {
    der.push(seqBodyLen);
  }
  der.push(0x02, rTotalLen, ...rPad, ...r);
  der.push(0x02, sTotalLen, ...sPad, ...s);
  return new Uint8Array(der);
}

/**
 * Normalizes signature to IEEE P1363 (64 bytes) regardless of whether
 * it arrived in ASN.1 DER or IEEE P1363 format.
 */
export function normalizeEcdsaSignature(sigBytes) {
  const bytes = sigBytes instanceof Uint8Array ? sigBytes : new Uint8Array(sigBytes);
  if (bytes.length === 64) {
    return bytes;
  }
  if (bytes[0] === 0x30) {
    return derToP1363(bytes);
  }
  throw new Error(`Unsupported signature format or invalid length: ${bytes.length} bytes`);
}

/**
 * Verifies an EC P-256 digital signature over given data using Web Crypto API.
 * Supports both DER and P1363 signatures.
 *
 * @param {string} spkiBase64 - Device public signing key in SPKI format (Base64)
 * @param {Uint8Array|ArrayBuffer|string} data - Plain text string or binary data buffer
 * @param {string|Uint8Array} signature - Digital signature (Base64 string or Uint8Array)
 * @returns {Promise<boolean>}
 */
export async function verifyP256Signature(spkiBase64, data, signature) {
  const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error("Web Crypto API is not available");
  }

  const spkiBytes = typeof spkiBase64 === "string" ? base64ToBuffer(spkiBase64) : spkiBase64;
  const rawSigBytes = typeof signature === "string" ? base64ToBuffer(signature) : signature;
  const p1363Sig = normalizeEcdsaSignature(rawSigBytes);

  const dataBytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : data instanceof Uint8Array
      ? data
      : new Uint8Array(data);

  const pubKey = await cryptoObj.subtle.importKey(
    "spki",
    spkiBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );

  return await cryptoObj.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    pubKey,
    p1363Sig,
    dataBytes
  );
}

export { bufferToBase64, base64ToBuffer };

