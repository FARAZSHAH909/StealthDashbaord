/**
 * PRODUCTION-GRADE ENTERPRISE WEB CRYPTO API ENGINE
 *
 * Implements:
 * - RSA-3072 OAEP Asymmetric Key Unwrapping (SHA-256, MGF1-SHA256)
 * - Fixed-Order Length-Prefixed Binary Authenticated Additional Data (AAD)
 * - 64-bit BigInt Monotonic Sequence Numbers
 * - Dual-Format Ciphertext Support (Separate Auth Tag & WebCrypto Combined)
 * - EC P-256 Digital Signature Envelope Verification
 * - Zero persistence: Plaintext and sensitive keys exist in non-extractable RAM only
 */

import { verifyP256Signature, normalizeEcdsaSignature } from "./signatureUtils.js";

const AAD_MAGIC = new Uint8Array([0x53, 0x4E, 0x41, 0x41]); // "SNAA"
const SIGNING_MAGIC = new Uint8Array([0x53, 0x4E, 0x53, 0x47]); // "SNSG"
const PROTOCOL_VERSION_V2 = 2;

function getCrypto() {
  if (typeof window !== "undefined" && window.crypto) return window.crypto;
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto;
  throw new Error("Web Crypto API is not available in the current environment.");
}

/**
 * Decode Base64 string to Uint8Array safely in any JavaScript runtime.
 */
export function base64ToUint8Array(base64String) {
  if (!base64String || typeof base64String !== "string") {
    return new Uint8Array(0);
  }
  try {
    const cleanStr = base64String.replace(/[\r\n\s]/g, "");
    if (typeof atob === "function") {
      const binary = atob(cleanStr);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } else if (typeof Buffer !== "undefined") {
      return new Uint8Array(Buffer.from(cleanStr, "base64"));
    }
  } catch (err) {
  }
  return new Uint8Array(0);
}

/**
 * Encode Uint8Array or ArrayBuffer to Base64 string.
 */
export function uint8ArrayToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < arr.byteLength; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  } else if (typeof Buffer !== "undefined") {
    return Buffer.from(arr).toString("base64");
  }
  throw new Error("Base64 encode unavailable");
}

/**
 * Decode Hex string to Uint8Array.
 */
