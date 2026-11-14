import { NextResponse } from "next/server";
import { secureApiHandler } from "@/lib/api/secureApiHandler";
import {
  listAllRequests,
  approveSecondaryApplicant,
  rejectSecondaryApplicant,
} from "@/lib/auth/approvalManager";

export const GET = secureApiHandler({
  allowedMethods: ["GET"],
  requiredRole: "super_admin",
  handler: async () => {
    const list = await listAllRequests();
    return NextResponse.json({ requests: list });
  },
});

export const POST = secureApiHandler({
  allowedMethods: ["POST"],
  requiredRole: "super_admin",
  handler: async ({ body }) => {
    const { action, requestId } = body || {};

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
  },
});

