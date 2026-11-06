import {
  generateEmergencyRecoverySeed,
  createMasterVault,
  unlockMasterVaultWithPassphrase,
  recoverMasterVaultWithSeed,
  deriveKeyPbkdf2
} from "../src/lib/encryption/masterVaultService.js";
import { mnemonicToEntropy } from "../src/lib/encryption/bip39.js";

async function runStage1Verification() {
  console.log("=== GATE 1 VERIFICATION: MASTER VAULT & DISASTER RECOVERY ===");
  const startTime = Date.now();

  // Test 1: Generate 24-word recovery seed
  console.log("\n[TC-TEST-1] Generating 24-word BIP-39 Emergency Recovery Seed...");
  const recoverySeed = await generateEmergencyRecoverySeed();
  const words = recoverySeed.trim().split(/\s+/);
  console.log(`Generated seed words count: ${words.length}`);
  if (words.length !== 24) {
    throw new Error(`Expected 24 words, got ${words.length}`);
  }
  const entropy = await mnemonicToEntropy(recoverySeed);
  console.log(`BIP-39 entropy verified (length: ${entropy.length} bytes). Seed phrase: ${words.slice(0, 4).join(" ")} ... ${words.slice(-4).join(" ")}`);
  console.log("Result: PASS");

  // Test 2: PBKDF2 Benchmark & Create Master Vault (RSA-3072 + Dual Containers)
  console.log("\n[TC-TEST-2] Benchmarking PBKDF2 (600,000 iterations) & Creating Master Vault...");
  const testPassphrase = "SuperSecureEnterpriseAdminPassphrase2026!#*";
  
  const pbkdf2Start = Date.now();
  const testSalt = new Uint8Array(16);
  crypto.getRandomValues(testSalt);
  await deriveKeyPbkdf2(testPassphrase, testSalt, "BENCHMARK_TEST");
  const pbkdf2Duration = Date.now() - pbkdf2Start;
  console.log(`PBKDF2-HMAC-SHA256 (600,000 iters) single derivation time: ${pbkdf2Duration}ms`);

  const vaultGenStart = Date.now();
  const { publicManifest, privateVault, publicFingerprint } = await createMasterVault(
    testPassphrase,
    recoverySeed,
    1
  );
  const vaultGenDuration = Date.now() - vaultGenStart;
  console.log(`Total Master Vault creation time (RSA-3072 + 2x PBKDF2-600k + AES-GCM): ${vaultGenDuration}ms`);
  console.log(`Master Public Key Fingerprint (SHA-256): ${publicFingerprint}`);
  console.log(`Algorithm: ${publicManifest.algorithm}, Hash: ${publicManifest.hash}, MGF: ${publicManifest.mgf}`);
  console.log(`Public SPKI Base64 length: ${publicManifest.public_key_spki.length} chars`);
  console.log(`Container A Salt: ${privateVault.container_passphrase.salt.length} chars, IV: ${privateVault.container_passphrase.iv.length} chars`);
  console.log(`Container B Salt: ${privateVault.container_recovery.salt.length} chars, IV: ${privateVault.container_recovery.iv.length} chars`);
  console.log("Result: PASS");

  // Test 3 (TC-08): Passphrase Unlock
  console.log("\n[TC-08] Unlocking Master Vault with Valid Passphrase...");
  const unlockResult = await unlockMasterVaultWithPassphrase(testPassphrase, privateVault);
  if (!unlockResult.privateKey) {
    throw new Error("Failed to unlock master private key with valid passphrase");
  }
  console.log(`Unlocked key type: ${unlockResult.privateKey.type}, algorithm: ${unlockResult.privateKey.algorithm.name}, extractable: ${unlockResult.privateKey.extractable}`);
  if (unlockResult.privateKey.extractable !== false) {
    throw new Error("Private key MUST NOT be extractable in memory!");
  }
  console.log("Result: PASS (TC-08 Verified)");

  // Test 4 (TC-09): Wrong Passphrase Failure
  console.log("\n[TC-09] Testing Vault Unlock with INCORRECT Passphrase...");
  let wrongPassphraseRejected = false;
  try {
    await unlockMasterVaultWithPassphrase("WrongPassword123!", privateVault);
  } catch (err) {
    console.log(`Expected rejection caught: "${err.message}"`);
    wrongPassphraseRejected = true;
  }
  if (!wrongPassphraseRejected) {
    throw new Error("SECURITY FAILURE: Master vault unlocked with incorrect passphrase!");
  }
  console.log("Result: PASS (TC-09 Verified)");

  // Test 5: Key Non-extractability Check
  console.log("\n[TC-SECURITY-MEM] Verifying Web Crypto Key Non-Extractability in RAM...");
  let exportPrevented = false;
  try {
    await crypto.subtle.exportKey("pkcs8", unlockResult.privateKey);
  } catch (err) {
    console.log(`Key export successfully blocked: "${err.message}"`);
    exportPrevented = true;
  }
  if (!exportPrevented) {
    throw new Error("SECURITY FAILURE: Non-extractable key was exported!");
  }
  console.log("Result: PASS (Memory Isolation Verified)");

  // Test 6 (TC-14): Recovery Seed Unlock and Passphrase Reset
  console.log("\n[TC-14] Testing Disaster Recovery Seed Unlock & Passphrase Re-encryption...");
  const newPassphrase = "BrandNewAdminMasterPassphrase2026!Updated#";
  const recoveryResult = await recoverMasterVaultWithSeed(recoverySeed, privateVault, newPassphrase);
  
  if (!recoveryResult.privateKey || recoveryResult.privateKey.extractable !== false) {
    throw new Error("Recovery failed to return a non-extractable private key");
  }
  console.log("Master private key recovered successfully via BIP-39 24-word seed.");
  
  const updatedVault = recoveryResult.updatedVaultDoc;
  console.log("Verifying updated Container A unlocks with new passphrase...");
  const newUnlockResult = await unlockMasterVaultWithPassphrase(newPassphrase, updatedVault);
  if (!newUnlockResult.privateKey) {
    throw new Error("Failed to unlock updated vault with new passphrase");
  }
  console.log("New passphrase unlock: SUCCESS");

  console.log("Verifying old passphrase no longer works on updated vault...");
  let oldPassphraseRejected = false;
  try {
    await unlockMasterVaultWithPassphrase(testPassphrase, updatedVault);
  } catch (err) {
    console.log(`Old passphrase rejected as expected: "${err.message}"`);
    oldPassphraseRejected = true;
  }
  if (!oldPassphraseRejected) {
    throw new Error("SECURITY FAILURE: Old passphrase still unlocked updated vault!");
  }
  console.log("Result: PASS (TC-14 Verified)");

  // Test 7: Invalid Recovery Seed Rejected
  console.log("\n[TC-SECURITY-RECOV] Verifying Tampered/Invalid BIP-39 Recovery Phrase Rejection...");
  const wordsCopy = [...words];
  wordsCopy[0] = wordsCopy[0] === "abandon" ? "ability" : "abandon";
  const corruptedSeed = wordsCopy.join(" ");
  let invalidSeedRejected = false;
  try {
    await recoverMasterVaultWithSeed(corruptedSeed, privateVault, "AnotherPass123!");
  } catch (err) {
    console.log(`Corrupted seed rejected: "${err.message}"`);
    invalidSeedRejected = true;
  }
  if (!invalidSeedRejected) {
    throw new Error("SECURITY FAILURE: Corrupted recovery seed was accepted!");
  }
  console.log("Result: PASS (Checksum & Seed Integrity Verified)");

  console.log(`\n======================================================`);
  console.log(`GATE 1 VERIFICATION COMPLETED IN ${Date.now() - startTime}ms`);
  console.log(`ALL 7 TESTS PASSED WITH 100% SUCCESS.`);
  console.log(`======================================================\n`);
}

runStage1Verification().catch(err => {
  console.error("GATE 1 VERIFICATION FAILED:", err);
  process.exit(1);
});

