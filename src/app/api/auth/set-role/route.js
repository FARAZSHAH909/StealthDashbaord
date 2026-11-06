import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { isValidRole, ROLES } from "@/lib/auth/rbac";
import { validateAndConsumeCloudToken } from "@/lib/auth/cloudTokenManager";

export async function POST(request) {
  try {
    const { uid, role, inviteSecret, adminToken } = await request.json();

    if (!uid || !role) {
      return NextResponse.json({ error: "UID and role are required." }, { status: 400 });
    }

    if (!isValidRole(role)) {
      return NextResponse.json({ error: "Invalid role specified." }, { status: 400 });
    }

    if (!adminAuth) {
      return NextResponse.json(
        { error: "Firebase Admin SDK is not configured. Please supply service account credentials." },
        { status: 503 }
      );
    }

    let isAuthorized = false;

    // 1. Authorize via Cloud Single-Use Invitation Token
    if (inviteSecret) {
      const staticInvite = process.env.ADMIN_INVITE_SECRET;
      if (staticInvite && inviteSecret === staticInvite) {
        isAuthorized = true;
      } else {
        const verification = await validateAndConsumeCloudToken(inviteSecret);
        if (verification.valid) {
          isAuthorized = true;
        }
      }
    }

    // 2. Authorize via existing Super Admin caller token
    if (!isAuthorized && adminToken) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(adminToken);
        if (decodedToken.role === ROLES.SUPER_ADMIN) {
          isAuthorized = true;
        }
      } catch (tokenErr) {
        return NextResponse.json({ error: "Invalid admin authorization token." }, { status: 401 });
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Admin role assignment requires Super Admin authorization or a valid invitation secret." },
        { status: 403 }
      );
    }

    // Set custom claims
    await adminAuth.setCustomUserClaims(uid, { role });

    return NextResponse.json({
      success: true,
      message: `Role ${role} successfully granted to user ${uid}.`,
    });
  } catch (error) {
    console.error("Error setting custom claims:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

