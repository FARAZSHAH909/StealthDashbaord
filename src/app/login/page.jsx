"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertTriangle, KeyRound, CheckCircle2 } from "lucide-react";
import { HARDENED_ROUTES } from "@/lib/security/routesConfig";
import { sanitizeRedirectUrl } from "@/lib/security/urlSecurity";

export default function LoginPage() {
  const router = useRouter();
  const { login, sendResetPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetSent, setResetSent] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      let targetPath = HARDENED_ROUTES.OVERVIEW;
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const fromParam = params.get("from");
        if (fromParam) {
          targetPath = sanitizeRedirectUrl(fromParam, HARDENED_ROUTES.OVERVIEW);
        }
      }
      window.location.href = targetPath;
    } else {
      setError(res.error);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setError(null);
    const res = await sendResetPassword(resetEmail);
    if (res.success) {
      setResetSent(true);
      setTimeout(() => {
        setShowResetModal(false);
        setResetSent(false);
      }, 3000);
    } else {
      setError(res.error);
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
            Production Security & Encrypted Message Dashboard
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#111b21] border border-[#222d34] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-100">Administrator Sign In</h2>
            <p className="text-xs text-[#8696a0] mt-1">
              Authorized access only. All authentication attempts are monitored and rate-limited.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="admin@stealthapp.internal"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                  }}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#8696a0]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Authenticate Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Invitation Registration note */}
          <div className="mt-6 pt-5 border-t border-[#222d34] flex items-center justify-between text-xs text-[#8696a0]">
            <span>Have an Admin Invitation?</span>
            <Link
              href={HARDENED_ROUTES.GATEWAY_REGISTER}
              className="font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Redeem Secret</span>
            </Link>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 text-center text-[11px] text-[#8696a0] space-y-1">
          <p className="flex items-center justify-center gap-1.5 font-mono">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>End-to-End W3C Web Crypto API Protection</span>
          </p>
          <p>Strict RBAC • Zero-Persistence Memory Decryption</p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#111b21] border border-[#222d34] p-6 text-slate-100">
            <h3 className="text-base font-semibold text-white mb-2">Reset Password</h3>
            <p className="text-xs text-[#8696a0] mb-4">
              Enter your authorized administrator email to receive a password reset link.
            </p>

            {resetSent ? (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Password reset link sent! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@stealthapp.internal"
                  className="w-full px-3 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-3 py-1.5 text-xs text-slate-300 hover:text-white rounded-lg bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
                  >
                    Send Reset Email
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

