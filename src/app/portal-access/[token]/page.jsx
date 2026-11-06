"use client";

import React, { useState, use } from "react";
import { notFound, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { ShieldCheck, Lock, Mail, ArrowRight, KeyRound, CheckCircle2, ShieldAlert } from "lucide-react";

const VALID_PORTAL_TOKEN = process.env.NEXT_PUBLIC_PORTAL_ACCESS_TOKEN || "sec_master_portal_2026";

export default function TokenGatedPortalPage({ params }) {
  const resolvedParams = use(params);
  const token = resolvedParams?.token;

  // Immediate gating: if token does not match, return 404 Not Found
  if (token !== VALID_PORTAL_TOKEN) {
    notFound();
  }

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
      router.push("/dashboard/overview");
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
          <div className="flex items-center justify-center gap-1.5 mt-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-[11px] text-emerald-400 font-mono font-medium">
              Zero Trust Protected Gateway • Token Gated
            </p>
          </div>
        </div>

        {/* Login Box */}
        <div className="bg-[#111b21] border border-[#222d34] rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Administrator Access</h2>
            <p className="text-xs text-[#8696a0] mt-1">
              Authenticate with your approved enterprise credentials.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-3">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Admin Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@enterprise.internal"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#0c1317] border border-[#222d34] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Mail className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-[#0c1317] border border-[#222d34] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-[#8696a0] absolute left-3.5 top-3" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all duration-200"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Password Reset Modal */}
        {showResetModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-sm rounded-2xl bg-[#111b21] border border-[#222d34] p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Reset Password</h3>
                  <p className="text-xs text-[#8696a0]">Receive a recovery link via email.</p>
                </div>
              </div>

              {resetSent ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Password reset email has been dispatched.</span>
                </div>
              ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter registered email address"
                    required
                    className="w-full px-3 py-2 text-xs bg-[#0c1317] border border-[#222d34] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg"
                    >
                      Send Link
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
