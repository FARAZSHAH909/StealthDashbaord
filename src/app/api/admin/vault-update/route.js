import { NextResponse } from "next/server";
import { secureApiHandler } from "@/lib/api/secureApiHandler";
import { setDocument } from "@/lib/firebase/firestoreService";

export const POST = secureApiHandler({
  allowedMethods: ["POST"],
  requiredRole: "super_admin",
  handler: async ({ body }) => {
    const { updatedVaultDoc } = body || {};

    if (!updatedVaultDoc) {
      return NextResponse.json({ error: "Missing updated vault document" }, { status: 400 });
    }

    await setDocument("system_security", "master_private_vault", updatedVaultDoc);

    return NextResponse.json({
      success: true,
      message: "Master Key Vault updated successfully",
    });
  },
});

