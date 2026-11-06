"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert, Clock, CheckCircle2, ArrowRight, RefreshCw, Mail } from "lucide-react";
import Link from "next/link";

function PendingApprovalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestId = searchParams.get("requestId");
  const email = searchParams.get("email");

  const [status, setStatus] = useState("PENDING");
  const [masterApproved, setMasterApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!requestId) return;

    // Poll status every 3 seconds
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/verify-token?requestId=${requestId}`);
        const data = await res.json();
        if (data.masterApproved) {
          setMasterApproved(true);
          setStatus("APPROVED");
        } else if (data.status === "REJECTED") {
          setStatus("REJECTED");
        }
      } catch (e) {}
    }, 3000);

    return () => clearInterval(interval);
  }, [requestId]);

  return (
    <div className="min-h-screen bg-[#0c1317] flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md">
        <div className="bg-[#111b21] border border-[#222d34] rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
          {masterApproved ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-white">Master Admin Permission Granted!</h2>
              <p className="text-xs text-[#8696a0] leading-relaxed">
                The Master Administrator has approved your access request for{" "}
                <strong className="text-emerald-400">{email}</strong>.
                A verification token has been issued.
              </p>

              <button
                onClick={() => router.push(`/verify-email?requestId=${requestId}&email=${encodeURIComponent(email || "")}`)}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg transition"
              >
                <span>Enter Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : status === "REJECTED" ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-rose-400">Request Declined</h2>
              <p className="text-xs text-[#8696a0] leading-relaxed">
                The Master Administrator has rejected this enrollment request. Access is denied.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Back to Sign In
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-white">Awaiting Master Permission</h2>
              <p className="text-xs text-[#8696a0] leading-relaxed">
                Secondary account detected. Access cannot proceed until the <strong>Master Administrator</strong> approves your registration.
              </p>

              <div className="p-3.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-left text-xs space-y-1.5 font-mono">
                <div><span className="text-[#8696a0]">Applicant:</span> <span className="text-slate-200">{email}</span></div>
                <div><span className="text-[#8696a0]">Session:</span> <span className="text-emerald-400">{requestId}</span></div>
                <div><span className="text-[#8696a0]">Status:</span> <span className="text-amber-400">PENDING MASTER APPROVAL</span></div>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#8696a0] pt-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Checking for Master approval automatically...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0c1317]" />}>
      <PendingApprovalContent />
    </Suspense>
  );
}

