const {
  createEnrollmentRequest,
  getEnrollmentStatus,
  approveSecondaryApplicant,
  verifyAndActivateAccount,
} = require("../src/lib/auth/approvalManager");

async function runGatekeeperVerification() {
  console.log("🛡️ [VERIFICATION] Starting Master Gatekeeper & Universal OTP Verification Test...\n");

  // --- TEST 1: MASTER ADMIN REGISTRATION ---
  const masterEmail = "master@stealthapp.internal";
  console.log(`[TEST 1] Creating Enrollment Request for Master Admin: ${masterEmail}`);
  const masterReq = await createEnrollmentRequest({
    email: masterEmail,
    password: "Password123!@#",
    role: "super_admin",
  });
  console.log("   Initial Master Response:", {
    requestId: masterReq.requestId,
    isMaster: masterReq.isMaster,
    masterApproved: masterReq.masterApproved,
    nextStep: masterReq.nextStep,
    verificationToken: masterReq.verificationToken,
  });

  if (!masterReq.isMaster || !masterReq.masterApproved || !masterReq.verificationToken) {
    throw new Error("Master Admin must be auto-approved and immediately receive an OTP token!");
  }
  console.log("   ✓ Master is recognized and OTP token generated immediately.");

  // Verify Master OTP
  console.log("   Submitting Master OTP verification...");
  const masterVerifyRes = await verifyAndActivateAccount(masterReq.requestId, masterReq.verificationToken);
  console.log("   Master Verify Result:", masterVerifyRes);
  if (!masterVerifyRes.success) {
    throw new Error("Failed to verify Master Admin account with valid OTP!");
  }
  console.log("   ✓ Master Admin Account ACTIVATED successfully!");

  // --- TEST 2: SECONDARY APPLICANT (MUST BE APPROVED BY MASTER FIRST) ---
  const secondaryEmail = "analyst.secondary@testdomain.com";
  console.log(`\n[TEST 2] Creating Enrollment Request for Secondary Applicant: ${secondaryEmail}`);
  const secReq = await createEnrollmentRequest({
    email: secondaryEmail,
    password: "SecurePass987!@#",
    role: "admin",
  });
  console.log("   Initial Secondary Response:", {
    requestId: secReq.requestId,
    isMaster: secReq.isMaster,
    masterApproved: secReq.masterApproved,
    nextStep: secReq.nextStep,
    verificationToken: secReq.verificationToken,
  });

  if (secReq.isMaster || secReq.masterApproved || secReq.verificationToken !== null) {
    throw new Error("CRITICAL SECURITY ERROR: Secondary applicant must NOT be approved or receive token automatically!");
  }
  console.log("   ✓ Secondary applicant correctly put into PENDING_MASTER_APPROVAL state (No token issued yet).");

  // Attempt early verification without Master approval (Should FAIL)
  console.log("   Simulating premature verification attempt by secondary applicant...");
  const earlyAttempt = await verifyAndActivateAccount(secReq.requestId, "123456");
  console.log("   Premature attempt result:", earlyAttempt);
  if (earlyAttempt.success) {
    throw new Error("CRITICAL SECURITY ERROR: Verification succeeded without Master Admin approval!");
  }
  console.log("   ✓ Premature verification strictly rejected by Gatekeeper.");

  // Master Admin Approves Secondary Applicant
  console.log("\n[TEST 3] Master Admin reviews and approves Secondary Applicant...");
  const approvalRes = await approveSecondaryApplicant(secReq.requestId);
  console.log("   Approval Result:", approvalRes);
  if (!approvalRes.success || !approvalRes.verificationToken) {
    throw new Error("Approval failed or token was not issued!");
  }
  console.log(`   ✓ Master Admin approved! OTP token issued to secondary applicant: [${approvalRes.verificationToken}]`);

  // Secondary Applicant verifies their OTP
  console.log("   Secondary applicant enters their received OTP...");
  const secVerifyRes = await verifyAndActivateAccount(secReq.requestId, approvalRes.verificationToken);
  console.log("   Secondary Verify Result:", secVerifyRes);
  if (!secVerifyRes.success) {
    throw new Error("Secondary account verification failed with correct OTP!");
  }
  console.log("   ✓ Secondary Applicant Account ACTIVATED successfully!");

  console.log("\n🎉 ALL MASTER GATEKEEPER & UNIVERSAL OTP VERIFICATION TESTS PASSED (100%)!");
}

runGatekeeperVerification().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});

