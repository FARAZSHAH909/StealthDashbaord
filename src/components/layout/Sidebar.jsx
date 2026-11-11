"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import {
  LayoutDashboard,
  MessageSquare,
  MessagesSquare,
  Smartphone,
  Layers,
  FileSpreadsheet,
  BarChart3,
  ShieldCheck,
  Users,
  LogOut,
  KeyRound,
  Lock,
  Unlock,
  DownloadCloud,
} from "lucide-react";
import { HARDENED_ROUTES, REVERSE_ROUTE_MAP } from "@/lib/security/routesConfig";

const NAV_ITEMS = [
  { label: "Overview", href: HARDENED_ROUTES.OVERVIEW, icon: LayoutDashboard },
  { label: "Messages (Chat)", href: HARDENED_ROUTES.MESSAGES, icon: MessageSquare },
  { label: "Conversations", href: HARDENED_ROUTES.CONVERSATIONS, icon: MessagesSquare },
  { label: "Devices", href: HARDENED_ROUTES.DEVICES, icon: Smartphone },
  { label: "Applications", href: HARDENED_ROUTES.APPLICATIONS, icon: Layers },
  { label: "App Releases", href: HARDENED_ROUTES.APP_UPDATES, icon: DownloadCloud },
  { label: "Sync Logs", href: HARDENED_ROUTES.SYNC_LOGS, icon: FileSpreadsheet },
  { label: "Analytics", href: HARDENED_ROUTES.ANALYTICS, icon: BarChart3 },
  { label: "Security Activity", href: HARDENED_ROUTES.SECURITY, icon: ShieldCheck },
  { label: "Admin Users", href: HARDENED_ROUTES.USERS, icon: Users },
];

export default function Sidebar({ isOpen, onClose, onOpenKeyModal }) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();
  const { isUnlocked, keyFingerprint, lockVault } = useKeyVault();

  const handleLogout = async () => {
    lockVault(); // Purge transient key
    await logout();
    window.location.href = HARDENED_ROUTES.GATEWAY_LOGIN;
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#111b21] border-r border-[#222d34] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-[#222d34] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                STEALTH<span className="text-emerald-400">ADMIN</span>
              </h1>
              <span className="text-[10px] text-[#8696a0] font-mono tracking-wider">
                AES-256 VAULT
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white p-1 text-sm"
          >
            ✕
          </button>
        </div>

        {/* In-Memory Key Vault Quick Status Pill */}
        <div className="p-3 border-b border-[#222d34]">
          <div
            onClick={onOpenKeyModal}
            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
              isUnlocked
                ? "bg-emerald-950/30 border-emerald-600/30 hover:bg-emerald-950/50"
                : "bg-amber-950/30 border-amber-600/30 hover:bg-amber-950/50"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Decryption Vault
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  isUnlocked
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {isUnlocked ? "UNLOCKED" : "LOCKED"}
              </span>
            </div>
            <p className="text-[10px] text-[#8696a0] truncate font-mono">
              {isUnlocked
                ? `Key FP: ${keyFingerprint}`
                : "Click to enter AES-256 Key"}
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              REVERSE_ROUTE_MAP[pathname] === item.href ||
              pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-[#202c33] text-emerald-400 border border-emerald-500/20 font-semibold shadow-xs"
                    : "text-[#8696a0] hover:text-slate-100 hover:bg-[#202c33]/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : "text-[#8696a0]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & Logout */}
        <div className="p-3 border-t border-[#222d34] bg-[#0c1317]/50">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#202c33]/40 border border-[#222d34]">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.email || "Admin"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] px-1.5 py-0.2 rounded font-mono uppercase bg-emerald-500/20 text-emerald-400 font-semibold">
                  {role || "Admin"}
                </span>
                <span className="text-[9px] text-[#8696a0]">Verified</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
              title="Logout & Purge Memory"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

