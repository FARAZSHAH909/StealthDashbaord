const admin = require("firebase-admin");

async function testAdminFirestore() {
  console.log("Testing Admin Firestore...");
  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: "stealthapp-50da2"
      });
    }
    const db = admin.firestore();
    const docRef = db.collection("admin_invite_tokens").doc("active_token");
    const docSnap = await docRef.get();
    console.log("Admin Firestore get success! Exists:", docSnap.exists);
  } catch (err) {
    console.error("Admin Firestore error:", err.message);
  }
}

testAdminFirestore();

