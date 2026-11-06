"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAuth } from "@/lib/auth/AuthContext";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Terminal,
  Server,
} from "lucide-react";

export default function SecurityActivityPage() {
  const { user, role } = useAuth();
  const { isUnlocked, keyFingerprint, lockVault } = useKeyVault();
  const [rateMetrics, setRateMetrics] = useState({ totalTracked: 0, currentlyLocked: 0 });

  useEffect(() => {
    fetch("/api/auth/progressive-lockout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "metrics", identifier: "system" }),
    })
      .then((r) => r.json())
      .then((data) => setRateMetrics(data))
      .catch(() => {});
  }, []);

  return (
    <DashboardLayout
      title="Security & Audit Console"
      subtitle="Cryptographic enforcement, session controls, and progressive brute-force shield"
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Top security status cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <span className="text-xs text-[#8696a0]">Decryption Vault State</span>
            <div className="flex items-center gap-2 mt-2">
              {isUnlocked ? (
                <>
                  <Unlock className="w-5 h-5 text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-400 font-mono">UNLOCKED</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-bold text-amber-400 font-mono">LOCKED</span>
                </>
              )}
            </div>
            <p className="text-[11px] text-[#8696a0] mt-1 font-mono">
              {isUnlocked ? `Fingerprint: ${keyFingerprint}` : "Plaintext protected in RAM"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <span className="text-xs text-[#8696a0]">Progressive Brute-Force Shield</span>
            <div className="flex items-center gap-2 mt-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-lg font-bold text-white font-mono">
                {rateMetrics.currentlyLocked} Locked
              </span>
            </div>
            <p className="text-[11px] text-[#8696a0] mt-1 font-mono">
              {rateMetrics.totalTracked} IPs / emails monitored
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <span className="text-xs text-[#8696a0]">Content Security Policy</span>
            <div className="flex items-center gap-2 mt-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="text-lg font-bold text-emerald-400 font-mono">STRICT CSP</span>
            </div>
            <p className="text-[11px] text-[#8696a0] mt-1 font-mono">
              anti-clickjack, nosniff, frame-ancestors none
            </p>
          </div>
        </div>

        {/* Security Controls & Policies */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Cryptographic Policies */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Cryptographic Baseline Enforcement</span>
            </h3>
            <p className="text-xs text-[#8696a0] mb-4">
              Hardware-matched parameters between Android KeyStore and Web Crypto API:
            </p>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#0c1317] border border-[#222d34] flex items-center justify-between">
                <span className="text-slate-300">Cipher Transformation</span>
                <span className="text-emerald-400 font-semibold">AES/GCM/NoPadding (256-bit)</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c1317] border border-[#222d34] flex items-center justify-between">
                <span className="text-slate-300">Initialization Vector (IV)</span>
                <span className="text-emerald-400 font-semibold">12-Byte Unique Nonce</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c1317] border border-[#222d34] flex items-center justify-between">
                <span className="text-slate-300">Authentication Tag</span>
                <span className="text-emerald-400 font-semibold">128-bit W3C SubtleCrypto</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c1317] border border-[#222d34] flex items-center justify-between">
                <span className="text-slate-300">Data Integrity Checksum</span>
                <span className="text-emerald-400 font-semibold">SHA-256 Digest Validation</span>
              </div>
              <div className="p-3 rounded-xl bg-[#0c1317] border border-[#222d34] flex items-center justify-between">
                <span className="text-slate-300">Zero-Persistence Policy</span>
                <span className="text-emerald-400 font-semibold">100% RAM Only (No Disk)</span>
              </div>
            </div>
          </div>

          {/* Emergency Memory Flush & Session Termination */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Memory Sanitation & Session Controls</span>
              </h3>
              <p className="text-xs text-[#8696a0] mb-4">
                Instantly purges decrypted plaintext buffers and cryptographic keys from browser memory.
              </p>

              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300 space-y-2">
                <p>
                  Clicking <strong>Purge Memory Vault</strong> immediately destroys the transient
                  CryptoKey handle in JavaScript closure and triggers garbage collection.
                </p>
                <p className="text-[11px] text-[#8696a0]">
                  Active Admin Session: <strong>{user?.email}</strong> ({role || "admin"})
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-[#222d34] flex justify-end gap-3">
              <button
                onClick={lockVault}
                className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold transition"
              >
                Purge Memory Vault Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

