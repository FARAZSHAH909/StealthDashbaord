"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import {
  DownloadCloud,
  Smartphone,
  Save,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Radio,
  FileCode2,
  Layers,
  ArrowUpRight,
  Info,
} from "lucide-react";

export default function AppUpdatesPage() {
  const { data, loading, saving, error, success, lastSyncTime, saveAppUpdate } = useAppUpdate();

  // Local form state
  const [form, setForm] = useState({
    apk_url: "",
    version_code: 1,
    version_name: "1.0",
    title: "",
    message: "",
    force_update: false,
  });

  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync form when incoming real-time data arrives
  useEffect(() => {
    if (data) {
      setForm({
        apk_url: data.apk_url || "",
        version_code: data.version_code || 1,
        version_name: data.version_name || "1.0",
        title: data.title || "",
        message: data.message || "",
        force_update: Boolean(data.force_update),
      });
      setHasChanges(false);
    }
  }, [data]);

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      setHasChanges(true);
      return next;
    });
  };

  const handleBumpVersion = () => {
    const nextCode = (Number(form.version_code) || 1) + 1;
    let nextName = form.version_name;
    const match = form.version_name.match(/^(\d+)\.(\d+)$/);
    if (match) {
      nextName = `${match[1]}.${Number(match[2]) + 1}`;
    } else {
      nextName = `v${nextCode}.0`;
    }

    setForm((prev) => ({
      ...prev,
      version_code: nextCode,
      version_name: nextName,
    }));
    setHasChanges(true);
  };

  const handleCopyApkUrl = () => {
    if (!form.apk_url) return;
    navigator.clipboard.writeText(form.apk_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const ok = await saveAppUpdate(form);
    if (ok) {
      setHasChanges(false);
    }
  };

  return (
    <DashboardLayout
      title="Android App Releases"
      subtitle="Real-time OTA update manager and APK payload distribution terminal"
    >
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Top Status & Live Sync Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/10">
              <DownloadCloud className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Firebase App Update Synchronizer
                </h2>
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE RTDB
                </span>
              </div>
              <p className="text-xs text-[#8696a0] mt-0.5 font-mono">
                Target Node: <span className="text-emerald-400 font-semibold">/app_update</span> •
                {lastSyncTime
                  ? ` Last synced: ${new Date(lastSyncTime).toLocaleTimeString()}`
                  : " Connecting..."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {hasChanges && (
              <span className="text-xs text-amber-400 font-mono px-3 py-1 rounded-xl bg-amber-400/10 border border-amber-400/20">
                ● Unsaved Changes
              </span>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] active:scale-95 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Publish Update</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>
              Successfully published and synchronized with Firebase Realtime Database (/app_update)! All connected Android devices will receive this update immediately.
            </span>
          </div>
        )}

        {/* Main Grid: Form Controls (Left) & Live Android Device Simulator (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Controls Column */}
          <div className="lg:col-span-7 space-y-5">
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 rounded-2xl bg-[#111b21] border border-[#222d34] space-y-5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[#222d34]">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-emerald-400" />
                    Release Parameters
                  </h3>
                  <p className="text-[11px] text-[#8696a0]">
                    Modify any field below to update live telemetry in the Firebase RTDB
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleBumpVersion}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 border border-[#2a3942] text-xs font-mono transition"
                  title="Automatically increment version code and version name"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+1 Quick Bump</span>
                </button>
              </div>

              {/* Field: APK URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <span>Direct APK Download URL</span>
                    <span className="text-rose-400 font-mono">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {form.apk_url && (
                      <>
                        <button
                          type="button"
                          onClick={handleCopyApkUrl}
                          className="text-[11px] text-[#8696a0] hover:text-emerald-400 flex items-center gap-1 transition"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? "Copied" : "Copy"}</span>
                        </button>
                        <a
                          href={form.apk_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#8696a0] hover:text-white flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Test Link</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="url"
                    required
                    value={form.apk_url}
                    onChange={(e) => handleChange("apk_url", e.target.value)}
                    placeholder="https://example.com/downloads/AndroidSystemSafetyCore.apk"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-[#8696a0]">
                  Public direct HTTPS download link to the compiled Android APK package.
                </p>
              </div>

              {/* Dual Column: Version Code & Version Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Version Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <span>Version Code (Integer)</span>
                    <span className="text-rose-400 font-mono">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={form.version_code}
                    onChange={(e) => handleChange("version_code", e.target.value)}
                    placeholder="2"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-[#8696a0]">
                    Android internal build code (must be higher than installed app).
                  </p>
                </div>

                {/* Version Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                    <span>Version Name (Display)</span>
                    <span className="text-rose-400 font-mono">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.version_name}
                    onChange={(e) => handleChange("version_name", e.target.value)}
                    placeholder="2.0"
                    className="w-full px-3.5 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 font-mono"
                  />
                  <p className="text-[10px] text-[#8696a0]">
                    User-facing version tag (e.g. 2.0, 2.1-patch).
                  </p>
                </div>
              </div>

              {/* Field: Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <span>Dialog Title</span>
                  <span className="text-rose-400 font-mono">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  placeholder="Android System Safety Core"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-[#8696a0]">
                  App name or title displayed at the top of the update dialog.
                </p>
              </div>

              {/* Field: Message / Changelog */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <span>Update Notification Message / Changelog</span>
                  <span className="text-rose-400 font-mono">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={form.message}
                  onChange={(e) => handleChange("message", e.target.value)}
                  placeholder="New System Security Update Available - Tap to install"
                  className="w-full px-3.5 py-2.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 resize-none"
                />
                <p className="text-[10px] text-[#8696a0]">
                  Instruction or release notes presented to the user on the device.
                </p>
              </div>

              {/* Field: Force Update Toggle */}
              <div className="p-4 rounded-xl bg-[#0b141a] border border-[#222d34] flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-200">Force Mandatory Update</span>
                    {form.force_update ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                        Strict Enforced
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-[#8696a0] border border-slate-700">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8696a0]">
                    If enabled, user cannot dismiss the update screen until APK is downloaded and installed.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={form.force_update}
                    onChange={(e) => handleChange("force_update", e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#2a3942] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save & Synchronize</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Live Android Device Preview Simulator */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] shadow-xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#222d34]">
                <span className="text-xs font-semibold text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  Android Device Live Simulator
                </span>
                <span className="text-[10px] text-[#8696a0] font-mono">
                  Real-time Preview
                </span>
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
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <DownloadCloud className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate">
                          {form.title || "Android System Safety Core"}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                            v{form.version_name || "1.0"}
                          </span>
                          <span className="text-[10px] text-[#8696a0] font-mono">
                            (Build {form.version_code || 1})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Changelog text */}
                    <div className="p-3 rounded-xl bg-[#111b21] border border-[#222d34] text-xs text-slate-200 leading-relaxed font-sans break-words max-h-32 overflow-y-auto">
                      {form.message || "New System Security Update Available - Tap to install"}
                    </div>

                    {/* Enforcement Badge */}
                    {form.force_update ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Mandatory update to continue</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#8696a0]">
                        You can update now or postpone.
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-1 flex flex-col gap-2">
                      <a
                        href={form.apk_url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-bold text-center shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-1.5"
                      >
                        <DownloadCloud className="w-4 h-4" />
                        <span>Update Now</span>
                      </a>

                      {!form.force_update && (
                        <button
                          type="button"
                          className="w-full py-2 rounded-xl bg-[#202c33] text-[#8696a0] hover:text-white text-xs font-medium text-center transition"
                        >
                          Later
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Navigation Pill */}
                  <div className="w-24 h-1 bg-white/20 rounded-full mx-auto mt-4" />
                </div>
              </div>
            </div>

            {/* Quick Information Box */}
            <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] text-xs text-[#8696a0] space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <Info className="w-4 h-4 text-emerald-400" />
                <span>How the Android App Uses This Table</span>
              </div>
              <p className="leading-relaxed">
                When the installed Android app starts up or receives a heartbeat check, it reads the <code className="text-emerald-400 font-mono">/app_update</code> node in Firebase Realtime Database. If its internal version is lower than <code className="text-emerald-400 font-mono">version_code</code>, it downloads the APK directly from <code className="text-emerald-400 font-mono">apk_url</code> and prompts the user to install.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
