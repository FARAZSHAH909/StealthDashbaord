import { NextResponse } from "next/server";
import rateLimiter from "@/lib/auth/rateLimiter";

export async function POST(request) {
  try {
    const { action, identifier } = await request.json();

    if (action === "reset_all" || action === "reset") {
      if (identifier) {
        rateLimiter.recordSuccess(cleanId);
      } else {
        rateLimiter.resetAll();
      }
      return NextResponse.json({ cleared: true, message: "Lockout reset successfully." });
    }

    if (!identifier) {
      return NextResponse.json({ error: "Identifier is required" }, { status: 400 });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    if (action === "check") {
      const lockStatus = rateLimiter.isLocked(cleanId);
      return NextResponse.json(lockStatus);
    }

    if (action === "fail") {
      const maxAttempts = parseInt(process.env.PROGRESSIVE_LOCKOUT_MAX_ATTEMPTS || "5", 10);
      const lockMinutes = parseInt(process.env.PROGRESSIVE_LOCKOUT_DURATION_MINUTES || "15", 10);
      const res = rateLimiter.recordFailure(cleanId, maxAttempts, lockMinutes);
      return NextResponse.json(res);
    }

    if (action === "success") {
      rateLimiter.recordSuccess(cleanId);
      return NextResponse.json({ cleared: true });
    }

    if (action === "metrics") {
      const metrics = rateLimiter.getMetrics();
      return NextResponse.json(metrics);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

