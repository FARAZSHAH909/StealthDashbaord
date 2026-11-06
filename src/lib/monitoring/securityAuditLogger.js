import { setDocument, listCollection } from "../firebase/firestoreService";

const AUDIT_COLLECTION = "security_audit_logs";

// Sensitive keys to redact immediately
const SENSITIVE_KEYS = ["password", "secret", "privateKey", "token", "authTag", "keyInput", "passphrase"];

function sanitizeDetails(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const clean = Array.isArray(obj) ? [] : {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clean[key] = "[REDACTED_SECURITY_MATERIAL]";
    } else if (typeof val === "object" && val !== null) {
      clean[key] = sanitizeDetails(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Records a security audit event in the centralized audit ledger.
 */
export async function recordSecurityAudit({ type, severity = "INFO", details = {}, ip = null }) {
  const eventId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const record = {
    id: eventId,
    type,
    severity, // "INFO" | "WARNING" | "HIGH" | "CRITICAL"
    timestamp: Date.now(),
    isoTime: new Date().toISOString(),
    ip: ip || "internal/edge",
    details: sanitizeDetails(details),
  };

  // Structured security log output
  const logPrefix = `[SECURITY_AUDIT][${severity}][${type}]`;
  if (severity === "CRITICAL" || severity === "HIGH") {
    console.error(logPrefix, JSON.stringify(record.details));
  } else if (severity === "WARNING") {
    console.warn(logPrefix, JSON.stringify(record.details));
  } else {
    console.info(logPrefix, JSON.stringify(record.details));
  }

  // Non-blocking write to Firestore security ledger
  try {
    await setDocument(AUDIT_COLLECTION, eventId, record);
  } catch (err) {
    // Audit logging failure should not crash application flow
    console.warn("[SecurityAudit] Fallback ledger notice:", err.message);
  }

  return record;
}

/**
 * Retrieves recent security events for administrative monitoring
 */
export async function listSecurityAudits(limitCount = 100) {
  try {
    const list = await listCollection(AUDIT_COLLECTION);
    if (!list) return [];
    list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return list.slice(0, limitCount);
  } catch (err) {
    console.warn("[SecurityAudit] Query error:", err.message);
    return [];
  }
}
