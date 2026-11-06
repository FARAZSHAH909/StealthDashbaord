"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { formatFullDateTime } from "@/lib/utils/formatters";
import { Smartphone, Shield, ShieldAlert, CheckCircle2, XCircle, RefreshCw, KeyRound } from "lucide-react";

export default function DevicesPage() {
  const { devices, allMessages, loading } = useFirebaseData();
  const [revokedDevices, setRevokedDevices] = useState(new Set());

  // Aggregate device details
  const deviceList = useMemo(() => {
    return devices.map((devId) => {
      const msgs = allMessages.filter((m) => m.deviceId === devId);
      const apps = new Set(msgs.map((m) => m.appPackage));
      let lastSync = 0;
      for (const m of msgs) {
        if (m.timestamp > lastSync) lastSync = m.timestamp;
      }

      return {
        id: devId,
        messageCount: msgs.length,
        appCount: apps.size,
        apps: Array.from(apps),
        lastSync,
        isRevoked: revokedDevices.has(devId),
      };
    });
  }, [devices, allMessages, revokedDevices]);

  const toggleRevocation = (devId) => {
    setRevokedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(devId)) next.delete(devId);
      else next.add(devId);
      return next;
    });
  };

  return (
    <DashboardLayout
      title="Device Management"
      subtitle="Authorized Android hardware clients, encryption profiles, and sync status"
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Device Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <span className="text-xs text-[#8696a0]">Total Hardware Clients</span>
            <div className="text-2xl font-bold text-white font-mono mt-1">{devices.length}</div>
            <p className="text-[11px] text-emerald-400 mt-1">Authorized Android ID tokens</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <span className="text-xs text-[#8696a0]">Active / Synchronizing</span>
            <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
              {deviceList.filter((d) => !d.isRevoked).length}
            </div>
            <p className="text-[11px] text-[#8696a0] mt-1">Real-time RTDB stream</p>
          </div>
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <span className="text-xs text-[#8696a0]">Revoked Access</span>
            <div className="text-2xl font-bold text-rose-400 font-mono mt-1">
              {revokedDevices.size}
            </div>
            <p className="text-[11px] text-rose-400/80 mt-1">Access restricted</p>
          </div>
        </div>

        {/* Devices Table */}
        <div className="overflow-hidden rounded-2xl bg-[#111b21] border border-[#222d34] shadow-sm">
          <div className="p-4 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Registered Android Devices</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#111b21] text-[#8696a0] font-semibold border-b border-[#222d34]">
                <tr>
                  <th className="py-3 px-4">Device ID (Android ID)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Connected Apps</th>
                  <th className="py-3 px-4">Total Messages</th>
                  <th className="py-3 px-4">Last Sync</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#222d34]/60 text-slate-200">
                {deviceList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#8696a0]">
                      No devices registered in Firebase RTDB yet.
                    </td>
                  </tr>
                ) : (
                  deviceList.map((dev) => (
                    <tr key={dev.id} className="hover:bg-[#202c33]/40 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-100">
                        <div className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4 text-[#8696a0]" />
                          <span>{dev.id}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {dev.isRevoked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium text-[11px] bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <XCircle className="w-3 h-3" />
                            Revoked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Authorized
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#8696a0]">
                        {dev.appCount} applications
                      </td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                        {dev.messageCount} msgs
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[#8696a0] text-[11px]">
                        {formatFullDateTime(dev.lastSync)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => toggleRevocation(dev.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            dev.isRevoked
                              ? "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                              : "bg-rose-500/20 text-rose-400 hover:bg-rose-500/30"
                          }`}
                        >
                          {dev.isRevoked ? "Restore Access" : "Revoke Access"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

