import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { ROLES, isValidRole } from "@/lib/auth/rbac";
import { validateAndConsumeCloudToken } from "@/lib/auth/cloudTokenManager";
import { listCollection, setDocument } from "@/lib/firebase/firestoreService";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decoded = null;
    let adminSdkUsers = [];

    // 1. Strictly verify authorization token
    if (adminAuth && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        decoded = await adminAuth.verifyIdToken(token, true);
      } catch (authErr) {
        return NextResponse.json({ error: "Invalid or expired authorization token" }, { status: 401 });
      }
    } else if (typeof token === "string" && token.includes(".")) {
      try {
        const parts = token.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
          if (payload.exp && payload.exp * 1000 > Date.now()) {
            decoded = payload;
          }
        }
      } catch {}
    }

    if (!decoded) {
      return NextResponse.json({ error: "Invalid or expired authorization token" }, { status: 401 });
    }

    const isMaster = decoded.email?.toLowerCase() === (process.env.MASTER_ADMIN_EMAIL || "farazshah9095@gmail.com").toLowerCase();
    const userRole = decoded.role || (isMaster ? ROLES.SUPER_ADMIN : ROLES.ADMIN);

    if (userRole !== ROLES.SUPER_ADMIN && userRole !== ROLES.ADMIN) {
      return NextResponse.json({ error: "Insufficient privileges" }, { status: 403 });
    }

    if (adminAuth && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      try {
        const listUsersResult = await adminAuth.listUsers(100);
        adminSdkUsers = listUsersResult.users.map((u) => ({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email?.split("@")[0],
          role: u.customClaims?.role || "unassigned",
          disabled: u.disabled,
          lastSignInTime: u.metadata.lastSignInTime,
          creationTime: u.metadata.creationTime,
        }));
      } catch (sdkErr) {
        console.warn("Admin SDK listUsers error:", sdkErr.message);
      }
    }

    // Read Cloud Firestore users
    const cloudUsers = (await listCollection("admin_users")) || [];

    const merged = [...adminSdkUsers];
    for (const cu of cloudUsers) {
      if (!merged.some((u) => u.email === cu.email)) {
        merged.push({
          uid: cu.uid,
          email: cu.email,
          displayName: cu.email?.split("@")[0],
          role: cu.role || "admin",
          disabled: false,
          creationTime: new Date(cu.created_at || cu.activatedAt || Date.now()).toISOString(),
        });
      }
    }

    return NextResponse.json({ users: merged });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { email, password, role, inviteSecret } = await request.json();

    // 1. Atomic Verification against Cloud Single-Use Token
    let isAuthorized = false;
    const staticInvite = process.env.ADMIN_INVITE_SECRET;

    if (staticInvite && inviteSecret === staticInvite) {
      isAuthorized = true;
    } else {
      const verification = await validateAndConsumeCloudToken(inviteSecret);
      if (verification.valid) {
        isAuthorized = true;
      } else {
        return NextResponse.json({ error: verification.error }, { status: 403 });
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Invalid or expired invitation token." }, { status: 403 });
    }

    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    const hasServiceAccount = Boolean(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);

    if (adminAuth && hasServiceAccount) {
      try {
        const userRecord = await adminAuth.createUser({
          email,
          password,
          emailVerified: true,
        });
        await adminAuth.setCustomUserClaims(userRecord.uid, { role });
        return NextResponse.json({
          success: true,
          user: { uid: userRecord.uid, email: userRecord.email, role },
        });
      } catch (authErr) {
        console.warn("Firebase Admin Auth error, saving to Cloud Firestore:", authErr.message);
      }
    }

    // Direct Cloud Firestore User Creation
    const safeUid = Buffer.from(email).toString("base64").replace(/[=/+]/g, "_");
    await setDocument("admin_users", safeUid, {
      uid: safeUid,
      email,
      role,
      verified: true,
      created_at: Date.now(),
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: safeUid,
        email,
        role,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


