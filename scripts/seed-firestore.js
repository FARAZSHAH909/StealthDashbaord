const { initializeApp, getApps } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");
const crypto = require("crypto");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDTu7M6XTpc9juwzZ-Z7bLEQR2sljbkOhQ",
  authDomain: "stealthapp-50da2.firebaseapp.com",
  projectId: "stealthapp-50da2",
  storageBucket: "stealthapp-50da2.firebasestorage.app",
};

async function seedFirestore() {
  console.log("🔥 Initializing Cloud Firestore Seeder for project: stealthapp-50da2...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const masterEmail = (process.env.MASTER_ADMIN_EMAIL || "farazshah9095@gmail.com").trim().toLowerCase();
  const safeMasterUid = Buffer.from(masterEmail).toString("base64").replace(/[=/+]/g, "_");

  // 1. Generate active single-use token in admin_invite_tokens
  const activeToken = "SEC-INV-" + crypto.randomBytes(12).toString("hex").toUpperCase();
  console.log(`\n1. Creating [admin_invite_tokens/active_token] with token: ${activeToken}`);
  
  try {
    await setDoc(doc(db, "admin_invite_tokens", "active_token"), {
      token: activeToken,
      created_at: Date.now(),
      expires_at: Date.now() + 60 * 60 * 1000,
      is_consumed: false,
      allowed_role: "admin",
    });
    console.log("   ✓ Success: [admin_invite_tokens] document created in Cloud Firestore!");
  } catch (err) {
    console.error("   ❌ [admin_invite_tokens] Error:", err.message);
    if (err.message.includes("permission")) {
      console.log("\n⚠️ IMPORTANT: Please publish the Firestore Security Rules in Firebase Console first!");
      console.log("👉 Go to: https://console.firebase.google.com/u/0/project/stealthapp-50da2/firestore/databases/-default-/security/rules");
    }
  }

  // 2. Create Master Admin record in admin_users
  console.log(`\n2. Creating [admin_users/${safeMasterUid}] for Master Admin: ${masterEmail}`);
  try {
    await setDoc(doc(db, "admin_users", safeMasterUid), {
      uid: safeMasterUid,
      email: masterEmail,
      displayName: "Master Security Administrator",
      role: "super_admin",
      verified: true,
      activatedAt: Date.now(),
    });
    console.log("   ✓ Success: [admin_users] document created in Cloud Firestore!");
  } catch (err) {
    console.error("   ❌ [admin_users] Error:", err.message);
  }

  // 3. Create initial structure in admin_approval_queue
  console.log(`\n3. Initializing [admin_approval_queue] collection...`);
  try {
    await setDoc(doc(db, "admin_approval_queue", "INIT_SYSTEM"), {
      requestId: "INIT_SYSTEM",
      status: "SYSTEM_INITIALIZED",
      email: masterEmail,
      timestamp: Date.now(),
    });
    console.log("   ✓ Success: [admin_approval_queue] document created in Cloud Firestore!");
  } catch (err) {
    console.error("   ❌ [admin_approval_queue] Error:", err.message);
  }

  console.log("\n🎉 Cloud Firestore Seeding process completed!");
}

seedFirestore().catch(console.error);

