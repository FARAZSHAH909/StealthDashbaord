import { NextResponse } from "next/server";
import { setDocument } from "@/lib/firebase/firestoreService";

export async function POST(request) {
  try {
    const { updatedVaultDoc } = await request.json();

    if (!updatedVaultDoc) {
      return NextResponse.json({ error: "Missing updated vault document" }, { status: 400 });
    }

    await setDocument("system_security", "master_private_vault", updatedVaultDoc);

    return NextResponse.json({
      success: true,
      message: "Master Key Vault updated successfully"
    });
  } catch (error) {
    console.error("Vault update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

