import {
  buildCanonicalBinaryAad,
  buildCanonicalSigningPayload,
  unwrapDeviceKey,
  decryptRecordWithAad,
  verifyRecordSignature
} from "../src/lib/encryption/webCrypto.js";
import {
  evaluateSlidingWindow,
  validateAndRecordSequence,
  clearReplayLedgerCache
} from "../src/lib/utils/replayLedgerService.js";
import { p1363ToDer, derToP1363 } from "../src/lib/encryption/signatureUtils.js";

async function runStage3Verification() {
  console.log("=== GATE 3 VERIFICATION: DASHBOARD ENGINE, AAD & REPLAY DEFENSE ===");
  const startTime = Date.now();

  // Test 1 (TC-02): RSA-3072 Key Unwrapping
  console.log("\n[TC-02] Testing Master RSA-3072 Asymmetric Key Unwrapping...");
  const masterKeyPair = await globalThis.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 3072,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const rawDeviceKey = new Uint8Array(32);
  globalThis.crypto.getRandomValues(rawDeviceKey);

  // Device wraps raw key using Master Public Key
  const wrappedKeyBytes = await globalThis.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    masterKeyPair.publicKey,
    rawDeviceKey
  );
  const wrappedKeyBase64 = Buffer.from(wrappedKeyBytes).toString("base64");
  console.log(`Wrapped device key ciphertext length: ${wrappedKeyBytes.byteLength} bytes (RSA-3072 OAEP)`);

  // Dashboard unwraps using Master Private Key
  const unwrappedCryptoKey = await unwrapDeviceKey(masterKeyPair.privateKey, wrappedKeyBase64);
  console.log(`Unwrapped key algorithm: ${unwrappedCryptoKey.algorithm.name}, length: ${unwrappedCryptoKey.algorithm.length}, extractable: ${unwrappedCryptoKey.extractable}`);
  if (unwrappedCryptoKey.algorithm.name !== "AES-GCM" || unwrappedCryptoKey.extractable !== false) {
    throw new Error("Device key unwrapping failed or key is extractable!");
  }
  console.log("Result: PASS (TC-02 Verified)");

  // Test 2 (TC-03): Canonical Binary AAD Binding & Decryption
  console.log("\n[TC-03] Testing Canonical Binary AAD Binding & Decryption...");
  const testDeviceId = "dev_samsung_galaxy_s24";
  const testMessageId = "msg_notif_9876543210";
  const testSeqNum = 36028797018976313n; // 2^55 + 12345 (64-bit BigInt)
  const testTimestamp = 1731000000000;
  const originalPlaintext = "CONFIDENTIAL: Your One-Time Passcode is 948123.";

  const canonicalAad = buildCanonicalBinaryAad({
    device_id: testDeviceId,
    message_id: testMessageId,
    seq_num: testSeqNum,
    key_version: 1,
    timestamp: testTimestamp,
    is_migration: false
  });
  console.log(`Built Canonical Binary AAD (length: ${canonicalAad.length} bytes, Magic: ${String.fromCharCode(...canonicalAad.subarray(0, 4))})`);

  // Device encrypts with AES-256-GCM + AAD
  const testIv = new Uint8Array(12);
  globalThis.crypto.getRandomValues(testIv);
  const rawAesKeyObj = await globalThis.crypto.subtle.importKey(
    "raw",
    rawDeviceKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );

  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: testIv, additionalData: canonicalAad, tagLength: 128 },
    rawAesKeyObj,
    new TextEncoder().encode(originalPlaintext)
  );

  // Split into ciphertext and 16-byte tag
  const encArray = new Uint8Array(encryptedBuffer);
  const cipherBytes = encArray.subarray(0, encArray.length - 16);
  const tagBytes = encArray.subarray(encArray.length - 16);

  const decryptResult = await decryptRecordWithAad({
    nonceBase64: Buffer.from(testIv).toString("base64"),
    ciphertextBase64: Buffer.from(cipherBytes).toString("base64"),
    authTagBase64: Buffer.from(tagBytes).toString("base64"),
    aadBytes: canonicalAad,
    deviceCryptoKey: unwrappedCryptoKey
  });

  console.log(`Decrypted plaintext: "${decryptResult.plaintext}"`);
  if (!decryptResult.success || decryptResult.plaintext !== originalPlaintext) {
    throw new Error(`Decryption failed: ${decryptResult.error}`);
  }
  console.log("Result: PASS (TC-03 Verified)");

  // Test 3 (TC-05): Tampered AAD Rejection
  console.log("\n[TC-05] Testing AAD Tampering Attack (tampering sequence number in AAD)...");
  const tamperedAad = buildCanonicalBinaryAad({
    device_id: testDeviceId,
    message_id: testMessageId,
    seq_num: testSeqNum + 1n, // TAMPERED SEQUENCE!
    key_version: 1,
    timestamp: testTimestamp,
    is_migration: false
  });

  const tamperedResult = await decryptRecordWithAad({
    nonceBase64: Buffer.from(testIv).toString("base64"),
    ciphertextBase64: Buffer.from(cipherBytes).toString("base64"),
    authTagBase64: Buffer.from(tagBytes).toString("base64"),
    aadBytes: tamperedAad,
    deviceCryptoKey: unwrappedCryptoKey
  });

  console.log(`Tampered AAD decryption outcome: success=${tamperedResult.success}, error="${tamperedResult.error}"`);
  if (tamperedResult.success) {
    throw new Error("SECURITY FAILURE: Decryption succeeded with tampered AAD!");
  }
  console.log("Result: PASS (TC-05 Verified: Tampered AAD rejected by GCM authentication tag)");

  // Test 4 (TC-18 & TC-19): Sliding Window Replay Attack Defense (W = 128)
  console.log("\n[TC-18 & TC-19] Testing 128-Message Sliding Window Replay Defense...");
  clearReplayLedgerCache();

  // 4.1 First message
  let res = evaluateSlidingWindow(1n, 0n, 0n);
  if (!res.accepted || res.newMaxSeen !== 1n) throw new Error("Failed to accept seq 1");

  // 4.2 Monotonic increase (seq 2, 3, 4)
  res = evaluateSlidingWindow(2n, res.newMaxSeen, res.newMask);
  res = evaluateSlidingWindow(3n, res.newMaxSeen, res.newMask);
  res = evaluateSlidingWindow(4n, res.newMaxSeen, res.newMask);
  if (!res.accepted || res.newMaxSeen !== 4n) throw new Error("In-order acceptance failed");
  console.log("In-order sequence numbers (1, 2, 3, 4): ACCEPTED");

  // 4.3 Immediate duplicate replay (seq 3)
  const dupRes = evaluateSlidingWindow(3n, res.newMaxSeen, res.newMask);
  console.log(`Replay of seq 3: accepted=${dupRes.accepted}, reason="${dupRes.reason}"`);
  if (dupRes.accepted) throw new Error("SECURITY FAILURE: Replay packet accepted!");
  console.log("Result: PASS (Duplicate packet rejected)");

  // 4.4 Out-of-order within window (jump to seq 10, then deliver seq 7)
  res = evaluateSlidingWindow(10n, res.newMaxSeen, res.newMask);
  if (!res.accepted || res.newMaxSeen !== 10n) throw new Error("Jump to seq 10 failed");
  const oooRes = evaluateSlidingWindow(7n, res.newMaxSeen, res.newMask);
  console.log(`Out-of-order delivery of seq 7 within window: accepted=${oooRes.accepted}`);
  if (!oooRes.accepted) throw new Error("Legitimate out-of-order packet rejected");

  // 4.5 Duplicate replay of out-of-order message (seq 7 again)
  const dupOooRes = evaluateSlidingWindow(7n, oooRes.newMaxSeen, oooRes.newMask);
  console.log(`Second submission of seq 7: accepted=${dupOooRes.accepted}, reason="${dupOooRes.reason}"`);
  if (dupOooRes.accepted) throw new Error("SECURITY FAILURE: Second submission of seq 7 accepted!");

  // 4.6 Advance window past 128 (jump to seq 160)
  res = evaluateSlidingWindow(160n, oooRes.newMaxSeen, oooRes.newMask);
  if (!res.accepted || res.newMaxSeen !== 160n) throw new Error("Window advance to 160 failed");

  // 4.7 Expired sequence (seq 5, which is 155 behind 160, outside window 128)
  const expiredRes = evaluateSlidingWindow(5n, res.newMaxSeen, res.newMask);
  console.log(`Submission of ancient seq 5 (outside W=128): accepted=${expiredRes.accepted}, reason="${expiredRes.reason}"`);
  if (expiredRes.accepted) throw new Error("SECURITY FAILURE: Expired packet outside window accepted!");
  console.log("Result: PASS (TC-18 & TC-19 Verified)");

  // Test 5 (TC-20 & TC-21): Full Envelope Digital Signature Verification
  console.log("\n[TC-20 & TC-21] Testing Full Envelope Digital Signature Verification...");
  const ecdsaKp = await globalThis.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const deviceSpki = Buffer.from(await globalThis.crypto.subtle.exportKey("spki", ecdsaKp.publicKey)).toString("base64");

  const signPayload = buildCanonicalSigningPayload({
    aadBytes: canonicalAad,
    nonceBytes: testIv,
    ciphertextBytes: cipherBytes,
    authTagBytes: tagBytes
  });

  const rawP1363Sig = await globalThis.crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    ecdsaKp.privateKey,
    signPayload
  );

  // Convert to Android-style ASN.1 DER to verify cross-compatibility
  const derSig = p1363ToDer(rawP1363Sig);
  const derSigBase64 = Buffer.from(derSig).toString("base64");

  const mockRecord = {
    device_id: testDeviceId,
    message_id: testMessageId,
    seq_num: testSeqNum,
    key_version: 1,
    timestamp: testTimestamp,
    iv: Buffer.from(testIv).toString("base64"),
    ciphertext: Buffer.from(cipherBytes).toString("base64"),
    auth_tag: Buffer.from(tagBytes).toString("base64"),
    device_signature: derSigBase64 // ASN.1 DER signature from device!
  };

  const sigVerifyResult = await verifyRecordSignature({
    record: mockRecord,
    devicePublicSigningKeySpki: deviceSpki
  });
  console.log(`Transcoded DER signature verification: verified=${sigVerifyResult.verified}`);
  if (!sigVerifyResult.verified) throw new Error("Signature verification failed!");
  console.log("Result: PASS (TC-20 Verified)");

  // Forged signature test
  const forgedRecord = { ...mockRecord, ciphertext: Buffer.from("forged_ciphertext").toString("base64") };
  const forgedResult = await verifyRecordSignature({
    record: forgedRecord,
    devicePublicSigningKeySpki: deviceSpki
  });
  console.log(`Tampered payload signature check: verified=${forgedResult.verified}`);
  if (forgedResult.verified) throw new Error("SECURITY FAILURE: Forged record signature verified!");
  console.log("Result: PASS (TC-21 Verified: Signature forgery blocked)");

  console.log(`\n======================================================`);
  console.log(`GATE 3 VERIFICATION COMPLETED IN ${Date.now() - startTime}ms`);
  console.log(`ALL 5 ADVANCED TESTS PASSED WITH 100% SUCCESS.`);
  console.log(`======================================================\n`);
}

runStage3Verification().catch(err => {
  console.error("GATE 3 VERIFICATION FAILED:", err);
  process.exit(1);
});

