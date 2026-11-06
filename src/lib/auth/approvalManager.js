import crypto from "crypto";
import {
  getDocument,
  setDocument,
  updateDocument,
  listCollection,
} from "../firebase/firestoreService.js";

const QUEUE_COLLECTION = "admin_approval_queue";
const USERS_COLLECTION = "admin_users";

function generateOtp() {
  // 6-digit numeric OTP token
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Checks if the given email is the designated Master Admin Email.
 */
export function isMasterEmail(email) {
  if (!email) return false;
  const masterEmail = (process.env.MASTER_ADMIN_EMAIL || "farazshah9095@gmail.com").trim().toLowerCase();
  return email.trim().toLowerCase() === masterEmail;
}

/**
 * Creates a new enrollment request in Cloud Firestore (admin_approval_queue).
 */
export async function createEnrollmentRequest({ email, password, role }) {
  const cleanEmail = email.trim().toLowerCase();
  const isMaster = isMasterEmail(cleanEmail);
  const requestId = "REQ_" + crypto.randomBytes(8).toString("hex").toUpperCase();

  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours expiry

  let verificationToken = null;
  let masterApproved = false;

  if (isMaster) {
    // Master Email: auto-approved by role, but MUST still verify email token!
    masterApproved = true;
    verificationToken = generateOtp();
  } else {
    // Secondary Email: strictly requires Master Admin permission first!
    masterApproved = false;
    verificationToken = null; // Token will only be issued AFTER master approves!
  }

  const record = {
    requestId,
    email: cleanEmail,
    password, // Transient in queue until verified
    role: isMaster ? "super_admin" : (role || "admin"),
    isMaster,
    masterApproved,
    verificationToken,
    isVerified: false,
    requestedAt: now,
    approvedAt: isMaster ? now : null,
    expiresAt,
    status: isMaster ? "AWAITING_VERIFICATION" : "PENDING_MASTER_APPROVAL",
  };

  // Save to Cloud Firestore
  await setDocument(QUEUE_COLLECTION, requestId, record);

  // Simulated email dispatch log
  if (isMaster && verificationToken) {
    console.log(`📧 [EMAIL SERVICE] Sent Verification Token to MASTER (${cleanEmail}): [${verificationToken}]`);
  }

  return {
    requestId,
    email: cleanEmail,
    isMaster,
    masterApproved,
    nextStep: isMaster ? "verify-email" : "pending-approval",
    verificationToken: isMaster ? verificationToken : null,
  };
}

/**
 * Retrieves the live status of an enrollment request from Cloud Firestore.
 */
export async function getEnrollmentStatus(requestId) {
  return await getDocument(QUEUE_COLLECTION, requestId);
}

/**
 * Lists all enrollment requests in Cloud Firestore for Master Admin review.
 */
export async function listAllRequests() {
  const list = await listCollection(QUEUE_COLLECTION);
  return list || [];
}

/**
 * Master Admin authorizes a secondary applicant in Cloud Firestore.
 * This ISSUES their verification token and dispatches it!
 */
export async function approveSecondaryApplicant(requestId) {
  const record = await getEnrollmentStatus(requestId);
  if (!record) throw new Error("Request ID not found in queue.");

  if (record.isVerified) {
    throw new Error("User has already verified their account.");
  }

  // Issue the verification OTP
  const verificationToken = generateOtp();
  const updated = {
    ...record,
    masterApproved: true,
    approvedAt: Date.now(),
    verificationToken,
    status: "AWAITING_VERIFICATION",
  };

  await setDocument(QUEUE_COLLECTION, requestId, updated);

  console.log(`📧 [EMAIL SERVICE] Master Admin APPROVED ${record.email}! Sent Verification Token: [${verificationToken}]`);

  return {
    success: true,
    email: record.email,
    verificationToken,
  };
}

/**
 * Master Admin rejects an applicant in Cloud Firestore.
 */
export async function rejectSecondaryApplicant(requestId) {
  const record = await getEnrollmentStatus(requestId);
  if (!record) throw new Error("Request ID not found.");

  const updated = {
    ...record,
    masterApproved: false,
    status: "REJECTED",
  };

  await setDocument(QUEUE_COLLECTION, requestId, updated);
  return { success: true };
}

/**
 * Verifies the OTP verification token and creates active user in Cloud Firestore.
 */
export async function verifyAndActivateAccount(requestId, submittedOtp) {
  const record = await getEnrollmentStatus(requestId);
  if (!record) {
    return { success: false, error: "Invalid registration session." };
  }

  if (!record.masterApproved) {
    return { success: false, error: "Master Administrator has not yet granted permission for this account." };
  }

  if (record.isVerified) {
    return { success: false, error: "Account has already been verified and activated." };
  }

  if (!record.verificationToken || record.verificationToken !== submittedOtp.trim()) {
    return { success: false, error: "Invalid verification code. Please check your email." };
  }

  // OTP IS VALID! Activate user account in Cloud Firestore
  const safeUid = Buffer.from(record.email).toString("base64").replace(/[=/+]/g, "_");
  await setDocument(USERS_COLLECTION, safeUid, {
    uid: safeUid,
    email: record.email,
    role: record.role,
    verified: true,
    activatedAt: Date.now(),
  });

  // Provision user in Firebase Authentication so login works seamlessly!
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDTu7M6XTpc9juwzZ-Z7bLEQR2sljbkOhQ";
  try {
    const authRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: record.email,
        password: record.password,
        returnSecureToken: true,
      }),
    });
    const authData = await authRes.json();
    if (authData.error) {
      console.warn("Firebase Auth provision note:", authData.error.message);
    } else {
      console.log(`✓ Provisioned Firebase Auth User [UID: ${authData.localId}] for ${record.email}`);
    }
  } catch (authErr) {
    console.warn("Firebase Auth provision error:", authErr.message);
  }

  // Mark queue item as completed
  const finalized = {
    ...record,
    isVerified: true,
    status: "ACTIVATED",
    password: "[PROTECTED]",
  };

  await setDocument(QUEUE_COLLECTION, requestId, finalized);

  return {
    success: true,
    email: record.email,
    role: record.role,
  };
}
