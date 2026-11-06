/**
 * AUTHORITATIVE SLIDING-WINDOW REPLAY ATTACK DEFENSE LEDGER
 *
 * Implements:
 * - RFC 4303 / RFC 6479 Sliding Acceptance Window (W = 128 messages)
 * - 64-bit Monotonic Sequence Number validation using JavaScript BigInt
 * - Out-of-order delivery tolerance within window boundary (W = 128)
 * - Exact duplicate / replay suppression with bitmask check
 * - Dual-layer persistence: In-memory atomic state cache + Cloud Firestore synchronization
 */

import { firestore } from "../firebase/client.js";
import { doc, getDoc, setDoc } from "firebase/firestore";

const RTDB_URL = "https://stealthapp-50da2-default-rtdb.firebaseio.com";

async function fetchLedgerState(deviceId) {
  try {
    const docRef = doc(firestore, "devices_management", deviceId, "replay_ledger", "active");
    const snap = await getDoc(docRef);
    if (snap.exists()) return snap.data();
  } catch (err) {
    // Non-blocking fallback to RTDB
  }
  try {
    const res = await fetch(`${RTDB_URL}/devices_management/${deviceId}/replay_ledger/active.json`, { cache: "no-store" });
    const data = await res.json();
    if (data && typeof data === "object") return data;
  } catch { }
  return null;
}

async function persistLedgerState(deviceId, data) {
  try {
    const docRef = doc(firestore, "devices_management", deviceId, "replay_ledger", "active");
    await setDoc(docRef, data);
  } catch (err) {
    // Non-blocking
  }
  try {
    await fetch(`${RTDB_URL}/devices_management/${deviceId}/replay_ledger/active.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch { }
}

const WINDOW_SIZE = 128n;
const MASK_128_BITS = (1n << WINDOW_SIZE) - 1n;

// In-memory cache for fast UI evaluation
const memoryLedgerCache = new Map();

/**
 * Validates sequence number against a 128-bit sliding window.
 * Pure mathematical logic operating on BigInt.
 *
 * @param {bigint} seq - Received sequence number
 * @param {bigint} maxSeen - Maximum sequence number seen so far
 * @param {bigint} mask - 128-bit integer bitmap of accepted messages within window
 * @returns {{ accepted: boolean, newMaxSeen?: bigint, newMask?: bigint, reason?: string }}
 */
export function evaluateSlidingWindow(seq, maxSeen, mask) {
  if (seq <= 0n) {
    return { accepted: false, reason: "INVALID_NON_POSITIVE_SEQUENCE" };
  }

  // Case 1: First message ever processed
  if (maxSeen === 0n) {
    return {
      accepted: true,
      newMaxSeen: seq,
      newMask: 1n
    };
  }

  const diff = seq - maxSeen;

  // Case 2: In-order or newer sequence number (diff > 0)
  if (diff > 0n) {
    let newMask;
    if (diff >= WINDOW_SIZE) {
      // Skipped ahead past entire window; all previous slots expire
      newMask = 1n;
    } else {
      // Shift left by diff and set bit 0 for the current sequence
      newMask = ((mask << diff) | 1n) & MASK_128_BITS;
    }
    return {
      accepted: true,
      newMaxSeen: seq,
      newMask
    };
  }

  // Case 3: Exactly equal to maxSeen -> duplicate!
  if (diff === 0n) {
    return { accepted: false, reason: "DUPLICATE_SEQUENCE_NUMBER" };
  }

  // Case 4: Older sequence number (diff < 0)
  const lag = -diff;
  if (lag >= WINDOW_SIZE) {
    return {
      accepted: false,
      reason: `SEQUENCE_OUTSIDE_WINDOW: message lag (${lag}) exceeds window size (${WINDOW_SIZE})`
    };
  }

  const bit = 1n << lag;
  if ((mask & bit) !== 0n) {
    return { accepted: false, reason: "REPLAY_DUPLICATE_DETECTED: packet already accepted in current window" };
  }

  // Mark bit in window and accept
  const newMask = mask | bit;
  return {
    accepted: true,
    newMaxSeen: maxSeen,
    newMask
  };
}

/**
 * Validates and records a sequence number for a device.
 *
 * @param {string} deviceId - Target device ID
 * @param {number|string|bigint} seqNum - Sequence number of incoming message
 * @returns {Promise<{ accepted: boolean, reason?: string, max_seen_seq?: string }>}
 */
export async function validateAndRecordSequence(deviceId, seqNum) {
  if (!deviceId) return { accepted: false, reason: "MISSING_DEVICE_ID" };

  let seq;
  try {
    seq = BigInt(seqNum);
  } catch {
    return { accepted: false, reason: "INVALID_SEQUENCE_FORMAT" };
  }

  // 1. Check or initialize from cache
  let current = memoryLedgerCache.get(deviceId);

  if (!current) {
    // Attempt load from Firestore / RTDB
    try {
      const docData = await fetchLedgerState(deviceId);
      if (docData && docData.max_seen_seq !== undefined) {
        current = {
          maxSeen: BigInt(docData.max_seen_seq),
          mask: BigInt(docData.accepted_mask || "0")
        };
      }
    } catch (e) {
      console.warn(`[ReplayLedger] Cache miss load notice for device ${deviceId}:`, e.message);
    }

    if (!current) {
      current = { maxSeen: 0n, mask: 0n };
    }
  }

  // 2. Evaluate sliding window
  const evalResult = evaluateSlidingWindow(seq, current.maxSeen, current.mask);
  if (!evalResult.accepted) {
    return evalResult;
  }

  // 3. Update memory state immediately
  const updatedState = {
    maxSeen: evalResult.newMaxSeen,
    mask: evalResult.newMask
  };
  memoryLedgerCache.set(deviceId, updatedState);

    // 4. Asynchronously persist authoritative state to Firestore / RTDB
    persistLedgerState(deviceId, {
      device_id: deviceId,
      max_seen_seq: evalResult.newMaxSeen.toString(),
    accepted_mask: evalResult.newMask.toString(16),
    last_received_at: Date.now()
  }).catch((err) => {
    console.warn(`[ReplayLedger] Async sync failed for ${deviceId}:`, err.message);
  });

  return {
    accepted: true,
    max_seen_seq: evalResult.newMaxSeen.toString()
  };
}

/**
 * Resets the in-memory ledger cache (used during testing or device reset).
 */
export function clearReplayLedgerCache() {
  memoryLedgerCache.clear();
}
