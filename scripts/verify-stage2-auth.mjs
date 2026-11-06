import crypto from "crypto";

const BASE_URL = "http://localhost:3000";

async function postJson(endpoint, data) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, data: json };
}

async function runStage2Verification() {
  console.log("=== GATE 2 VERIFICATION: SERVER-MEDIATED ENROLLMENT & AUTH TOKEN ===");
  const startTime = Date.now();

  const testDeviceId = `test_device_${Date.now()}`;
  console.log(`Using Test Device ID: ${testDeviceId}`);

  // Step 1: Generate Device Keys (EC P-256 for signing, dummy 384-byte RSA wrapped key)
  const ecdsaKeyPair = await globalThis.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const spkiBytes = await globalThis.crypto.subtle.exportKey("spki", ecdsaKeyPair.publicKey);
  const spkiBase64 = Buffer.from(spkiBytes).toString("base64");

  // Dummy 384-byte wrapped AES key (simulating RSA-3072 OAEP output)
  const dummyWrappedKey = Buffer.alloc(384, 0x42).toString("base64");

  // Step 2: Generate Enrollment Token
  console.log("\n[TEST-GEN-TOKEN] Generating single-use enrollment token...");
  const genRes = await postJson("/api/devices/generate-token", {
    target_device_id: testDeviceId,
    ttl_hours: 1
  });
  if (genRes.status !== 200 || !genRes.data.enrollment_token) {
    throw new Error(`Failed to generate enrollment token: status ${genRes.status}, error: ${JSON.stringify(genRes.data)}`);
  }
  const enrollmentToken = genRes.data.enrollment_token;
  console.log(`Generated enrollment token: ${enrollmentToken.substring(0, 10)}... (status: ${genRes.status})`);
  console.log("Result: PASS");

  // Step 3 (TC-17): Field Allowlist Validation
  console.log("\n[TC-17] Testing Field Allowlist Enforcement (rejecting illegal fields)...");
  const illegalPayloadRes = await postJson("/api/devices/enroll", {
    device_id: testDeviceId,
    wrapped_device_key: dummyWrappedKey,
    device_public_signing_key_spki: spkiBase64,
    enrollment_token: enrollmentToken,
    malicious_admin_escalation: true, // ILLEGAL FIELD!
  });
  console.log(`Illegal payload response status: ${illegalPayloadRes.status}, error: ${illegalPayloadRes.data.error}`);
  if (illegalPayloadRes.status !== 400 || !illegalPayloadRes.data.error.includes("Unauthorized field")) {
    throw new Error(`SECURITY FAILURE: Field allowlist did not block unauthorized field!`);
  }
  console.log("Result: PASS (TC-17 Verified: Unauthorized fields strictly rejected)");

  // Step 4: Invalid wrapped key length check
  console.log("\n[TEST-KEY-LEN] Testing rejection of invalid wrapped key length...");
  const invalidKeyRes = await postJson("/api/devices/enroll", {
    device_id: testDeviceId,
    wrapped_device_key: Buffer.alloc(128).toString("base64"), // Wrong length (128 instead of 384)
    device_public_signing_key_spki: spkiBase64,
    enrollment_token: enrollmentToken
  });
  console.log(`Invalid key length response status: ${invalidKeyRes.status}, error: ${invalidKeyRes.data.error}`);
  if (invalidKeyRes.status !== 400) {
    throw new Error("SECURITY FAILURE: Invalid key length was not rejected with 400!");
  }
  console.log("Result: PASS (Key length enforcement verified)");

  // Step 5: Successful Device Enrollment
  console.log("\n[TEST-ENROLL] Performing legitimate server-mediated device enrollment...");
  const enrollRes = await postJson("/api/devices/enroll", {
    device_id: testDeviceId,
    wrapped_device_key: dummyWrappedKey,
    device_public_signing_key_spki: spkiBase64,
    key_version: 1,
    model: "Samsung Galaxy Test",
    os_version: "Android 14 (API 34)",
    enrollment_token: enrollmentToken
  });
  console.log(`Enrollment response status: ${enrollRes.status}, data: ${JSON.stringify(enrollRes.data)}`);
  if (enrollRes.status !== 200 || !enrollRes.data.success) {
    throw new Error(`Enrollment failed: ${enrollRes.data.error}`);
  }
  console.log("Result: PASS (Device enrolled & replay ledger initialized)");

  // Step 6 (TC-16): Token Single-Use Enforcement
  console.log("\n[TC-16] Testing Token Single-Use (attempting reuse of consumed token)...");
  const secondDevice = `device_attacker_${Date.now()}`;
  const reuseRes = await postJson("/api/devices/enroll", {
    device_id: secondDevice,
    wrapped_device_key: dummyWrappedKey,
    device_public_signing_key_spki: spkiBase64,
    enrollment_token: enrollmentToken // REUSING TOKEN!
  });
  console.log(`Token reuse response status: ${reuseRes.status}, error: ${reuseRes.data.error}`);
  if (reuseRes.status !== 403) {
    throw new Error("SECURITY FAILURE: Consumed enrollment token was reused!");
  }
  console.log("Result: PASS (TC-16 Verified: Token cannot be reused)");

  // Step 7 (TC-10): Re-enrollment of active device blocked
  console.log("\n[TC-10] Testing Re-enrollment Blocking of Active Device...");
  // Generate a fresh token first
  const freshTokenRes = await postJson("/api/devices/generate-token", {});
  const reEnrollRes = await postJson("/api/devices/enroll", {
    device_id: testDeviceId, // ALREADY ENROLLED & ACTIVE!
    wrapped_device_key: dummyWrappedKey,
    device_public_signing_key_spki: spkiBase64,
    enrollment_token: freshTokenRes.data.enrollment_token
  });
  console.log(`Re-enrollment response status: ${reEnrollRes.status}, error: ${reEnrollRes.data.error}`);
  if (reEnrollRes.status !== 409) {
    throw new Error("SECURITY FAILURE: Active device was re-enrolled without revocation!");
  }
  console.log("Result: PASS (TC-10 Verified: Active device re-enrollment blocked with 409 Conflict)");

  // Step 8 (TC-12): Custom Auth Token Minting with EC P-256 Challenge Signature
  console.log("\n[TC-12] Testing Device Custom Token Minting with Digital Signature...");
  const authTimestamp = Date.now();
  const challenge = `AUTH_CHALLENGE:${testDeviceId}:${authTimestamp}`;
  const challengeSig = await globalThis.crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    ecdsaKeyPair.privateKey,
    new TextEncoder().encode(challenge)
  );
  const challengeSigBase64 = Buffer.from(challengeSig).toString("base64");

  const authTokenRes = await postJson("/api/devices/auth-token", {
    device_id: testDeviceId,
    timestamp: authTimestamp,
    signature: challengeSigBase64
  });
  console.log(`Auth token response status: ${authTokenRes.status}, success: ${authTokenRes.data.success}`);
  if (authTokenRes.status !== 200 || !authTokenRes.data.custom_token) {
    throw new Error(`Failed to mint custom auth token: ${authTokenRes.data.error}`);
  }
  console.log(`Minted custom token length: ${authTokenRes.data.custom_token.length} chars`);
  console.log("Result: PASS (TC-12 Verified: Custom Token minted with device_id binding)");

  // Step 9: Challenge Signature Tampering / Forgery Rejection
  console.log("\n[TEST-SIG-TAMPER] Testing rejection of forged/tampered signature on auth-token...");
  const tamperedSig = Buffer.from(challengeSig);
  tamperedSig[10] ^= 0xff; // Flip bits
  const tamperedAuthRes = await postJson("/api/devices/auth-token", {
    device_id: testDeviceId,
    timestamp: authTimestamp,
    signature: tamperedSig.toString("base64")
  });
  console.log(`Tampered signature response status: ${tamperedAuthRes.status}, error: ${tamperedAuthRes.data.error}`);
  if (tamperedAuthRes.status !== 401) {
    throw new Error("SECURITY FAILURE: Tampered signature was accepted!");
  }
  console.log("Result: PASS (Signature forgery blocked)");

  // Step 10: Clock Skew / Expired Challenge Rejection
  console.log("\n[TEST-CLOCK-SKEW] Testing rejection of expired auth challenge (> 5 mins)...");
  const expiredTimestamp = Date.now() - (10 * 60 * 1000); // 10 minutes ago
  const expiredChallenge = `AUTH_CHALLENGE:${testDeviceId}:${expiredTimestamp}`;
  const expiredSig = await globalThis.crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    ecdsaKeyPair.privateKey,
    new TextEncoder().encode(expiredChallenge)
  );
  const expiredAuthRes = await postJson("/api/devices/auth-token", {
    device_id: testDeviceId,
    timestamp: expiredTimestamp,
    signature: Buffer.from(expiredSig).toString("base64")
  });
  console.log(`Expired challenge response status: ${expiredAuthRes.status}, error: ${expiredAuthRes.data.error}`);
  if (expiredAuthRes.status !== 401) {
    throw new Error("SECURITY FAILURE: Expired challenge was accepted!");
  }
  console.log("Result: PASS (Challenge replay window enforced)");

  console.log(`\n======================================================`);
  console.log(`GATE 2 VERIFICATION COMPLETED IN ${Date.now() - startTime}ms`);
  console.log(`ALL TESTS PASSED WITH 100% SUCCESS.`);
  console.log(`======================================================\n`);
}

runStage2Verification().catch(err => {
  console.error("GATE 2 VERIFICATION FAILED:", err);
  process.exit(1);
});

