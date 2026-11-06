"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { getAppMeta, getInitials, formatFullDateTime } from "@/lib/utils/formatters";
import { Search, MessagesSquare, ArrowRight, Smartphone, Filter } from "lucide-react";
import Link from "next/link";

export default function ConversationsPage() {
  const { conversations, loading } = useFirebaseData();
  const { isUnlocked } = useKeyVault();
  const [search, setSearch] = useState("");
  const [selectedApp, setSelectedApp] = useState("all");

  const filtered = useMemo(() => {
    return conversations.filter((c) => {
      if (selectedApp !== "all" && c.appPackage !== selectedApp) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        c.senderName.toLowerCase().includes(q) ||
        c.deviceId.toLowerCase().includes(q) ||
        c.appPackage.toLowerCase().includes(q)
      );
    });
  }, [conversations, search, selectedApp]);

  return (
    <DashboardLayout
      title="Conversations Directory"
      subtitle="Organized conversation threads grouped by sender and application context"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8696a0]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations by sender or device..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-[#8696a0]">
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

