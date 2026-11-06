import { NextResponse } from "next/server";
import { setDocument, getDocument } from "@/lib/firebase/firestoreService";

export async function POST(request) {
  try {
    const { publicManifest, privateVault } = await request.json();

    if (!publicManifest || !privateVault) {
      return NextResponse.json({ error: "Missing vault manifests" }, { status: 400 });
    }

    // Check if already initialized
    const existing = await getDocument("system_security", "master_public_key");
    if (existing && existing.public_key_spki) {
      // If already exists, return conflict to prevent accidental overwrite
      return NextResponse.json({ error: "Master key vault is already initialized" }, { status: 409 });
    }

    await setDocument("system_security", "master_public_key", publicManifest);
    await setDocument("system_security", "master_private_vault", privateVault);

    return NextResponse.json({
      success: true,
      message: "Master Key Vault initialized successfully",
      fingerprint: publicManifest.fingerprint_sha256
    });
  } catch (error) {
    console.error("Vault init error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