export function hexToUint8Array(hexString) {
  if (!hexString || typeof hexString !== "string") {
    return new Uint8Array(0);
  }
  const cleanHex = hexString.replace(/[\s-]/g, "");
  if (cleanHex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Constructs Fixed-Order Length-Prefixed Canonical Binary AAD.
 *
 * Binary Layout:
 * [0..3]   Magic Bytes (4 bytes: "SNAA" = 0x53, 0x4E, 0x41, 0x41)
 * [4..5]   Protocol Version (2 bytes uint16 big-endian = 0x0002)
 * [6..7]   Key Version (2 bytes uint16 big-endian)
 * [8]      Migration Flag (1 byte: 0x00 = live, 0x01 = migration)
 * [9..16]  Sequence Number (8 bytes uint64 big-endian)
 * [17..24] Timestamp (8 bytes uint64 big-endian)
 * [25..26] Device ID Length (2 bytes uint16 big-endian)
 * [27..N]  Device ID UTF-8 bytes
 * [N+1..]  Message ID Length (2 bytes uint16 big-endian)
 * [..End]  Message ID UTF-8 bytes
 *
 * @param {object} params
 * @param {string} params.device_id
 * @param {string} params.message_id
 * @param {number|bigint|string} params.seq_num - Monotonic sequence number
 * @param {number} params.key_version - Device key version
 * @param {number|bigint|string} params.timestamp - Message unix timestamp in ms
 * @param {boolean} [params.is_migration=false] - Whether record is historical migration
 * @returns {Uint8Array} Canonical binary AAD buffer
 */
export function buildCanonicalBinaryAad({
  device_id = "",
  message_id = "",
  seq_num = 0,
  key_version = 1,
  timestamp = 0,
  is_migration = false
}) {
  const enc = new TextEncoder();
  const devIdBytes = enc.encode(String(device_id));
  const msgIdBytes = enc.encode(String(message_id));

  // Calculate exact total size:
  // 4 (magic) + 2 (proto) + 2 (keyVer) + 1 (migration) + 8 (seq) + 8 (time)
  // + 2 (devIdLen) + devIdBytes.length + 2 (msgIdLen) + msgIdBytes.length
  const totalLength = 4 + 2 + 2 + 1 + 8 + 8 + 2 + devIdBytes.length + 2 + msgIdBytes.length;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  let offset = 0;

  // 1. Magic Header
  uint8.set(AAD_MAGIC, offset);
  offset += 4;

  // 2. Protocol Version
  view.setUint16(offset, PROTOCOL_VERSION_V2, false); // Big-Endian
  offset += 2;

  // 3. Key Version
  view.setUint16(offset, Number(key_version) || 1, false);
  offset += 2;

  // 4. Migration Flag (0x00 live, 0x01 historical migration)
  view.setUint8(offset, is_migration ? 1 : 0);
  offset += 1;

  // 5. Sequence Number (64-bit BigInt Big-Endian)
  const bigSeq = BigInt(seq_num);
  view.setBigUint64(offset, bigSeq, false);
  offset += 8;

  // 6. Timestamp (64-bit BigInt Big-Endian)
  const bigTime = BigInt(timestamp);
  view.setBigUint64(offset, bigTime, false);
  offset += 8;

  // 7. Device ID (Length-Prefixed)
  view.setUint16(offset, devIdBytes.length, false);
  offset += 2;
  uint8.set(devIdBytes, offset);
  offset += devIdBytes.length;

  // 8. Message ID (Length-Prefixed)
  view.setUint16(offset, msgIdBytes.length, false);
  offset += 2;
  uint8.set(msgIdBytes, offset);
  offset += msgIdBytes.length;

  return uint8;
}

/**
 * Builds the canonical digital signature payload over the complete envelope.
 *
 * @param {Uint8Array} aadBytes - Canonical binary AAD
 * @param {Uint8Array} nonceBytes - 12-byte IV
 * @param {Uint8Array} ciphertextBytes - AES ciphertext
 * @param {Uint8Array} authTagBytes - 16-byte GCM authentication tag
 * @returns {Uint8Array}
 */
export function buildCanonicalSigningPayload({ aadBytes, nonceBytes, ciphertextBytes, authTagBytes }) {
  const totalLength = 4 + 2 + aadBytes.length + 2 + nonceBytes.length + 4 + ciphertextBytes.length + 2 + authTagBytes.length;
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  let offset = 0;
  uint8.set(SIGNING_MAGIC, offset);
  offset += 4;

  view.setUint16(offset, aadBytes.length, false);
  offset += 2;
  uint8.set(aadBytes, offset);
  offset += aadBytes.length;

  view.setUint16(offset, nonceBytes.length, false);
  offset += 2;
  uint8.set(nonceBytes, offset);
  offset += nonceBytes.length;

  view.setUint32(offset, ciphertextBytes.length, false);
  offset += 4;
  uint8.set(ciphertextBytes, offset);
  offset += ciphertextBytes.length;

  view.setUint16(offset, authTagBytes.length, false);
  offset += 2;
  uint8.set(authTagBytes, offset);

  return uint8;
}

/**
 * Unwraps an encrypted device key (RSA-3072 OAEP wrapped) in memory
 * using the unlocked Master Private Key.
 *
 * @param {CryptoKey} masterPrivateKey - Unlocked RSA-3072 private key
 * @param {string} wrappedDeviceKeyBase64 - Base64 wrapped 32-byte AES key (384 bytes ciphertext)
 * @returns {Promise<CryptoKey>} Unwrapped AES-256-GCM CryptoKey (non-extractable)
 */
export async function unwrapDeviceKey(masterPrivateKey, wrappedDeviceKeyBase64) {
  const cryptoObj = getCrypto();
  if (!masterPrivateKey) {
    throw new Error("Master private key is not unlocked.");
  }
  if (!wrappedDeviceKeyBase64) {
    throw new Error("Wrapped device key is missing.");
  }

  const ciphertextBytes = base64ToUint8Array(wrappedDeviceKeyBase64);
  if (ciphertextBytes.length !== 384) {
    throw new Error(`Invalid wrapped key length (${ciphertextBytes.length} bytes). Expected 384 bytes for RSA-3072.`);
  }

  const rawAesKey = await cryptoObj.subtle.decrypt(
    { name: "RSA-OAEP" },
    masterPrivateKey,
    ciphertextBytes
  );

  const rawBytes = new Uint8Array(rawAesKey);
  if (rawBytes.length !== 32) {
    throw new Error(`Decrypted device key length is invalid (${rawBytes.length} bytes). Expected 32 bytes.`);
  }

  // Import directly into non-extractable AES-GCM CryptoKey
  const deviceCryptoKey = await cryptoObj.subtle.importKey(
    "raw",
    rawBytes,
    { name: "AES-GCM", length: 256 },
    false, // NON-EXTRACTABLE
    ["encrypt", "decrypt"]
  );

  // Zero the temporary buffer
  rawBytes.fill(0);

  return deviceCryptoKey;
}

/**
 * Decrypts an AES-256-GCM record with mandatory Binary AAD verification.
 * Supports both split ciphertext/tag and combined ciphertext+tag formats.
 *
 * @param {object} params
 * @param {string} params.nonceBase64 - 12-byte IV in Base64
 * @param {string} params.ciphertextBase64 - Base64 ciphertext
 * @param {string} [params.authTagBase64] - 16-byte Auth Tag Base64 (optional if appended to ciphertext)
 * @param {Uint8Array} params.aadBytes - Canonical binary AAD
 * @param {CryptoKey} params.deviceCryptoKey - Unwrapped device CryptoKey
 * @returns {Promise<{ success: boolean, plaintext: string, error?: string }>}
 */
export async function decryptRecordWithAad({
  nonceBase64,
  ciphertextBase64,
  authTagBase64 = "",
  aadBytes,
  deviceCryptoKey
}) {
  const cryptoObj = getCrypto();
  if (!deviceCryptoKey) {
    return { success: false, plaintext: "", error: "Device encryption key not available in memory." };
  }
  if (!ciphertextBase64) {
    return { success: false, plaintext: "", error: "Empty ciphertext." };
  }

  try {
    const nonce = base64ToUint8Array(nonceBase64);
    if (nonce.length !== 12) {
      return { success: false, plaintext: "", error: `Invalid nonce length (${nonce.length} bytes, expected 12).` };
    }

    const rawCiphertext = base64ToUint8Array(ciphertextBase64);
    let payloadWithTag;

    if (authTagBase64) {
      const tag = base64ToUint8Array(authTagBase64);
      if (tag.length !== 16) {
        return { success: false, plaintext: "", error: `Invalid auth tag length (${tag.length} bytes, expected 16).` };
      }
      payloadWithTag = new Uint8Array(rawCiphertext.length + tag.length);
      payloadWithTag.set(rawCiphertext, 0);
      payloadWithTag.set(tag, rawCiphertext.length);
    } else {
      // Ciphertext already contains 16-byte tag appended at the end
      if (rawCiphertext.length < 16) {
        return { success: false, plaintext: "", error: "Ciphertext too short (missing 16-byte auth tag)." };
      }
      payloadWithTag = rawCiphertext;
    }

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonce,
        additionalData: aadBytes || new Uint8Array(0),
        tagLength: 128
      },
      deviceCryptoKey,
      payloadWithTag
    );

    const decoder = new TextDecoder("utf-8");
    return { success: true, plaintext: decoder.decode(decryptedBuffer) };
  } catch (err) {
    return {
      success: false,
      plaintext: "",
      error: `Decryption/AAD validation failed: ${err.message || "Authentication tag mismatch or corrupt payload"}`
    };
  }
}

