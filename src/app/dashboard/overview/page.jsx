"use client";

import React, { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { getAppMeta } from "@/lib/utils/formatters";
import {
  MessageSquare,
  MessagesSquare,
  Smartphone,
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  TrendingUp,
  ShieldCheck,
  KeyRound,
  ArrowUpRight,
  DownloadCloud,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { HARDENED_ROUTES } from "@/lib/security/routesConfig";

export default function OverviewPage() {
  const { rawRecords, conversations, allMessages, devices, applications, loading, error } = useFirebaseData();
  const { isUnlocked } = useKeyVault();
  const { production: appProd, staging: appStaging } = useAppUpdate();

  // Compute actual metrics from live Firebase records
  const metrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let synced = 0;
    let pending = 0;
    let failed = 0;
    let today = 0;
    let thisWeek = 0;
    let thisMonth = 0;

    for (const msg of allMessages) {
      if (msg.syncStatus === true) synced++;
      else if (msg.syncStatus === false) pending++;
      else failed++;

      const ts = msg.timestamp;
      if (ts >= startOfToday) today++;
      if (ts >= startOfWeek) thisWeek++;
      if (ts >= startOfMonth) thisMonth++;
    }

    return {
      totalMessages: allMessages.length,
      totalConversations: conversations.length,
      totalDevices: devices.length,
      totalApps: applications.length,
      synced,
      pending,
      failed,
      today,
      thisWeek,
      thisMonth,
    };
  }, [allMessages, conversations, devices, applications]);

  // Hourly message activity today (0-23)
  const hourlyActivity = useMemo(() => {
    const buckets = Array(24).fill(0);
    const today = new Date();
    const todayDateStr = today.toDateString();

    for (const msg of allMessages) {
      const d = new Date(Number(msg.timestamp));
      if (d.toDateString() === todayDateStr) {
        buckets[d.getHours()]++;
      }
    }
    const max = Math.max(...buckets, 1);
    return { buckets, max };
  }, [allMessages]);

  return (
    <DashboardLayout
      title="System Overview"
      subtitle="Real-time monitoring and encryption status for connected devices"
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Real-time Banner / Notice */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Featured Dual Android App Telemetry (Production & Staging Read-Only Monitor) */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#111b21] via-[#15232c] to-[#111b21] border border-[#222d34] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/10">
              <DownloadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Android App Telemetry</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[10px] flex items-center gap-1">
                  🔒 Read-Only
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px]">
                  Live RTDB Sync
                </span>
              </div>

              {/* Dual Environment Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                <div className="p-2.5 rounded-xl bg-[#0b141a] border border-emerald-500/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-emerald-400 block font-semibold">● Updated App (Prod)</span>
                    <span className="text-xs font-bold text-white truncate block">
                      v{appProd?.version_name || "—"} <span className="text-[#8696a0] font-normal font-mono">(Build {appProd?.version_code ?? "—"})</span>
                    </span>
                  </div>
                  {appProd?.apk_url && (
                    <a
                      href={appProd.apk_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] hover:text-emerald-400 transition"
                      title="Download Production APK"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-[#0b141a] border border-indigo-500/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono text-indigo-400 block font-semibold">● App Updated Staging</span>
                    <span className="text-xs font-bold text-white truncate block">
                      v{appStaging?.version_name || "—"} <span className="text-[#8696a0] font-normal font-mono">(Build {appStaging?.version_code ?? "—"})</span>
                    </span>
                  </div>
                  {appStaging?.apk_url && (
                    <a
                      href={appStaging.apk_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-[#8696a0] hover:text-indigo-400 transition"
                      title="Download Staging APK"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto flex-shrink-0">
            <Link
              href={HARDENED_ROUTES.APP_UPDATES}
              className="w-full lg:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-white text-xs font-semibold border border-[#2a3942] shadow-md transition cursor-pointer"
            >
              <span>Inspect All Values</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>
        </div>

        {/* 10 Required Metric Cards (Section 8) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Total Messages */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Total Messages</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{metrics.totalMessages}</div>
            <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Captured records</span>
            </div>
          </div>

          {/* 2. Total Conversations */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Conversations</span>
              <MessagesSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{metrics.totalConversations}</div>
            <div className="text-[10px] text-[#8696a0] mt-1">Organized threads</div>
          </div>

          {/* 3. Registered Devices */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Registered Devices</span>
              <Smartphone className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{metrics.totalDevices}</div>
            <div className="text-[10px] text-blue-400 mt-1">Hardware clients</div>
          </div>

          {/* 4. Connected Applications */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Connected Apps</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono">{metrics.totalApps}</div>
            <div className="text-[10px] text-purple-400 mt-1">Active packages</div>
          </div>

          {/* 5. Successfully Synchronized */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Synced to Cloud</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">{metrics.synced}</div>
            <div className="text-[10px] text-[#8696a0] mt-1">Real-time status</div>
          </div>

          {/* 6. Pending Synchronization */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Pending Sync</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 font-mono">{metrics.pending}</div>
            <div className="text-[10px] text-[#8696a0] mt-1">Local SQLCipher queue</div>
          </div>

          {/* 7. Failed Synchronization */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Failed Sync</span>
              <AlertCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400 font-mono">{metrics.failed}</div>
            <div className="text-[10px] text-[#8696a0] mt-1">Network retry buffer</div>
          </div>

          {/* 8. Messages Today */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Received Today</span>
              <Calendar className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-2xl font-bold text-teal-400 font-mono">{metrics.today}</div>
            <div className="text-[10px] text-[#8696a0] mt-1">Today's capture</div>
          </div>

          {/* 9. Messages This Week */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Received This Week</span>
              <Calendar className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-400 font-mono">{metrics.thisWeek}</div>
            <div className="text-[10px] text-[#8696a0] mt-1">Trailing 7 days</div>
          </div>

          {/* 10. Messages This Month */}
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8696a0] mb-2">
              <span className="text-xs font-medium">Received This Month</span>
              <Calendar className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-indigo-400 font-mono">{metrics.thisMonth}</div>
            <div className="text-[10px] text-[#8696a0] mt-1">Monthly total</div>
          </div>
        </div>

        {/* Charts & Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart 1: Daily Activity Histogram */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Daily Message Activity</h3>
                <p className="text-xs text-[#8696a0]">Hourly distribution of messages received today</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-[#202c33] text-emerald-400 font-mono">
                {metrics.today} msgs
              </span>
            </div>

            {/* Custom Responsive SVG/HTML Bar Chart */}
            <div className="h-44 flex items-end gap-1.5 pt-4 pb-2 border-b border-[#222d34]">
              {hourlyActivity.buckets.map((count, hour) => {
                const heightPercent = Math.max((count / hourlyActivity.max) * 100, 6);
                return (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-7 hidden group-hover:flex px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-white font-mono whitespace-nowrap z-10">
                      {hour}:00 — {count} msgs
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        count > 0 ? "bg-emerald-500 group-hover:bg-emerald-400" : "bg-[#202c33]"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#8696a0] font-mono mt-2 px-1">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </div>

          {/* Chart 2: Messages by Application */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-white">Messages by Application</h3>
                  <p className="text-xs text-[#8696a0]">Captured package frequency</p>
                </div>
              </div>

              <div className="space-y-3">
                {applications.length === 0 ? (
                  <p className="text-xs text-[#8696a0]">No application activity logged yet.</p>
                ) : (
                  applications.map((app) => {
                    const meta = getAppMeta(app.pkg);
                    const percentage = Math.round((app.count / Math.max(metrics.totalMessages, 1)) * 100);
                    return (
                      <div key={app.pkg} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-200 font-medium truncate max-w-[170px]">
                            {meta.name}
                          </span>
                          <span className="text-[#8696a0] font-mono">
                            {app.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#202c33] overflow-hidden">
                          <div
                            style={{ width: `${percentage}%` }}
                            className={`h-full rounded-full ${meta.color}`}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-[#222d34] mt-4 flex items-center justify-between">
              <span className="text-[11px] text-[#8696a0]">Quick Messenger Access</span>
              <Link
                href="/dashboard/messages"
                className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
              >
                <span>Open Chat</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Devices & Active Conversations Quick Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Registered Devices Card */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span>Connected Devices ({devices.length})</span>
              </h3>
              <Link
                href="/dashboard/devices"
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Manage Devices
              </Link>
            </div>

            <div className="space-y-2.5">
              {devices.map((devId) => {
                const count = allMessages.filter((m) => m.deviceId === devId).length;
                return (
                  <div
                    key={devId}
                    className="p-3 rounded-xl bg-[#202c33]/60 border border-[#2a3942] flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-mono font-medium text-slate-200">
                        {devId}
                      </p>
                      <p className="text-[10px] text-[#8696a0] mt-0.5">
                        Hardware Keystore • AES-256 GCM
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-semibold text-emerald-400">
                        {count} msgs
                      </span>
                      <p className="text-[9px] text-[#8696a0] mt-0.5">Active</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Vault Security Card */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Browser-Side Decryption Vault</span>
                </h3>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                    isUnlocked
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  {isUnlocked ? "VAULT UNLOCKED" : "VAULT LOCKED"}
                </span>
              </div>

              <p className="text-xs text-[#8696a0] leading-relaxed mb-4">
                Encrypted notifications stored in Firebase are decrypted directly inside your browser
                using W3C SubtleCrypto AES-256-GCM. Plaintext is maintained strictly in transient
                memory and purged upon logout.
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-3 rounded-xl bg-[#0c1317] border border-[#222d34]">
                <div><span className="text-[#8696a0]">Algorithm:</span> AES-256-GCM</div>
                <div><span className="text-[#8696a0]">Tag Length:</span> 128-bit</div>
                <div><span className="text-[#8696a0]">Nonce Length:</span> 12-byte</div>
                <div><span className="text-[#8696a0]">Storage:</span> Zero-Persistence RAM</div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-[#222d34] flex justify-end">
              <Link
                href="/dashboard/messages"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs"
              >
                Go to Messenger
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

