import { firestore } from "./client.js";
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  updateDoc as fsUpdateDoc,
} from "firebase/firestore";
import admin from "./admin.js";

const RTDB_URL = process.env.FIREBASE_DATABASE_URL || "https://stealthapp-50da2-default-rtdb.firebaseio.com";

/**
 * Returns true if admin SDK is initialized with a service account.
 */
function hasAdminCredentials() {
  return Boolean(
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY &&
    admin &&
    admin.apps.length
  );
}

/**
 * Get a single document from Cloud Firestore.
 */
export async function getDocument(colName, docId) {
  // 1. Try Firebase Admin SDK if credentials exist
  if (hasAdminCredentials()) {
    try {
      const snap = await admin.firestore().collection(colName).doc(docId).get();
      if (snap.exists) return snap.data();
    } catch (e) {
      console.warn(`[FirestoreService:Admin] getDocument(${colName}/${docId}) error:`, e.message);
    }
  }

  // 2. Try Firestore Client SDK
  try {
    const docRef = doc(firestore, colName, docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
    return null;
  } catch (err) {
    console.warn(`[FirestoreService:Client] getDocument(${colName}/${docId}) warning:`, err.message);
    // Resilient fallback to RTDB if rules not published yet
    try {
      const res = await fetch(`${RTDB_URL}/${colName}/${docId}.json`, { cache: "no-store" });
      return await res.json();
    } catch (e) {
      return null;
    }
  }
}

/**
 * Set (create or overwrite) a document in Cloud Firestore.
 */
export async function setDocument(colName, docId, data) {
  let savedToFirestore = false;

  // 1. Try Firebase Admin SDK if credentials exist
  if (hasAdminCredentials()) {
    try {
      await admin.firestore().collection(colName).doc(docId).set(data);
      savedToFirestore = true;
    } catch (e) {
      console.warn(`[FirestoreService:Admin] setDocument(${colName}/${docId}) error:`, e.message);
    }
  }

  // 2. Try Firestore Client SDK
  if (!savedToFirestore) {
    try {
      const docRef = doc(firestore, colName, docId);
      await setDoc(docRef, data);
      savedToFirestore = true;
      console.log(`☁️ [Cloud Firestore] Successfully saved ${colName}/${docId}`);
    } catch (err) {
      console.warn(`⚠️ [Cloud Firestore] Notice for ${colName}/${docId}:`, err.message);
    }
  }

  // Dual-sync to RTDB for high-availability backup
  try {
    await fetch(`${RTDB_URL}/${colName}/${docId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch (e) {}

  return data;
}

/**
 * Update specific fields in a document in Cloud Firestore.
 */
export async function updateDocument(colName, docId, updates) {
  let updatedInFirestore = false;

  if (hasAdminCredentials()) {
    try {
      await admin.firestore().collection(colName).doc(docId).update(updates);
      updatedInFirestore = true;
    } catch (e) {}
  }

  if (!updatedInFirestore) {
    try {
      const docRef = doc(firestore, colName, docId);
      await fsUpdateDoc(docRef, updates);
      updatedInFirestore = true;
    } catch (err) {
      // If doc doesn't exist yet, do setDoc
      try {
        const existing = (await getDocument(colName, docId)) || {};
        await setDocument(colName, docId, { ...existing, ...updates });
        updatedInFirestore = true;
      } catch (e) {}
    }
  }

  // Update RTDB backup
  try {
    await fetch(`${RTDB_URL}/${colName}/${docId}.json`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  } catch (e) {}

  return updates;
}

/**
 * List all documents in a collection from Cloud Firestore.
 */
export async function listCollection(colName) {
  // 1. Try Firebase Admin SDK
  if (hasAdminCredentials()) {
    try {
      const snap = await admin.firestore().collection(colName).get();
      const list = [];
      snap.forEach((d) => list.push(d.data()));
      if (list.length > 0) return list;
    } catch (e) {}
  }

  // 2. Try Firestore Client SDK
  try {
    const colRef = collection(firestore, colName);
    const snap = await getDocs(colRef);
    const list = [];
    snap.forEach((d) => list.push(d.data()));
    if (list.length > 0) return list;
  } catch (err) {
    console.warn(`[FirestoreService] listCollection(${colName}) warning:`, err.message);
  }

  // 3. Fallback to RTDB
  try {
    const res = await fetch(`${RTDB_URL}/${colName}.json`, { cache: "no-store" });
    const data = await res.json();
    if (!data) return [];
    return Object.values(data);
  } catch (e) {
    return [];
  }
}

/**
 * Delete a document from Cloud Firestore.
 */
export async function deleteDocument(colName, docId) {
  if (hasAdminCredentials()) {
    try {
      await admin.firestore().collection(colName).doc(docId).delete();
    } catch (e) {}
  }

  try {
    const docRef = doc(firestore, colName, docId);
    await deleteDoc(docRef);
  } catch (e) {}

  try {
    await fetch(`${RTDB_URL}/${colName}/${docId}.json`, { method: "DELETE" });
  } catch (e) {}

  return true;
}

