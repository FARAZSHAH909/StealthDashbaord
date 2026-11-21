import { NextResponse } from "next/server";
import { verifyFirebaseIdTokenStrict, createSignedSessionToken } from "@/lib/auth/sessionCrypto";

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: "idToken is required" }, { status: 400 });
    }

    // Strictly verify Firebase ID token cryptographically
    const verifiedUser = await verifyFirebaseIdTokenStrict(idToken);

    if (!verifiedUser) {
      return NextResponse.json(
        { verified: false, error: "Cryptographic token verification failed. Invalid or expired token." },
        { status: 401 }
      );
    }

    const masterEmail = (process.env.MASTER_ADMIN_EMAIL || "farazshah9095@gmail.com").toLowerCase();
    const isMaster = verifiedUser.email?.toLowerCase() === masterEmail;
    const role = verifiedUser.role || (isMaster ? "super_admin" : "admin");

    // Generate tamper-proof HMAC-signed session token
    const sessionToken = createSignedSessionToken({
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role,
      emailVerified: verifiedUser.email_verified,
    });

    const isProd = process.env.NODE_ENV === "production";

    const res = NextResponse.json({
      verified: true,
      uid: verifiedUser.uid,
      email: verifiedUser.email,
      role,
      emailVerified: verifiedUser.email_verified,
    });

    // Set standard secure session cookies
    res.cookies.set("admin_session", sessionToken, {
      httpOnly: false,
      secure: false, // compatible with localhost & tunnels
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    res.cookies.set("__Secure-AdminSession", sessionToken, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return res;
  } catch (error) {
    return NextResponse.json({ verified: false, error: error.message }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true, message: "Session terminated" });
  res.cookies.delete("admin_session");
  res.cookies.delete("__Secure-AdminSession");
  return res;
}
