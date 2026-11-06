const { initializeApp, getApps } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, collection, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForStealthApp123456789",
  authDomain: "stealthapp-50da2.firebaseapp.com",
  projectId: "stealthapp-50da2",
  storageBucket: "stealthapp-50da2.appspot.com",
};

async function testClientFirestore() {
  console.log("Testing Firestore Client SDK connection...");
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    const testDoc = doc(db, "admin_invite_tokens", "active_token");
    console.log("Reading test doc...");
    const snap = await getDoc(testDoc);
    console.log("Exists:", snap.exists());
    if (snap.exists()) {
      console.log("Data:", snap.data());
    }
  } catch (err) {
    console.error("Firestore Client error:", err.message);
  }
}

testClientFirestore();

