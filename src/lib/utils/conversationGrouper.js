/**
 * SMART CONVERSATION GROUPING ENGINE
 *
 * Implements:
 * - Browser-side transient grouping based on decrypted sender identity
 * - Pseudonymous fallback grouping when key vault is locked
 * - Isolation across device ID and application package
 * - Chronological message ordering
 * - Deduplication of message IDs
 * - Graceful handling of legacy and malformed records
 */

import {
  decryptRecord,
  decryptRecordWithAad,
  buildCanonicalBinaryAad,
  base64ToUint8Array
} from "../encryption/webCrypto.js";

/**
 * Decrypts sender identity (contact name, phone number):
 * Handles:
 * 1. Self-contained payload: [12-byte IV] + [AES-GCM Ciphertext + 16-byte Auth Tag]
 * 2. Standard Web Crypto combined payload with msg.nonce
 * 3. Protocol 2.0 Binary AAD payload
 * 4. Plaintext fallback if already human-readable
 */
export async function decryptSenderInfo(rawSender, msg = null, cryptoKey = null) {
  if (!rawSender) return "";
  const trimmed = String(rawSender).trim();
  if (!trimmed) return "";

  // Strategy 1: Check if already plaintext (e.g. "+923001234567" or "WhatsApp" or clear text)
  if (/^(\+[\d\s-()]{7,25}|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})$/.test(trimmed)) {
    return trimmed;
  }

  if (cryptoKey) {
    // Strategy 2: Self-contained IV + Ciphertext + Tag format (Base64)
    try {
      const bytes = base64ToUint8Array(trimmed);
      // Needs at least 12 bytes IV + 16 bytes Tag = 28 bytes
      if (bytes.length >= 28) {
        const iv = bytes.slice(0, 12);
        const payload = bytes.slice(12);
        const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
        if (cryptoObj?.subtle) {
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
      }
    } catch {}

    // Strategy 3: Decrypt using message's nonce (standard combined AES-GCM)
    if (msg?.nonce) {
      try {
        const res = await decryptRecord(msg.nonce, trimmed, cryptoKey);
        if (res.success && res.plaintext && res.plaintext.trim()) {
          return res.plaintext.trim();
        }
      } catch {}
    }

    // Strategy 4: Universal decrypt with msg context (including binary AAD)
    if (msg) {
      try {
        const res = await decryptUniversal(msg, trimmed, cryptoKey);
        if (res.success && res.plaintext && res.plaintext.trim()) {
          return res.plaintext.trim();
        }
      } catch {}
    }
  }

  // Strategy 5: If string doesn't look like base64 or is clearly plain readable text, return it
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed) || trimmed.length < 16) {
    return trimmed;
  }

  return "";
}

/**
 * Universal resilient decryptor for records:
 * Attempts multiple decryption modes (Packed IV+Cipher+Tag, split tag, combined tag, Protocol 2.0 Binary AAD, plaintext fallback)
 */
