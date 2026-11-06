import admin from "firebase-admin";

const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://stealthapp-50da2-default-rtdb.firebaseio.com";
const projectId = process.env.FIREBASE_PROJECT_ID || "stealthapp-50da2";

if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
        databaseURL,
      });
    } else {
      // Initialize with application default or project ID for local/emulator operations
      admin.initializeApp({
        projectId,
        databaseURL,
      });
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
  }
}

export const adminAuth = admin.apps.length ? admin.auth() : null;
export const adminDatabase = admin.apps.length ? admin.database() : null;
export const adminFirestore = admin.apps.length ? admin.firestore() : null;
export default admin;

