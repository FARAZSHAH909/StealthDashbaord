import { NextResponse } from "next/server";
import { validateAndConsumeCloudToken } from "@/lib/auth/cloudTokenManager";
import { createEnrollmentRequest } from "@/lib/auth/approvalManager";

export async function POST(request) {
  try {
    const { email, password, role, inviteSecret } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // 1. Verify single-use invite key
    const verification = await validateAndConsumeCloudToken(inviteSecret);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 403 });
    }

    // 2. Create Gatekeeper Enrollment Request
    const enrollment = await createEnrollmentRequest({
      email,
      password,
      role: verification.role || role,
    });

    return NextResponse.json({
      success: true,
      requestId: enrollment.requestId,
      email: enrollment.email,
      isMaster: enrollment.isMaster,
      nextStep: enrollment.nextStep,
      // For Master email development convenience, verification code is also logged and returned
      devOtpHint: enrollment.isMaster ? enrollment.verificationToken : null,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

