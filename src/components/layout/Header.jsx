"use client";

import React from "react";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { KeyRound, Lock, Unlock, Shield, Menu, Radio, Smartphone } from "lucide-react";

export default function Header({
  title = "Overview",
  subtitle,
  devices = [],
  selectedDeviceId,
  onSelectDevice,
  onOpenKeyModal,
  onToggleSidebar,
}) {
  const { isUnlocked, keyFingerprint } = useKeyVault();

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#111b21] border-b border-[#222d34] flex items-center justify-between z-20">
      {/* Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-[#202c33]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>{title}</span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE RTDB
            </span>
          </h2>
          {subtitle && <p className="text-xs text-[#8696a0] hidden sm:block">{subtitle}</p>}
        </div>
      </div>

      {/* Controls: Device selector & Vault button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Device selector */}
        {devices.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#202c33] border border-[#2a3942] text-xs">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400 hidden sm:inline" />
            <select
              value={selectedDeviceId || "all"}
              onChange={(e) => onSelectDevice(e.target.value === "all" ? null : e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-[#111b21]">All Devices ({devices.length})</option>
              {devices.map((d) => (
                <option key={String(d)} value={String(d)} className="bg-[#111b21]">
                  Device: {String(d).slice(0, 10)}...
                </option>
              ))}
            </select>
          </div>
        )}

        {/* In-Memory Key Vault pill */}
        <button
          onClick={onOpenKeyModal}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-xs ${
            isUnlocked
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
          }`}
          title="Click to manage transient in-memory AES-256 decryption key"
        >
          {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">
            {isUnlocked ? `Vault Active (${keyFingerprint})` : "Key Vault Locked"}
          </span>
          <span className="sm:hidden">{isUnlocked ? "Unlocked" : "Lock"}</span>
        </button>
      </div>
    </header>
  );
}

