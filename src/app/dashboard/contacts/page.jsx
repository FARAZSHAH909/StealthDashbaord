"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useContactsVault } from "@/hooks/useContactsVault";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { formatFullDateTime } from "@/lib/utils/formatters";
import {
  Contact,
  Users,
  Search,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Lock,
  Unlock,
  KeyRound,
  Copy,
  Smartphone,
  Phone,
  UserCheck,
} from "lucide-react";

export default function ContactsVaultPage() {
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const { contactsList, stats, loading, error } = useContactsVault(selectedDeviceId || null);
  const { isUnlocked, openModal } = useKeyVault();

  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState("all"); // 'all' | 'active' | 'deleted'
  const [copiedId, setCopiedId] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const copyToClipboard = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = useMemo(() => {
    return contactsList.filter((item) => {
      // 1. Filter by Tab
      if (filterTab === "active" && item.isDeleted) return false;
      if (filterTab === "deleted" && !item.isDeleted) return false;

      // 2. Filter by Search Query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.id.toLowerCase().includes(q) ||
        item.deviceId.toLowerCase().includes(q) ||
        item.decryptedName.toLowerCase().includes(q) ||
        item.decryptedPhoneNumber.toLowerCase().includes(q)
      );
    });
  }, [contactsList, filterTab, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedRecords = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <DashboardLayout
      title="Contacts Telemetry Directory"
      subtitle="Client address book synchronization with persistent tombstone deletion tracking"
    >
      <div className="p-4 sm:p-6 space-y-5">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Total Contacts */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Contact className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#8696a0] uppercase tracking-wider">Total Contacts</p>
              <h3 className="text-xl font-bold text-white font-mono">{stats.total}</h3>
            </div>
          </div>

          {/* Active on Phone */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#8696a0] uppercase tracking-wider">Active on Phone</p>
              <h3 className="text-xl font-bold text-emerald-400 font-mono">{stats.active}</h3>
            </div>
          </div>

          {/* Tombstone Deleted Contacts */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-rose-900/30 bg-rose-950/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-rose-300 uppercase tracking-wider">Deleted by User</p>
              <h3 className="text-xl font-bold text-rose-400 font-mono">{stats.deleted}</h3>
            </div>
          </div>

          {/* Registered Devices */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-[#8696a0] uppercase tracking-wider">Connected Devices</p>
              <h3 className="text-xl font-bold text-amber-400 font-mono">{stats.devices.length}</h3>
            </div>
          </div>
        </div>

        {/* Vault Decryption Warning Banner if Locked */}
        {!isUnlocked && (
          <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-600/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-amber-300 text-xs">
              <Lock className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="block font-semibold">Master Key Vault is Locked</strong>
                <span>Contact names and phone numbers are encrypted in memory. Unlock your vault to decrypt and view records.</span>
              </div>
            </div>
            <button
              onClick={openModal}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 flex items-center gap-1.5 transition"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Unlock Decryption Vault
            </button>
          </div>
        )}

        {/* Search, Filter Tabs & Device Selector */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
          {/* Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: "all", label: `All (${stats.total})` },
              { id: "active", label: `Active (${stats.active})` },
              { id: "deleted", label: `Deleted (${stats.deleted})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setFilterTab(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1 text-xs font-medium rounded-xl whitespace-nowrap transition ${
                  filterTab === tab.id
                    ? tab.id === "deleted"
                      ? "bg-rose-500/20 border border-rose-500/40 text-rose-300"
                      : "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                    : "text-[#8696a0] hover:text-white hover:bg-[#202c33]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Device Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-44 px-3 py-1.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Devices ({stats.devices.length})</option>
                {stats.devices.map((dev) => (
                  <option key={dev} value={dev}>
                    {dev.substring(0, 16)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8696a0]" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, phone, device..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Contacts Table */}
        <div className="overflow-hidden rounded-2xl bg-[#111b21] border border-[#222d34] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#202c33] text-[#8696a0] font-semibold border-b border-[#222d34]">
                <tr>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Status / Deletion</th>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Last Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222d34]/60 text-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#8696a0]">
                      Loading encrypted contacts vault...
                    </td>
                  </tr>
                ) : pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#8696a0]">
                      No contacts found matching criteria.
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((c) => {
                    const initial = c.decryptedName ? c.decryptedName.charAt(0).toUpperCase() : "?";
                    return (
                      <tr
                        key={`${c.deviceId}-${c.id}`}
                        className={`hover:bg-[#202c33]/40 transition ${
                          c.isDeleted ? "bg-rose-950/5" : ""
                        }`}
                      >
                        {/* Contact Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 border border-emerald-500/30 text-xs">
                              {initial}
                            </div>
                            <div>
                              <div className="text-white font-semibold text-xs flex items-center gap-1.5">
                                {c.decryptedName}
                              </div>
                              {c.isDecrypted && (
                                <span className="text-[9px] text-emerald-400/80 flex items-center gap-1">
                                  <ShieldCheck className="w-2.5 h-2.5" />
                                  AES-256-GCM Decrypted
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone Number with Action */}
                        <td className="py-3 px-4 font-mono text-xs">
                          <div className="flex items-center gap-2 group">
                            <span className="text-slate-200 font-medium">{c.decryptedPhoneNumber}</span>
                            <button
                              onClick={() => copyToClipboard(c.decryptedPhoneNumber, `phone-${c.id}`)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-emerald-400 text-[#8696a0] transition"
                              title="Copy number"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                            {copiedId === `phone-${c.id}` && (
                              <span className="text-[9px] text-emerald-400">Copied</span>
                            )}
                          </div>
                        </td>

                        {/* Status / Tombstone Indicator */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {c.isDeleted ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <Trash2 className="w-3 h-3" />
                                DELETED BY USER
                              </span>
                              {c.deletedAt > 0 && (
                                <span className="text-[9px] text-rose-400/80 font-mono pl-1">
                                  {formatFullDateTime(c.deletedAt)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Active on Device
                            </span>
                          )}
                        </td>

                        {/* Device ID */}
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-[#8696a0]" />
                            {c.deviceId.substring(0, 14)}...
                          </div>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-4 text-[#8696a0] text-[11px] whitespace-nowrap">
                          {formatFullDateTime(c.timestamp)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3 px-4 bg-[#202c33]/50 border-t border-[#222d34] flex items-center justify-between text-xs text-[#8696a0]">
            <div>
              Showing <strong className="text-white">{pagedRecords.length}</strong> of{" "}
              <strong className="text-white">{filtered.length}</strong> contacts
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg bg-[#202c33] border border-[#2a3942] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a3942] text-white"
              >
                Previous
              </button>
              <span className="px-2">Page {page} of {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg bg-[#202c33] border border-[#2a3942] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#2a3942] text-white"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
