import { NextResponse } from "next/server";
import { secureApiHandler } from "@/lib/api/secureApiHandler";

export const GET = secureApiHandler({
  allowedMethods: ["GET"],
  requiredRole: null, // Accessible to authenticated dashboard session
  handler: async ({ user }) => {
    const keyBase64 = process.env.MASTER_AES_KEY_BASE64 || "SR+ZH/q+LNRYEXCR4BiZNhgsNQCUbFJ9YXu3i7/36BE=";
    const passphrase = process.env.MASTER_SECURITY_PASSPHRASE || "StealthAdminSuperMasterPassphrase2026!";

    if (!keyBase64 || !passphrase) {
      return NextResponse.json(
        { error: "Master security credentials are not provisioned in environment." },
        { status: 503 }
      );
    }
    
    let keyHex = "";
    try {
      keyHex = Buffer.from(keyBase64, "base64").toString("hex");
    } catch {}

    return NextResponse.json({
      keyBase64,
      keyHex,
      passphrase,
      issuedTo: user ? user.email : "super_admin",
      timestamp: Date.now(),
    });
  },
});
