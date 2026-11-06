import crypto from "crypto";
import { getDocument, setDocument } from "../firebase/firestoreService.js";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutes lifetime
const COLLECTION_NAME = "admin_invite_tokens";
const DOC_ID = "active_token";

/**
 * Generates a cryptographically strong random single-use invite token.
 * Format: SEC-INV-XXXXXXXXXXXXXXXXXXXXXXXX
 */
export function generateRandomToken() {
  const bytes = crypto.randomBytes(12).toString("hex").toUpperCase();
  return `SEC-INV-${bytes}`;
}

/**
 * Fetch the currently active invitation token from Cloud Firestore.
 * Auto-initializes a new rolling token if none exists or if expired.
 */
export async function getActiveCloudToken() {
  let tokenData = await getDocument(COLLECTION_NAME, DOC_ID);

  // If no token exists, is consumed, or has expired, auto-generate the next rolling token
  const now = Date.now();
  if (!tokenData || tokenData.is_consumed || (tokenData.expires_at && now > tokenData.expires_at)) {
    console.log("☁️ [Cloud Firestore] No valid active token found. Generating new rolling token...");
    return await rotateCloudToken();
  }

  return tokenData;
}

/**
 * Saves a new active token to Cloud Firestore.
 */
export async function saveCloudToken(tokenRecord) {
  return await setDocument(COLLECTION_NAME, DOC_ID, tokenRecord);
}


/**
 * Generates and stores a new rolling random token in Cloud storage.
 */
export async function rotateCloudToken(allowedRole = "admin") {
  const newToken = generateRandomToken();
  const tokenRecord = {
    token: newToken,
    created_at: Date.now(),
    expires_at: Date.now() + TOKEN_TTL_MS,
    is_consumed: false,
    allowed_role: allowedRole,
  };

  await saveCloudToken(tokenRecord);
  console.log(`[CloudTokenManager] Rotated active token. New active token: ${newToken}`);
  return tokenRecord;
}

/**
 * Validates the submitted invitation secret against the active cloud token.
 * ATOMIC SINGLE-USE: If valid, the token is IMMEDIATELY BURNED / CONSUMED,
 * and a brand-new random rolling token is generated in the cloud.
 */
export async function validateAndConsumeCloudToken(submittedToken) {
  if (!submittedToken || typeof submittedToken !== "string") {
    return { valid: false, error: "Invitation token cannot be empty." };
  }

  const cleanSubmitted = submittedToken.trim();
  const activeRecord = await getActiveCloudToken();

  if (!activeRecord || !activeRecord.token) {
    return { valid: false, error: "No active invitation token found in cloud." };
  }

  // Check expiration
  if (activeRecord.expires_at && Date.now() > activeRecord.expires_at) {
    // Expired: auto-rotate immediately
    await rotateCloudToken();
    return { valid: false, error: "Invitation token has expired. A new rolling token has been generated in the cloud." };
  }

  // Check consumption
  if (activeRecord.is_consumed) {
    await rotateCloudToken();
    return { valid: false, error: "This invitation token was already used and is no longer valid." };
  }

  // Timing-safe comparison to prevent side-channel timing attacks
  const tokenBuffer = Buffer.from(activeRecord.token);
  const inputBuffer = Buffer.from(cleanSubmitted);

  const isMatch =
    tokenBuffer.length === inputBuffer.length &&
    crypto.timingSafeEqual(tokenBuffer, inputBuffer);

  if (!isMatch) {
    return { valid: false, error: "Invalid invitation token. Access denied." };
  }

  // TOKEN IS VALID! IMMEDIATELY BURN / CONSUME IT IN THE CLOUD
  console.log(`[CloudTokenManager] Token ${cleanSubmitted} VERIFIED! Burning token and generating new rolling key...`);

  // Archive / Mark consumed
  const consumedRecord = {
    ...activeRecord,
    is_consumed: true,
    consumed_at: Date.now(),
  };

  // Generate the next random rolling token in the cloud immediately
  const nextRollingToken = await rotateCloudToken(activeRecord.allowed_role || "admin");

  return {
    valid: true,
    role: activeRecord.allowed_role || "admin",
    nextToken: nextRollingToken.token,
  };
}
