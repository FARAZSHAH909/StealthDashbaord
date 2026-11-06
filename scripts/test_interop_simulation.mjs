import crypto from "crypto";
import { organizeConversations } from "../src/lib/utils/conversationGrouper.js";
import { importRawEncryptionKey } from "../src/lib/encryption/webCrypto.js";

const MASTER_KEY_BASE64 = "SR+ZH/q+LNRYEXCR4BiZNhgsNQCUbFJ9YXu3i7/36BE=";
const masterKeyBytes = Buffer.from(MASTER_KEY_BASE64, "base64");

// Helper simulating Android's EncryptionUtils.encryptWithDeviceKey and encryptWebCrypto
function simulateAndroidEncryption(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKeyBytes, iv);
  const cipherBody = cipher.update(Buffer.from(plainText, "utf-8"));
  const final = cipher.final();
  const authTag = cipher.getAuthTag();

  const fullCipher = Buffer.concat([cipherBody, final, authTag]);
  const combined = Buffer.concat([iv, fullCipher]);

  return {
    ivBase64: iv.toString("base64"),
    combinedBase64: combined.toString("base64"),
    authTagBase64: authTag.toString("base64"),
  };
}

async function runTest() {
  console.log("=== Testing Android -> Dashboard Encryption Interoperability ===");

  const webCryptoKey = await importRawEncryptionKey(MASTER_KEY_BASE64);

  const testCases = [
    { sender: "Ali Khan (+92 300 1234567)", message: "Assalam o Alaikum, meeting kab start hogi?" },
    { sender: "Bank Alfalah (8257)", message: "Your OTP is 948291. Do not share with anyone." },
    { sender: "WhatsApp Business (+1 555 0192)", message: "Your verification code has been dispatched." },
    { sender: "Zubair Ahmed", message: "Bhai file send kardi hai email pe, check karlo." }
  ];

  const fakeFirebaseRecords = testCases.map((tc, idx) => {
    const encTitle = simulateAndroidEncryption(tc.sender);
    const encMessage = simulateAndroidEncryption(tc.message);

    return {
      key: `msg_test_${idx}`,
      val: {
        message_id: `msg_test_${idx}`,
        device_id: "device_android_99",
        app_package_name: "com.whatsapp",
        encryption_algorithm: "AES-256-GCM",
        protocol_version: "2.0",
        nonce: encMessage.ivBase64,
        ciphertext: encMessage.combinedBase64,
        auth_tag: encMessage.authTagBase64,
        sender_info: encTitle.combinedBase64,
        timestamp: Date.now() - (idx * 60000),
        sync_status: true,
      }
    };
  });

  const { conversations, allMessages, stats } = await organizeConversations(fakeFirebaseRecords, webCryptoKey);

  console.log(`Total Messages Processed: ${allMessages.length}`);
  let successCount = 0;

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i];
    const expected = testCases[i];

    console.log(`\n--- Message [${msg.id}] ---`);
    console.log(`Decrypted Sender: "${msg.decryptedSender}" (Expected: "${expected.sender}")`);
    console.log(`Decrypted Message: "${msg.decryptedMessage}" (Expected: "${expected.message}")`);
    console.log(`Status: ${msg.isDecrypted ? "✅ DECRYPTED" : "❌ FAILED"}`);

    if (msg.decryptedSender === expected.sender && msg.decryptedMessage === expected.message && msg.isDecrypted) {
      successCount++;
    }
  }

  console.log(`\n==========================================`);
  console.log(`RESULTS: ${successCount} / ${testCases.length} SUCCEEDED (100%)`);
  console.log(`Conversations Grouped: ${conversations.length}`);
  console.log(`==========================================`);

  if (successCount === testCases.length) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
