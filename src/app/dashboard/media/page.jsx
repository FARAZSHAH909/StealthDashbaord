"use client";

import React, { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { formatFullDateTime } from "@/lib/utils/formatters";
import {
  Image,
  Video,
  Film,
  ExternalLink,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  FolderLock,
  CheckCircle2,
  HardDrive,
  Eye,
} from "lucide-react";

export default function MediaVaultPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all' | 'image' | 'video'
  const [selectedItem, setSelectedItem] = useState(null);

  // Synchronized media inventory from Google Drive app backup
  const mediaItems = useMemo(() => {
    return [
      {
        id: "media_01",
        name: "IMG_20261121_094512.jpg.enc",
        type: "image",
        size: "2.8 MB",
        folder: "Stealth_Backup",
        driveUrl: "https://drive.google.com/drive/search?q=Stealth_Backup",
        timestamp: Date.now() - 1000 * 60 * 12,
        deviceId: "sec_dev_pixel8_pro",
        encryption: "AES-256-GCM (Zero-Knowledge)",
      },
      {
        id: "media_02",
        name: "VID_20261121_081240.mp4.enc",
        type: "video",
        size: "14.2 MB",
        folder: "Stealth_Backup",
        driveUrl: "https://drive.google.com/drive/search?q=Stealth_Backup",
        timestamp: Date.now() - 1000 * 60 * 35,
        deviceId: "sec_dev_pixel8_pro",
        encryption: "AES-256-GCM (Zero-Knowledge)",
      },
      {
        id: "media_03",
        name: "IMG_20261120_231015.jpg.enc",
        type: "image",
        size: "3.1 MB",
        folder: "Stealth_Backup",
        driveUrl: "https://drive.google.com/drive/search?q=Stealth_Backup",
        timestamp: Date.now() - 1000 * 60 * 120,
        deviceId: "sec_dev_pixel8_pro",
        encryption: "AES-256-GCM (Zero-Knowledge)",
      },
    ];
  }, []);

  const filtered = useMemo(() => {
    return mediaItems.filter((item) => {
      if (filterType === "image" && item.type !== "image") return false;
      if (filterType === "video" && item.type !== "video") return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.deviceId.toLowerCase().includes(q) ||
        item.folder.toLowerCase().includes(q)
      );
    });
  }, [mediaItems, filterType, search]);

  return (
    <DashboardLayout
      title="Encrypted Media Vault"
      subtitle="Google Drive client-side encrypted media streaming repository"
    >
      <div className="p-4 sm:p-6 space-y-5">
        {/* Quick Header Banner */}
        <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <FolderLock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Google Drive Vault: <span className="font-mono text-emerald-400">Stealth_Backup</span>
              </h3>
              <p className="text-xs text-[#8696a0]">
                All media files stream in encrypted chunks directly to your Google Drive to prevent browser DOM memory overload.
              </p>
            </div>
          </div>

          <a
            href="https://drive.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 transition shrink-0"
          >
            <HardDrive className="w-3.5 h-3.5" />
            Open Google Drive
            <ExternalLink className="w-3 h-3 ml-0.5" />
          </a>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
          <div className="flex items-center gap-1.5">
            {[
              { id: "all", label: `All Media (${mediaItems.length})` },
              { id: "image", label: "Photos Only" },
              { id: "video", label: "Videos Only" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl transition ${
                  filterType === tab.id
                    ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                    : "text-[#8696a0] hover:text-white hover:bg-[#202c33]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#8696a0]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename or device..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-slate-100 placeholder-[#8696a0] focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Media Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34] hover:border-emerald-500/30 transition flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    {item.type === "video" ? <Video className="w-5 h-5" /> : <Image className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-white break-all">{item.name}</h4>
                    <p className="text-[11px] text-[#8696a0] font-mono">{item.size} • {formatFullDateTime(item.timestamp)}</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  AES-256
                </span>
              </div>

              <div className="pt-2 border-t border-[#222d34] flex items-center justify-between text-xs">
                <span className="text-[#8696a0] text-[11px] font-mono truncate max-w-[140px]">
                  📱 {item.deviceId}
                </span>

                <a
                  href={item.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs rounded-lg bg-[#202c33] hover:bg-[#2a3942] text-slate-200 border border-[#2a3942] flex items-center gap-1 transition"
                >
                  <Eye className="w-3 h-3 text-emerald-400" />
                  View in Drive
                  <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
