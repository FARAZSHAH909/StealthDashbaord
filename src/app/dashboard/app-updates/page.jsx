"use client";

import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import {
  DownloadCloud,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  Radio,
  FileCode2,
  Layers,
  Lock,
  RefreshCw,
  AlertCircle,
  Eye,
  GitBranch,
  Terminal,
} from "lucide-react";

export default function AppUpdatesPage() {
  const { production, staging, loading, lastSyncTime, refresh } = useAppUpdate();

  // Active view tab: "all" | "production" | "staging"
  const [activeTab, setActiveTab] = useState("all");
  // Active simulator preview target: "production" | "staging"
  const [simulatorTarget, setSimulatorTarget] = useState("production");

  const [copiedKey, setCopiedKey] = useState(null);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const previewData = simulatorTarget === "staging" ? staging : production;

  return (
    <DashboardLayout
      title="Android App Telemetry & Releases"
      subtitle="Live read-only viewer for Production and Staging Firebase distribution tables"
    >
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Real-Time Status & Read-Only Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/10">
              <DownloadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Firebase App Update Telemetry
                </h2>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE RTDB
                </span>
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-mono font-medium">
                  <Lock className="w-3 h-3" />
                  STRICT READ-ONLY
                </span>
              </div>
              <p className="text-xs text-[#8696a0] mt-1 font-mono">
                Monitoring: <span className="text-emerald-400">/app_update</span> (Production) &{" "}
                <span className="text-indigo-400">/app_update_staging</span> (Staging)
                {lastSyncTime && (
                  <span className="text-slate-400 ml-2">
                    • Last synced: {new Date(lastSyncTime).toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={refresh}
              className="px-3.5 py-2 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-xs font-mono text-slate-200 border border-[#2a3942] transition flex items-center gap-1.5 cursor-pointer"
              title="Force sync latest snapshot from Firebase"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Refresh RTDB</span>
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#111b21] border border-[#222d34] w-fit">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
              activeTab === "all"
                ? "bg-[#202c33] text-white shadow-sm"
                : "text-[#8696a0] hover:text-slate-200"
            }`}
          >
            All Environments (2)
          </button>
          <button
            onClick={() => setActiveTab("production")}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "production"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                : "text-[#8696a0] hover:text-slate-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Updated App (Production)
          </button>
          <button
            onClick={() => setActiveTab("staging")}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === "staging"
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-sm"
                : "text-[#8696a0] hover:text-slate-200"
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            App Updated Staging
          </button>
        </div>

        {/* Main Grid: Telemetry Details (Left) & Simulator Preview (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Environments Viewer Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Production Environment: Updated App (/app_update) */}
            {(activeTab === "all" || activeTab === "production") && (
              <div className="p-5 sm:p-6 rounded-2xl bg-[#111b21] border border-emerald-500/30 space-y-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#222d34]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Updated App</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          Production Channel
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#8696a0] font-mono mt-0.5">
                        Firebase RTDB Node: <code className="text-emerald-400">/app_update</code>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Read-Only
                  </span>
                </div>

                {/* Values Display */}
                <div className="space-y-4 text-xs font-mono">
                  {/* Title */}
                  <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                      App Title (title)
                    </span>
                    <div className="text-sm font-semibold text-white font-sans break-words">
                      {production.title || "—"}
                    </div>
                  </div>

                  {/* Dual Grid: Version Name & Version Code */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Version Name (version_name)
                      </span>
                      <div className="text-emerald-400 font-bold text-sm">
                        v{production.version_name || "—"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Build Code (version_code)
                      </span>
                      <div className="text-white font-bold text-sm">
                        {production.version_code ?? "—"}
                      </div>
                    </div>
                  </div>

                  {/* APK URL */}
                  <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] font-sans">
                        Direct APK URL (apk_url)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(production.apk_url, "prod_apk")}
                          className="text-[11px] text-[#8696a0] hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedKey === "prod_apk" ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === "prod_apk" ? "Copied" : "Copy"}</span>
                        </button>

                        {production.apk_url && (
                          <a
                            href={production.apk_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#8696a0] hover:text-white flex items-center gap-1 transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Download APK</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-200 break-all select-all bg-[#111b21] p-2 rounded-lg border border-[#222d34]">
                      {production.apk_url || "—"}
                    </div>
                  </div>

                  {/* Update Message / Changelog */}
                  <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                      Update Notification Message (message)
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {production.message || "—"}
                    </p>
                  </div>

                  {/* Enforcement & Metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Enforcement Policy
                      </span>
                      {production.force_update ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Strict Mandatory
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          Optional Update
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Last Telemetry Timestamp
                      </span>
                      <div className="text-[11px] text-slate-300">
                        {production.updated_at
                          ? new Date(production.updated_at).toLocaleString()
                          : "Live Stream Active"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Staging Environment: App Updated Staging (/app_update_staging) */}
            {(activeTab === "all" || activeTab === "staging") && (
              <div className="p-5 sm:p-6 rounded-2xl bg-[#111b21] border border-indigo-500/30 space-y-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full pointer-events-none" />

                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#222d34]">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>App Updated Staging</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                          Staging QA Channel
                        </span>
                      </h3>
                      <p className="text-[11px] text-[#8696a0] font-mono mt-0.5">
                        Firebase RTDB Node: <code className="text-indigo-400">/app_update_staging</code>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Read-Only
                  </span>
                </div>

                {/* Values Display */}
                <div className="space-y-4 text-xs font-mono">
                  {/* Title */}
                  <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                      App Title (title)
                    </span>
                    <div className="text-sm font-semibold text-white font-sans break-words">
                      {staging.title || "—"}
                    </div>
                  </div>

                  {/* Dual Grid: Version Name & Version Code */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Version Name (version_name)
                      </span>
                      <div className="text-indigo-400 font-bold text-sm">
                        v{staging.version_name || "—"}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Build Code (version_code)
                      </span>
                      <div className="text-white font-bold text-sm">
                        {staging.version_code ?? "—"}
                      </div>
                    </div>
                  </div>

                  {/* APK URL */}
                  <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] font-sans">
                        Direct APK URL (apk_url)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(staging.apk_url, "staging_apk")}
                          className="text-[11px] text-[#8696a0] hover:text-indigo-400 flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedKey === "staging_apk" ? (
                            <Check className="w-3 h-3 text-indigo-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === "staging_apk" ? "Copied" : "Copy"}</span>
                        </button>

                        {staging.apk_url && (
                          <a
                            href={staging.apk_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-[#8696a0] hover:text-white flex items-center gap-1 transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Download APK</span>
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-200 break-all select-all bg-[#111b21] p-2 rounded-lg border border-[#222d34]">
                      {staging.apk_url || "—"}
                    </div>
                  </div>

                  {/* Update Message / Changelog */}
                  <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                    <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                      Update Notification Message (message)
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                      {staging.message || "—"}
                    </p>
                  </div>

                  {/* Enforcement & Min Version */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Enforcement Policy
                      </span>
                      {staging.force_update ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Strict Mandatory
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                          Optional Update
                        </span>
                      )}
                    </div>

                    <div className="p-3 rounded-xl bg-[#0b141a] border border-[#222d34] space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-[#8696a0] block font-sans">
                        Min Supported Build
                      </span>
                      <div className="text-[11px] text-slate-300">
                        {staging.min_version_code !== undefined
                          ? `Build #${staging.min_version_code}`
                          : "Any version"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Android Device Simulator */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#222d34]">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Android Device Simulator
                </span>

                {/* Simulator Channel Switcher */}
                <div className="flex items-center gap-1 bg-[#0b141a] p-1 rounded-xl border border-[#222d34]">
                  <button
                    onClick={() => setSimulatorTarget("production")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                      simulatorTarget === "production"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-[#8696a0] hover:text-white"
                    }`}
                  >
                    Prod
                  </button>
                  <button
                    onClick={() => setSimulatorTarget("staging")}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer ${
                      simulatorTarget === "staging"
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                        : "text-[#8696a0] hover:text-white"
                    }`}
                  >
                    Staging
                  </button>
                </div>
              </div>

              {/* Phone Mockup Frame */}
              <div className="relative mx-auto w-full max-w-[320px] rounded-[36px] bg-[#000000] p-3 shadow-2xl border-4 border-[#222d34] overflow-hidden">
                {/* Phone Speaker Notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-[#111b21] rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-8 h-1 bg-[#222d34] rounded-full" />
                </div>

                {/* Phone Screen Display */}
                <div className="relative w-full rounded-[28px] bg-[#0b141a] pt-8 pb-6 px-4 min-h-[460px] flex flex-col justify-between border border-[#222d34]/60">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between text-[10px] text-[#8696a0] font-mono px-1 mb-6">
                    <span>12:00</span>
                    <div className="flex items-center gap-1.5">
                      <Radio className="w-3 h-3 text-emerald-400" />
                      <span>5G</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Android Update Modal Card */}
                  <div className="rounded-2xl bg-[#182229] border border-[#2a3942] p-5 shadow-2xl space-y-4 my-auto animate-in zoom-in-95 duration-200">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          simulatorTarget === "staging"
                            ? "bg-indigo-500/20 border border-indigo-500/30 text-indigo-400"
                            : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                        }`}
                      >
                        <DownloadCloud className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate">
                          {previewData.title || "Android System Update"}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[11px] font-mono font-semibold ${
                              simulatorTarget === "staging" ? "text-indigo-400" : "text-emerald-400"
                            }`}
                          >
                            v{previewData.version_name || "1.0"}
                          </span>
                          <span className="text-[10px] text-[#8696a0] font-mono">
                            (Build {previewData.version_code || 1})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Changelog text */}
                    <div className="p-3 rounded-xl bg-[#111b21] border border-[#222d34] text-xs text-slate-200 leading-relaxed font-sans break-words max-h-32 overflow-y-auto">
                      {previewData.message || "New update available."}
                    </div>

                    {/* Enforcement Badge */}
                    {previewData.force_update ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Mandatory update to continue</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#8696a0]">
                        Optional update: Can be postponed.
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-1 flex flex-col gap-2">
                      <a
                        href={previewData.apk_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className={`w-full py-2.5 rounded-xl text-white text-xs font-bold text-center shadow-lg transition flex items-center justify-center gap-1.5 ${
                          simulatorTarget === "staging"
                            ? "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
                            : "bg-[#00a884] hover:bg-[#02906f] shadow-emerald-500/20"
                        }`}
                      >
                        <DownloadCloud className="w-4 h-4" />
                        <span>Download & Install APK</span>
                      </a>

                      {!previewData.force_update && (
                        <div className="w-full py-1.5 text-center text-[#8696a0] text-xs font-medium">
                          Later
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Pill */}
                  <div className="w-24 h-1 bg-white/20 rounded-full mx-auto mt-4" />
                </div>
              </div>
            </div>

            {/* Read-Only Security Compliance Note */}
            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] text-xs text-[#8696a0] space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Strict Read-Only Policy</span>
              </div>
              <p className="leading-relaxed">
                Both <code className="text-emerald-400 font-mono">Updated App</code> and{" "}
                <code className="text-indigo-400 font-mono">App Updated Staging</code> tables are bound to
                direct read-only WebSocket streams. Web client write mutations are completely locked down to ensure database integrity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
