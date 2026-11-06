import { NextResponse } from "next/server";
import { verifyAndActivateAccount, getEnrollmentStatus } from "@/lib/auth/approvalManager";

export async function POST(request) {
  try {
    const { requestId, otp } = await request.json();

    if (!requestId || !otp) {
      return NextResponse.json({ error: "requestId and otp are required" }, { status: 400 });
    }

    const result = await verifyAndActivateAccount(requestId, otp);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestId = searchParams.get("requestId");

    if (!requestId) {
      return NextResponse.json({ error: "requestId required" }, { status: 400 });
    }

    const status = await getEnrollmentStatus(requestId);
    if (!status) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json({
      requestId: status.requestId,
      email: status.email,
      isMaster: status.isMaster,
      masterApproved: status.masterApproved,
      isVerified: status.isVerified,
      status: status.status,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

