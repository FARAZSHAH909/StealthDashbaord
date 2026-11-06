import { NextResponse } from "next/server";
import { secureApiHandler } from "@/lib/api/secureApiHandler";
import { listSecurityAudits } from "@/lib/monitoring/securityAuditLogger";

export const GET = secureApiHandler({
  allowedMethods: ["GET"],
  requiredRole: "admin",
  handler: async () => {
    const logs = await listSecurityAudits(50);
    return NextResponse.json({ logs });
  },
});