async function decryptUniversal(msg, rawText, cryptoKey) {
  if (!rawText) return { success: false, plaintext: "" };

  const trimmed = String(rawText).trim();

  // Plaintext check: if already human readable and not base64 ciphertext
  if (!/^[A-Za-z0-9+/=]+$/.test(trimmed) || trimmed.length < 16) {
    return { success: true, plaintext: trimmed };
  }

  if (!cryptoKey) return { success: false, plaintext: "" };

  // Attempt 1: Self-contained packed format [12-byte IV] + [AES-GCM Ciphertext + 16-byte Tag]
  try {
    const bytes = base64ToUint8Array(trimmed);
    if (bytes.length >= 28) {
      const iv = bytes.slice(0, 12);
      const payload = bytes.slice(12);
      const cryptoObj = typeof window !== "undefined" && window.crypto ? window.crypto : globalThis.crypto;
      if (cryptoObj?.subtle) {
        const decryptedBuffer = await cryptoObj.subtle.decrypt(
          { name: "AES-GCM", iv, tagLength: 128 },
          cryptoKey,
          payload
        );
        const plaintext = new TextDecoder("utf-8").decode(decryptedBuffer);
        if (plaintext && plaintext.trim()) {
          return { success: true, plaintext: plaintext.trim() };
        }
      }
    }
  } catch {}

  const nonce = msg?.nonce;
  const authTag = msg?.authTag || "";

  // Attempt 2: Decrypt with separate authTag and empty AAD (standard split GCM)
  if (nonce && authTag) {
    try {
      const res = await decryptRecordWithAad({
        nonceBase64: nonce,
        ciphertextBase64: trimmed,
        authTagBase64: authTag,
        aadBytes: new Uint8Array(0),
        deviceCryptoKey: cryptoKey,
      });
      if (res.success && res.plaintext) return res;
    } catch {}
  }

  // Attempt 3: Standard Web Crypto combined ciphertext + 16-byte auth tag at end
  if (nonce) {
    try {
      const res = await decryptRecord(nonce, trimmed, cryptoKey);
      if (res.success && res.plaintext) return res;
    } catch {}
  }

  // Attempt 4: Protocol 2.0 with Canonical Binary AAD + authTag
  if (msg?.protocolVersion === "2.0" && nonce && authTag) {
    try {
      const aadBytes = buildCanonicalBinaryAad({
        device_id: msg.deviceId,
        message_id: msg.id,
        seq_num: msg.seqNum || 0,
        key_version: msg.keyVersion || 1,
        timestamp: msg.timestamp || 0,
        is_migration: false,
      });
      const res = await decryptRecordWithAad({
        nonceBase64: nonce,
        ciphertextBase64: trimmed,
        authTagBase64: authTag,
        aadBytes,
        deviceCryptoKey: cryptoKey,
      });
      if (res.success && res.plaintext) return res;
    } catch {}
  }

  return { success: false, plaintext: "" };
}

/**
 * Generate a short, deterministic hash for pseudonymous grouping when locked.
 */
function fastHash(str) {
  let hash = 0;
  if (!str || str.length === 0) return "unknown";
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "sender_" + Math.abs(hash).toString(16).substring(0, 8);
}

/**
 * Normalizes a raw Firebase record into a standard internal shape.
 */
export function normalizeRecord(rawId, data) {
  if (!data || typeof data !== "object") return null;

  const messageId = data.message_id || rawId || `msg_${Date.now()}_${Math.random()}`;
  const deviceId = data.device_id || "unknown_device";
  const appPackage = data.app_package_name || "unknown.app";
  const timestamp = Number(data.timestamp) || Date.now();
  const checksum = data.checksum || null;
  const syncStatus = data.sync_status ?? true;

  // Encryption properties
  const encryptionAlgorithm = data.encryption_algorithm || "AES-256-GCM";
  const protocolVersion = data.protocol_version || "1.0";
  const nonce = data.nonce || data.iv || null;
  const ciphertext = data.ciphertext || data.message_content || null;
  const authTag = data.auth_tag || null;
  const senderInfo = data.sender_info || null;
  const seqNum = data.seq_num || 0;
  const keyVersion = data.key_version || 1;

  return {
    id: messageId,
    rawId,
    deviceId,
    appPackage,
    timestamp,
    checksum,
    syncStatus,
    encryptionAlgorithm,
    protocolVersion,
    nonce,
    ciphertext,
    authTag,
    senderInfo,
    seqNum,
    keyVersion,
    // Decrypted fields (RAM only)
    decryptedMessage: null,
    decryptedSender: null,
    isDecrypted: false,
    decryptionError: null,
  };
}

/**
 * Processes an array of normalized records, decrypts them in-memory if a CryptoKey is provided,
 * and groups them into conversation threads.
 *
 * @param {Array} rawRecords - Array of raw Firebase items: { key, val }
 * @param {CryptoKey|null} cryptoKey - Active in-memory Web Crypto key
 * @returns {Promise<{ conversations: Array, allMessages: Array, stats: Object }>}
 */
