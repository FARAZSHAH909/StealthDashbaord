/**
 * SECURE CLOUD INVITE TOKEN INSPECTOR & ROTATOR
 *
 * Usage:
 *   npm run get-invite-token
 *   node scripts/get-invite-token.js --rotate
 */

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, getDoc, setDoc } = require("firebase/firestore");
const crypto = require("crypto");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDTu7M6XTpc9juwzZ-Z7bLEQR2sljbkOhQ",
  authDomain: "stealthapp-50da2.firebaseapp.com",
  projectId: "stealthapp-50da2",
  storageBucket: "stealthapp-50da2.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const TOKEN_TTL_MS = 60 * 60 * 1000;

function generateRandomToken() {
  const bytes = crypto.randomBytes(12).toString("hex").toUpperCase();
  return `SEC-INV-${bytes}`;
}

async function main() {
  const isRotate = process.argv.includes("--rotate");

  console.log("☁️  Accessing Cloud Firestore Security Token Vault...");
  console.log("📡 Cloud Target: Cloud Firestore (default) -> admin_invite_tokens/active_token");

  const tokenRef = doc(db, "admin_invite_tokens", "active_token");
  let tokenData = null;

  try {
    const snap = await getDoc(tokenRef);
    if (snap.exists()) {
      tokenData = snap.data();
    }
  } catch (err) {
    console.error("Firestore read error:", err.message);
  }

  const now = Date.now();

  if (isRotate || !tokenData || tokenData.is_consumed || (tokenData.expires_at && now > tokenData.expires_at)) {
    const newToken = generateRandomToken();
    tokenData = {
      token: newToken,
      created_at: now,
      expires_at: now + TOKEN_TTL_MS,
      is_consumed: false,
      allowed_role: "admin",
    };
    await setDoc(tokenRef, tokenData);
    console.log("🔄 Generated and saved NEW rolling token to Cloud Firestore!\n");
  }

  const remainingMin = Math.max(0, Math.round((tokenData.expires_at - now) / 60000));

  console.log("══════════════════════════════════════════════════════════════");
  console.log(`  🔑 ACTIVE SINGLE-USE INVITE KEY (Cloud Firestore):`);
  console.log(`     \x1b[32m\x1b[1m${tokenData.token}\x1b[0m`);
  console.log("══════════════════════════════════════════════════════════════");
  console.log(`  ⏳ Status:       Active & Ready in Cloud Firestore`);
  console.log(`  🕒 Expiration:   ~${remainingMin} minutes remaining`);
  console.log(`  🛡️ Single-Use:   Will be auto-deleted & rotated upon registration`);
  console.log("══════════════════════════════════════════════════════════════\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
