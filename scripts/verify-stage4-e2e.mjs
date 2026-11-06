import { spawn } from "child_process";
import {
  unwrapDeviceKey,
  decryptRecordWithAad,
  buildCanonicalBinaryAad,
  verifyRecordSignature
} from "../src/lib/encryption/webCrypto.js";
import { validateAndRecordSequence } from "../src/lib/utils/replayLedgerService.js";

const JAVAC_PATH = "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\javac.exe";
const JAVA_PATH = "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe";

function runJavaInterop(masterSpkiB64) {
  return new Promise((resolve, reject) => {
    // Compile
    const compile = spawn(JAVAC_PATH, ["scripts/TestAndroidCryptoInterop.java"]);
    compile.stderr.on("data", (d) => console.error("javac stderr:", d.toString()));
    compile.on("close", (code) => {
      if (code !== 0) return reject(new Error(`javac failed with code ${code}`));

      // Run
      const run = spawn(JAVA_PATH, ["-cp", "scripts", "TestAndroidCryptoInterop", masterSpkiB64]);
      let stdout = "";
      let stderr = "";
      run.stdout.on("data", (d) => (stdout += d.toString()));
      run.stderr.on("data", (d) => (stderr += d.toString()));
      run.on("close", (runCode) => {
        if (runCode !== 0) return reject(new Error(`java failed with code ${runCode}: ${stderr}`));
        const match = stdout.match(/INTEROP_JSON_START(.*?)INTEROP_JSON_END/s);
        if (!match) return reject(new Error(`Could not parse JSON from Java output: ${stdout}`));
        resolve(JSON.parse(match[1]));
      });
    });
  });
}

