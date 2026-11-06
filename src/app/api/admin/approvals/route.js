import { NextResponse } from "next/server";
import {
  listAllRequests,
  approveSecondaryApplicant,
  rejectSecondaryApplicant,
} from "@/lib/auth/approvalManager";

export async function GET() {
  try {
    const list = await listAllRequests();
    return NextResponse.json({ requests: list });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json({ error: "requestId is required" }, { status: 400 });
    }

    if (action === "approve") {
      const res = await approveSecondaryApplicant(requestId);
      return NextResponse.json(res);
    }

    if (action === "reject") {
      const res = await rejectSecondaryApplicant(requestId);
      return NextResponse.json(res);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