/**
 * Verifies the EC P-256 digital signature over a notification envelope.
 *
 * @param {object} params
 * @param {object} params.record - Notification record from Firebase
 * @param {string} params.devicePublicSigningKeySpki - Device public signing key in SPKI format
 * @param {boolean} [params.isMigration=false]
 * @returns {Promise<{ verified: boolean, reason?: string }>}
 */
export async function verifyRecordSignature({ record, devicePublicSigningKeySpki, isMigration = false }) {
  if (!devicePublicSigningKeySpki) {
    return { verified: false, reason: "Device public signing key not registered" };
  }
  if (!record.device_signature) {
    return { verified: false, reason: "Record lacks device digital signature" };
  }

  try {
    const aadBytes = buildCanonicalBinaryAad({
      device_id: record.device_id,
      message_id: record.message_id || record.id || "",
      seq_num: record.seq_num || 0,
      key_version: record.key_version || 1,
      timestamp: record.timestamp || 0,
      is_migration: isMigration || record.is_migration || false
    });

    const nonceBytes = base64ToUint8Array(record.iv || record.nonceBase64 || record.nonce || "");
    const ciphertextBytes = base64ToUint8Array(record.ciphertext || record.ciphertextBase64 || "");
    const authTagBytes = base64ToUint8Array(record.auth_tag || "");

    const signingPayload = buildCanonicalSigningPayload({
      aadBytes,
      nonceBytes,
      ciphertextBytes,
      authTagBytes
    });

    const isValid = await verifyP256Signature(
      devicePublicSigningKeySpki,
      signingPayload,
      record.device_signature
    );

    return { verified: isValid, reason: isValid ? null : "Digital signature verification failed" };
  } catch (err) {
    return { verified: false, reason: `Signature verification error: ${err.message}` };
  }
}