async function runStage4E2EVerification() {
  console.log("=== GATE 4 & 5 VERIFICATION: FULL ANDROID <-> WEB CRYPTO E2E INTEROP ===");
  const startTime = Date.now();

  // Step 1: Web Crypto generates Master RSA-3072 Keypair
  console.log("\n[TC-E2E-1] Dashboard generating Master RSA-3072 Keypair...");
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

  const spkiBytes = await globalThis.crypto.subtle.exportKey("spki", masterKeyPair.publicKey);
  const masterSpkiB64 = Buffer.from(spkiBytes).toString("base64");
  console.log(`Master Public Key SPKI generated (Base64 length: ${masterSpkiB64.length} chars)`);

  // Step 2: Android Java executes Key Generation, RSA-3072 Wrapping, GCM Encryption & EC P-256 Signing
  console.log("\n[TC-E2E-2] Android Java encrypting payload using Master Public Key & Hardware Signing...");
  const androidPayload = await runJavaInterop(masterSpkiB64);
  console.log(`Android Java generated wrapped device key length: ${androidPayload.wrapped_device_key.length} chars (384 bytes RSA-3072)`);
  console.log(`Android Java generated EC P-256 signing SPKI length: ${androidPayload.device_spki.length} chars`);
  console.log(`Android Java generated ASN.1 DER signature length: ${androidPayload.device_signature.length} chars`);
  console.log(`Android Device ID: ${androidPayload.device_id}, Seq Num: ${androidPayload.seq_num}`);
  console.log("Result: PASS (Android compilation & execution successful)");

  // Step 3 (TC-01 & TC-04): Dashboard Unwraps Android Device Key
  console.log("\n[TC-01 & TC-04] Dashboard unwrapping Android device key with Master Private Key...");
  const unwrappedDeviceKey = await unwrapDeviceKey(masterKeyPair.privateKey, androidPayload.wrapped_device_key);
  console.log(`Unwrapped key algorithm: ${unwrappedDeviceKey.algorithm.name}, length: ${unwrappedDeviceKey.algorithm.length}, extractable: ${unwrappedDeviceKey.extractable}`);
  if (unwrappedDeviceKey.algorithm.name !== "AES-GCM" || unwrappedDeviceKey.extractable !== false) {
    throw new Error("Device key unwrap verification failed");
  }
  console.log("Result: PASS (TC-01 & TC-04 Verified: Android wrapped key cleanly unwrapped into non-extractable Web Crypto key)");

  // Step 4 (TC-15): Dashboard Verifies Android Hardware EC P-256 Digital Signature
  console.log("\n[TC-15] Dashboard verifying Android ASN.1 DER digital signature with DER transcoder...");
  const sigVerifyResult = await verifyRecordSignature({
    record: androidPayload,
    devicePublicSigningKeySpki: androidPayload.device_spki
  });
  console.log(`Android digital signature verification: verified=${sigVerifyResult.verified}`);
  if (!sigVerifyResult.verified) {
    throw new Error(`Signature verification failed: ${sigVerifyResult.reason}`);
  }
  console.log("Result: PASS (TC-15 Verified: Android hardware signature verified by Web Crypto API)");

  // Step 5 (TC-22): Authoritative Replay Ledger Sequence Validation
  console.log("\n[TC-22] Dashboard verifying sequence number against Authoritative Replay Ledger...");
  const ledgerResult = await validateAndRecordSequence(androidPayload.device_id, androidPayload.seq_num);
  console.log(`Replay ledger check: accepted=${ledgerResult.accepted}, max_seen=${ledgerResult.max_seen_seq}`);
  if (!ledgerResult.accepted) {
    throw new Error(`Replay ledger check failed: ${ledgerResult.reason}`);
  }
  console.log("Result: PASS (TC-22 Verified: Monotonic sequence accepted by sliding window)");

  // Step 6 (TC-23): Decrypt Android Telemetry Message with Canonical Binary AAD
  console.log("\n[TC-23] Dashboard decrypting Android payload using unwrapped key & Binary AAD...");
  const canonicalAad = buildCanonicalBinaryAad({
    device_id: androidPayload.device_id,
    message_id: androidPayload.message_id,
    seq_num: androidPayload.seq_num,
    key_version: androidPayload.key_version,
    timestamp: androidPayload.timestamp,
    is_migration: false
  });

  const decryptResult = await decryptRecordWithAad({
    nonceBase64: androidPayload.iv,
    ciphertextBase64: androidPayload.ciphertext,
    authTagBase64: androidPayload.auth_tag,
    aadBytes: canonicalAad,
    deviceCryptoKey: unwrappedDeviceKey
  });

  console.log(`Decrypted plaintext: "${decryptResult.plaintext}"`);
  console.log(`Expected plaintext:  "${androidPayload.expected_plaintext}"`);
  if (!decryptResult.success || decryptResult.plaintext !== androidPayload.expected_plaintext) {
    throw new Error(`Decryption failed: ${decryptResult.error}`);
  }
  console.log("Result: PASS (TC-23 Verified: Plaintext matches 100% across Android & Browser)");

  // Step 7: Tamper Detection (Tampering ciphertext or signature)
  console.log("\n[TC-TAMPER] Testing tamper detection on Android payload...");
  const tamperedCiphertext = Buffer.from(androidPayload.ciphertext, "base64");
  tamperedCiphertext[5] ^= 0xff; // Flip bits
  const tamperResult = await decryptRecordWithAad({
    nonceBase64: androidPayload.iv,
    ciphertextBase64: tamperedCiphertext.toString("base64"),
    authTagBase64: androidPayload.auth_tag,
    aadBytes: canonicalAad,
    deviceCryptoKey: unwrappedDeviceKey
  });
  console.log(`Tampered ciphertext decryption: success=${tamperResult.success}, error="${tamperResult.error}"`);
  if (tamperResult.success) {
    throw new Error("SECURITY FAILURE: Tampered ciphertext was decrypted!");
  }
  console.log("Result: PASS (Cryptographic tamper protection verified)");

  console.log(`\n======================================================`);
  console.log(`GATE 4 & 5 E2E VERIFICATION COMPLETED IN ${Date.now() - startTime}ms`);
  console.log(`ALL 7 CROSS-PLATFORM INTEROP TESTS PASSED (100% SUCCESS).`);
  console.log(`======================================================\n`);
}

runStage4E2EVerification().catch(err => {
  console.error("GATE 4 & 5 VERIFICATION FAILED:", err);
  process.exit(1);
});

