"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, KeyRound, ArrowRight, AlertTriangle, CheckCircle2 } from "lucide-react";
import { ROLES } from "@/lib/auth/rbac";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState(ROLES.ADMIN);
  const [inviteSecret, setInviteSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long with uppercase, lowercase, and symbols.");
      return;
    }

    if (!inviteSecret.trim()) {
      setError("An authorized Invitation Secret is strictly required.");
      return;
    }

    setLoading(true);

    try {
      // Submit enrollment to Gatekeeper API
      const res = await fetch("/api/auth/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
          inviteSecret: inviteSecret.trim(),
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        throw new Error(data.error || "Failed to process enrollment.");
      }

      setSuccess(true);
      setTimeout(() => {
        if (data.nextStep === "verify-email") {
          router.push(`/verify-email?requestId=${data.requestId}&email=${encodeURIComponent(data.email)}`);
        } else {
          router.push(`/pending-approval?requestId=${data.requestId}&email=${encodeURIComponent(data.email)}`);
        }
      }, 1000);
    } catch (err) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0c1317] flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-3 shadow-lg shadow-emerald-500/5">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            STEALTH<span className="text-emerald-400">ADMIN</span>
          </h1>
          <p className="text-xs text-[#8696a0] mt-1 font-mono">
            Authorized Administrator Enrollment
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#111b21] border border-[#222d34] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100">Redeem Admin Invitation</h2>
            <p className="text-xs text-[#8696a0] mt-1">
              Public registration is disabled. You must provide a pre-authorized invitation secret.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Account created successfully!</p>
                <p className="text-[11px] mt-0.5">Redirecting to login portal...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Invitation Secret Token
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-3 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  value={inviteSecret}
                  onChange={(e) => setInviteSecret(e.target.value)}
                  placeholder="Paste admin invitation secret"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#8696a0]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Desired RBAC Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value={ROLES.ADMIN}>Admin (Read/Write, Manage Devices, Key Vault)</option>
                <option value={ROLES.SUPER_ADMIN}>Super Admin (Full Platform Control)</option>
                <option value={ROLES.READ_ONLY}>Read-Only (View & Decrypt Only)</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 chars"
                  className="w-full px-3 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Provisioning Account...</span>
                </>
              ) : (
                <>
                  <span>Create Authorized Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#222d34] text-center text-xs text-[#8696a0]">
            <span>Already have an account? </span>
            <Link href="/login" className="font-semibold text-emerald-400 hover:text-emerald-300">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