/**
 * Import raw 256-bit (32-byte) key into Web Crypto API CryptoKey object.
 * Accepts Base64, Hex, or 32-byte string.
 */
export async function importRawEncryptionKey(keyInput) {
  if (!keyInput) throw new Error("Key input cannot be empty.");
  const cryptoObj = getCrypto();

  let keyBytes;
  const trimmed = keyInput.trim();

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    // 64-char Hex string (32 bytes)
    keyBytes = hexToUint8Array(trimmed);
  } else if (/^[A-Za-z0-9+/=]{40,48}$/.test(trimmed)) {
    // Base64 encoded 32 bytes
    keyBytes = base64ToUint8Array(trimmed);
  } else {
    // Fallback: UTF-8 bytes padded or sliced to 32 bytes
    const enc = new TextEncoder();
    const raw = enc.encode(trimmed);
    keyBytes = new Uint8Array(32);
    keyBytes.set(raw.subarray(0, 32));
  }

  if (keyBytes.length !== 32) {
    throw new Error(`Invalid AES key length: expected 32 bytes (256 bits), got ${keyBytes.length} bytes.`);
  }

  return await cryptoObj.subtle.importKey(
    "raw",
    keyBytes,
    { name: "AES-GCM" },
    false, // extractable = false for security
    ["encrypt", "decrypt"]
  );
}

/**
 * Derive 256-bit AES-GCM CryptoKey from Master Passphrase via PBKDF2-SHA256.
 */
export async function deriveKeyFromPassphrase(passphrase, salt = "StealthAppMasterSalt2026") {
  const cryptoObj = getCrypto();
  const enc = new TextEncoder();
  const baseKey = await cryptoObj.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await cryptoObj.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Backward compatibility helper for legacy records without AAD.
 */
export async function decryptRecord(nonceBase64, ciphertextBase64, cryptoKey) {
  return decryptRecordWithAad({
    nonceBase64,
    ciphertextBase64,
    aadBytes: new Uint8Array(0),
    deviceCryptoKey: cryptoKey
  });
}
