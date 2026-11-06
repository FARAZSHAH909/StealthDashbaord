"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { formatFullDateTime, getAppMeta } from "@/lib/utils/formatters";
import { Search, ShieldCheck, CheckCircle2, Clock, FileSpreadsheet, Lock } from "lucide-react";

export default function SyncLogsPage() {
  const { allMessages, loading } = useFirebaseData();
  const { isUnlocked } = useKeyVault();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filtered = useMemo(() => {
    return allMessages.filter((m) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.id.toLowerCase().includes(q) ||
        m.deviceId.toLowerCase().includes(q) ||
        m.appPackage.toLowerCase().includes(q) ||
        (m.decryptedMessage && m.decryptedMessage.toLowerCase().includes(q))
      );
    });
  }, [allMessages, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const pagedRecords = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <DashboardLayout
      title="Synchronization Logs"
      subtitle="Raw immutable telemetry and payload metadata audit trail"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8696a0]" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by ID, device, app, or payload..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-[#8696a0]">
            <span>Total records: <strong className="text-white font-mono">{filtered.length}</strong></span>
            <span>Page {page} of {totalPages}</span>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-hidden rounded-2xl bg-[#111b21] border border-[#222d34] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#202c33] text-[#8696a0] font-semibold border-b border-[#222d34]">
                <tr>
                  <th className="py-3 px-4">Message ID</th>
                  <th className="py-3 px-4">Device</th>
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">Algorithm / IV</th>
                  <th className="py-3 px-4">Payload Status</th>
                  <th className="py-3 px-4">Checksum</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222d34]/60 text-slate-200">
                {pagedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#8696a0]">
                      No synchronization records found.
                    </td>
                  </tr>
                ) : (
                  pagedRecords.map((m) => {
                    const appMeta = getAppMeta(m.appPackage);
                    return (
                      <tr key={m.id} className="hover:bg-[#202c33]/40 transition">
                        <td className="py-3 px-4 font-mono text-[11px] text-emerald-400 font-medium truncate max-w-[130px]">
                          {m.id}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                          {m.deviceId}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-black/40 text-slate-300">
                            {appMeta.name}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-[#8696a0]">
                          <div>{m.encryptionAlgorithm}</div>
                          {m.nonce && <div className="text-slate-500">IV: {m.nonce.slice(0, 10)}...</div>}
                        </td>
                        <td className="py-3 px-4">
                          {m.isDecrypted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Decrypted RAM
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                              <Lock className="w-3.5 h-3.5" />
                              AES Encrypted
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[10px] text-slate-400 truncate max-w-[100px]">
                          {m.checksum ? (
                            <span className="text-emerald-400 flex items-center gap-1" title={m.checksum}>
                              <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                              {m.checksum.slice(0, 8)}...
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#8696a0] whitespace-nowrap">
                          {formatFullDateTime(m.timestamp)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-3 bg-[#111b21] border-t border-[#222d34] flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-[#202c33] text-xs text-slate-300 disabled:opacity-40 hover:bg-[#2a3942]"
            >
              Previous
            </button>
            <span className="text-xs text-[#8696a0] font-mono">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg bg-[#202c33] text-xs text-slate-300 disabled:opacity-40 hover:bg-[#2a3942]"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

