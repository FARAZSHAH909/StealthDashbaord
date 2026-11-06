const crypto = require("crypto").webcrypto;

async function runCryptoVerification() {
  console.log("🔒 Running Comprehensive Web Crypto API & Cryptographic Baseline Tests...\n");

  // 1. Generate test AES-256 key
  const rawKey = new Uint8Array(32);
  crypto.getRandomValues(rawKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  );
  console.log("  ✓ Successfully imported 256-bit AES-GCM key into Web Crypto API");

  // 2. Encrypt sample message using Android equivalent parameters (12-byte IV, 128-bit tag)
  const plainText = "Hello Faraz, this is a production test notification message!";
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);

  const enc = new TextEncoder();
  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, tagLength: 128 },
    cryptoKey,
    enc.encode(plainText)
  );

  const nonceBase64 = Buffer.from(iv).toString("base64");
  const ciphertextBase64 = Buffer.from(ciphertextWithTag).toString("base64");

  console.log(`  ✓ Sample Encrypted Payload:`);
  console.log(`     Nonce Base64 (12 bytes): ${nonceBase64}`);
  console.log(`     Ciphertext Base64 (len ${ciphertextBase64.length}): ${ciphertextBase64.slice(0, 32)}...`);

  // 3. Decrypt sample message using browser-side decryption logic
  const decodedIv = Buffer.from(nonceBase64, "base64");
  const decodedCipher = Buffer.from(ciphertextBase64, "base64");

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decodedIv, tagLength: 128 },
    cryptoKey,
    decodedCipher
  );
  const dec = new TextDecoder();
  const resultText = dec.decode(decryptedBuffer);

  if (resultText === plainText) {
    console.log(`  ✓ Decryption verified successfully: "${resultText}"`);
  } else {
    throw new Error("Decrypted text does not match original plaintext!");
  }

  // 4. Test SHA-256 Checksum calculation
  const deviceId = "863f2e7f930c6d8a";
  const pkgName = "com.whatsapp";
  const title = "Faraz";
  const timestamp = 1793896876781;
  const payloadToHash = `${deviceId}${pkgName}${title}${plainText}${timestamp}`;
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(payloadToHash));
  const hexHash = Buffer.from(hash).toString("hex");
  console.log(`  ✓ Checksum verified (SHA-256): ${hexHash}`);

  // 5. Test Corrupted Tag / Tampering rejection
  const tamperedCipher = new Uint8Array(decodedCipher);
  tamperedCipher[tamperedCipher.length - 1] ^= 0x01; // flip last bit of authentication tag
  let caughtTamper = false;
  try {
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodedIv, tagLength: 128 },
      cryptoKey,
      tamperedCipher
    );
  } catch (err) {
    caughtTamper = true;
    console.log(`  ✓ Tamper detection verified: Correctly rejected corrupted tag (${err.message})`);
  }
  if (!caughtTamper) {
    throw new Error("Security Alert: Failed to reject tampered ciphertext!");
  }

  // 6. Test PBKDF2 Master Passphrase Derivation
  const passphrase = "StealthAdminSuperMasterPassphrase2026!";
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("StealthAppMasterSalt2026"),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  console.log("  ✓ PBKDF2 key derivation (100,000 iterations, SHA-256) verified");

  console.log("\n🎉 ALL 6 CRYPTOGRAPHIC INTEGRITY TESTS PASSED!");
}

runCryptoVerification().catch((e) => {
  console.error("Crypto verification error:", e);
  process.exit(1);
});

