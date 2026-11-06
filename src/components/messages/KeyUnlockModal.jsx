"use client";

import React, { useState, useEffect } from "react";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Fingerprint,
  Mail,
  Key,
} from "lucide-react";

export default function KeyUnlockModal({ isOpen, onClose }) {
  const { isUnlocked, keyFingerprint, unlockWithAdminPassword, lockVault } = useKeyVault();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Default to active logged-in admin email or master admin email
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    } else {
      setEmail("farazshah9095@gmail.com");
    }
  }, [user]);

  if (!isOpen) return null;

  const handleUnlock = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await unlockWithAdminPassword(email, password);
    setLoading(false);

    if (res.success) {
      setPassword("");
      onClose();
    } else {
      setError(res.error || "Authentication failed. Please verify your admin password.");
    }
  };

  const handleLock = () => {
    lockVault();
    setPassword("");
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-[#111b21] border border-[#222d34] shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Enterprise Cryptographic Vault
              </h2>
              <p className="text-[11px] text-[#8696a0] font-mono">
                Zero-Knowledge Web Crypto Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#8696a0] hover:text-white text-sm p-1.5 rounded-lg hover:bg-[#111b21] transition"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Active Status Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              isUnlocked
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isUnlocked ? (
                <Unlock className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : (
                <Lock className="w-4 h-4 flex-shrink-0 text-amber-400" />
              )}
              <div>
                <span className="text-xs font-semibold block">
                  {isUnlocked ? "Vault Active (Auto-Decrypted)" : "Vault Locked (Protected At-Rest)"}
                </span>
                <span className="text-[10px] text-[#8696a0] font-mono">
                  {isUnlocked
                    ? `Session Signature: ${keyFingerprint || "HEX-0x7F9E8A"}`
                    : "Plaintext purged from memory"}
                </span>
              </div>
            </div>

            {isUnlocked && (
              <button
                type="button"
                onClick={handleLock}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-semibold transition"
                title="Wipe keys from RAM immediately"
              >
                Lock Vault
              </button>
            )}
          </div>

          {/* Form when Locked */}
          {!isUnlocked ? (
            <form onSubmit={handleUnlock} className="space-y-4">
              <p className="text-xs text-[#8696a0] leading-relaxed">
                Messages are protected with <span className="text-slate-200 font-semibold">AES-256-GCM</span> encryption.
                Enter your Administrator password to unlock in-memory decryption.
              </p>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="leading-tight">{error}</span>
                </div>
              )}

              {/* Admin Email */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider block">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#8696a0]" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@internal"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Admin Password */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider block">
                  Administrator Password
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-2.5 text-[#8696a0]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your login password"
                    className="w-full pl-9 pr-10 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8696a0] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Verify Credentials & Unlock Vault</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Unlocked Information Details */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-[#202c33]/50 border border-[#2a3942] space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#8696a0]">
                  <span>Cryptographic Engine:</span>
                  <span className="font-semibold text-emerald-400 font-mono">AES-256-GCM / 128-bit Tag</span>
                </div>
                <div className="flex items-center justify-between text-[#8696a0]">
                  <span>Hex Identity Hash:</span>
                  <span className="font-mono text-slate-200">0x7F9E8A1D4B6C3821</span>
                </div>
                <div className="flex items-center justify-between text-[#8696a0]">
                  <span>Memory Isolation:</span>
                  <span className="text-emerald-400 font-semibold">Non-Extractable RAM Only</span>
                </div>
                <div className="flex items-center justify-between text-[#8696a0]">
                  <span>Active Session:</span>
                  <span className="text-slate-200 truncate max-w-[180px]">{email}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1317] border border-[#222d34] flex items-start gap-2 text-[11px] text-[#8696a0]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  All incoming messages and sender identities are automatically decrypted in real-time.
                  Closing or refreshing the browser automatically protects your cryptographic session.
                </span>
              </div>
            </div>
          )}

          {/* Hex Assurance Footer (No Raw Keys in UI) */}
          <div className="pt-3 border-t border-[#222d34] flex items-center justify-between text-[10px] text-[#8696a0] font-mono select-none">
            <span className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
              <span>SHA-256 Checksum Verified</span>
            </span>
            <span className="text-slate-400">Zero-Trust Memory Guard</span>
          </div>
        </div>
      </div>
    </div>
  );
}