export async function organizeConversations(rawRecords, cryptoKey = null) {
  const messageMap = new Map(); // id -> message
  const conversationMap = new Map(); // convKey -> conversation

  let totalDecrypted = 0;
  let totalFailedDecryption = 0;

  // 1. Deduplicate & normalize
  const seenContentKeys = new Set();
  for (const item of rawRecords) {
    const record = normalizeRecord(item.key, item.val);
    if (!record) continue;
    if (messageMap.has(record.id)) continue; // Deduplicate duplicate message IDs

    // Deduplicate identical content/checksum from same device & app within same time window
    const roundedTs = Math.floor(record.timestamp / 60000); // 1-minute bucket
    const contentPayload = record.checksum || record.ciphertext || "";
    const contentKey = `${record.deviceId}:::${record.appPackage}:::${roundedTs}:::${contentPayload}`;
    if (contentPayload && seenContentKeys.has(contentKey)) {
      continue;
    }
    if (contentPayload) seenContentKeys.add(contentKey);

    messageMap.set(record.id, record);
  }

  const allMessages = Array.from(messageMap.values());

  // 2. Perform in-memory decryption if key is active
  for (const msg of allMessages) {
    if (cryptoKey) {
      // Decrypt message content
      if (msg.ciphertext) {
        const decMsg = await decryptUniversal(msg, msg.ciphertext, cryptoKey);
        if (decMsg.success) {
          msg.decryptedMessage = decMsg.plaintext;
          msg.isDecrypted = true;
          totalDecrypted++;
        } else {
          msg.decryptionError = decMsg.error || "Decryption failed";
          totalFailedDecryption++;
        }
      }

      // Decrypt sender title (contact name, phone number)
      if (msg.senderInfo) {
        const decSender = await decryptSenderInfo(msg.senderInfo, msg, cryptoKey);
        if (decSender) {
          msg.decryptedSender = decSender;
        } else {
          msg.decryptedSender = null;
        }
      }
    } else {
      // If locked, check if senderInfo is already plaintext
      if (msg.senderInfo) {
        const plainSender = await decryptSenderInfo(msg.senderInfo, msg, null);
        if (plainSender) {
          msg.decryptedSender = plainSender;
        }
      }
    }
  }

  // 3. Group into conversations
  for (const msg of allMessages) {
    // Determine stable sender identity
    let senderDisplay = "Unknown Contact";
    let senderKeyId = "unknown";

    if (msg.decryptedSender && msg.decryptedSender.trim()) {
      senderDisplay = msg.decryptedSender.trim();
      senderKeyId = senderDisplay.toLowerCase();
    } else if (msg.senderInfo) {
      senderKeyId = fastHash(msg.senderInfo);
      senderDisplay = `Contact [${senderKeyId.replace("sender_", "")}]`;
    }

    // Isolate by deviceId + appPackage + senderKeyId to prevent mixing
    const convKey = `${msg.deviceId}:::${msg.appPackage}:::${senderKeyId}`;

    if (!conversationMap.has(convKey)) {
      conversationMap.set(convKey, {
        id: convKey,
        deviceId: msg.deviceId,
        appPackage: msg.appPackage,
        senderName: senderDisplay,
        senderId: senderKeyId,
        messages: [],
        latestMessage: null,
        lastTimestamp: 0,
        messageCount: 0,
        isDecrypted: false,
      });
    }

    const conv = conversationMap.get(convKey);
    conv.messages.push(msg);
    if (msg.isDecrypted) conv.isDecrypted = true;
    if (msg.decryptedSender && (!conv.senderName || conv.senderName.startsWith("Contact ["))) {
      conv.senderName = msg.decryptedSender;
    }
  }

  // 4. Sort messages chronologically and compute previews
  const conversations = Array.from(conversationMap.values());
  for (const conv of conversations) {
    conv.messages.sort((a, b) => a.timestamp - b.timestamp);
    conv.messageCount = conv.messages.length;
    conv.latestMessage = conv.messages[conv.messages.length - 1];
    conv.lastTimestamp = conv.latestMessage ? conv.latestMessage.timestamp : 0;
  }

  // Sort conversations by latest activity descending
  conversations.sort((a, b) => b.lastTimestamp - a.lastTimestamp);

  return {
    conversations,
    allMessages,
    stats: {
      totalMessages: allMessages.length,
      totalConversations: conversations.length,
      totalDecrypted,
      totalFailedDecryption,
    },
  };
}

