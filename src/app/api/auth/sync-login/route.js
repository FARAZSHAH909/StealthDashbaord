import { NextResponse } from "next/server";
import { getDocument } from "@/lib/firebase/firestoreService";
import { isMasterEmail } from "@/lib/auth/approvalManager";
import globalRateLimiter from "@/lib/auth/rateLimiter";

function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "127.0.0.1";
}

export async function POST(request) {
  const ip = getClientIp(request);

  // Rate Limiting Guard (Mitigates brute-force credential stuffing)
  const lockStatus = globalRateLimiter.isLocked(ip);
  if (lockStatus.locked) {
    return NextResponse.json(
      {
        provisioned: false,
        error: `Too many authentication attempts. IP address is temporarily blocked for ${lockStatus.remainingSeconds} seconds.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(lockStatus.remainingSeconds) },
      }
    );
  }

  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      globalRateLimiter.recordFailure(ip);
      return NextResponse.json({ provisioned: false, error: "Missing email or password" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const safeUid = Buffer.from(cleanEmail).toString("base64").replace(/[=/+]/g, "_");

    // 1. Check if user is registered in Cloud Firestore admin_users or is Master Admin
    const userDoc = await getDocument("admin_users", safeUid);
    const isMaster = isMasterEmail(cleanEmail);

    if (!userDoc && !isMaster) {
      globalRateLimiter.recordFailure(ip);
      return NextResponse.json({ provisioned: false, error: "User is not authorized in admin database." }, { status: 403 });
    }

    // 2. Provision account in Firebase Authentication (Strict environment variable resolution)
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { provisioned: false, error: "Firebase API configuration missing from server environment." },
        { status: 500 }
      );
    }

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
        globalRateLimiter.recordFailure(ip);
        return NextResponse.json({ provisioned: false, error: "EMAIL_EXISTS" }, { status: 409 });
      }
      globalRateLimiter.recordFailure(ip);
      return NextResponse.json({ provisioned: false, error: signUpData.error.message }, { status: 400 });
    }

    globalRateLimiter.recordSuccess(ip);
    return NextResponse.json({ provisioned: true, uid: signUpData.localId });
  } catch (error) {
    globalRateLimiter.recordFailure(ip);
    return NextResponse.json({ provisioned: false, error: error.message }, { status: 500 });
  }
}
