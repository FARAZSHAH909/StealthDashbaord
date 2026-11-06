import { NextResponse } from "next/server";
import { getDocument } from "@/lib/firebase/firestoreService";
import { isMasterEmail } from "@/lib/auth/approvalManager";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ provisioned: false, error: "Missing email or password" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const safeUid = Buffer.from(cleanEmail).toString("base64").replace(/[=/+]/g, "_");

    // 1. Check if user is registered in Cloud Firestore admin_users or is Master Admin
    const userDoc = await getDocument("admin_users", safeUid);
    const isMaster = isMasterEmail(cleanEmail);

    if (!userDoc && !isMaster) {
      return NextResponse.json({ provisioned: false, error: "User is not authorized in admin database." });
    }

    // 2. Provision account in Firebase Authentication
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDTu7M6XTpc9juwzZ-Z7bLEQR2sljbkOhQ";
    const signUpRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: cleanEmail,
        password,
        returnSecureToken: true,
      }),
    });

    const signUpData = await signUpRes.json();

    if (signUpData.error) {
      if (signUpData.error.message === "EMAIL_EXISTS") {
        // If account exists, the password in Firebase Auth was different
        return NextResponse.json({ provisioned: false, error: "EMAIL_EXISTS" });
      }
      return NextResponse.json({ provisioned: false, error: signUpData.error.message });
    }

    console.log(`✓ Auto-provisioned Firebase Authentication user for verified admin ${cleanEmail}`);
    return NextResponse.json({ provisioned: true, uid: signUpData.localId });
  } catch (error) {
    return NextResponse.json({ provisioned: false, error: error.message }, { status: 500 });
  }
}

