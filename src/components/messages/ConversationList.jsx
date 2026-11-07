"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Lock,
  Unlock,
  MessageSquare,
  CheckCheck,
  Smartphone,
  Calendar,
  X,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { formatConversationDate, getAppMeta, getInitials } from "@/lib/utils/formatters";
import { getSecureItem, setSecureItem } from "@/lib/security/secureStorage";

export default function ConversationList({
  conversations = [],
  devices = [],
  selectedDeviceId = "all",
  onSelectDevice,
  selectedConversationId,
  onSelectConversation,
  onOpenKeyModal,
  isKeyUnlocked,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedAppState] = useState(() => getSecureItem("stealth_filter_app", "all"));
  const [dateFilter, setDateFilterState] = useState(() => getSecureItem("stealth_filter_date", "all")); // "all" | "today" | "24h" | "7d"
  const [statusFilter, setStatusFilterState] = useState(() => getSecureItem("stealth_filter_status", "all")); // "all" | "decrypted" | "encrypted"
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const setSelectedApp = (val) => {
    setSelectedAppState(val);
    setSecureItem("stealth_filter_app", val);
  };

  const setDateFilter = (val) => {
    setDateFilterState(val);
    setSecureItem("stealth_filter_date", val);
  };

  const setStatusFilter = (val) => {
    setStatusFilterState(val);
    setSecureItem("stealth_filter_status", val);
  };

  // Compute message counts per device for friendly selector badges
  const deviceCounts = useMemo(() => {
    const counts = {};
    for (const c of conversations) {
      if (c.deviceId) {
        counts[c.deviceId] = (counts[c.deviceId] || 0) + (c.messageCount || 1);
      }
    }
    return counts;
  }, [conversations]);

  // Extract unique applications
  const availableApps = useMemo(() => {
    const set = new Set();
    for (const c of conversations) {
      if (c.appPackage) set.add(c.appPackage);
    }
    return Array.from(set);
  }, [conversations]);

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedDeviceId !== "all") count++;
    if (selectedApp !== "all") count++;
    if (dateFilter !== "all") count++;
    if (statusFilter !== "all") count++;
    if (searchQuery.trim()) count++;
    return count;
  }, [selectedDeviceId, selectedApp, dateFilter, statusFilter, searchQuery]);

  const handleResetFilters = () => {
    if (onSelectDevice) onSelectDevice("all");
    setSelectedApp("all");
    setDateFilter("all");
    setStatusFilter("all");
    setSearchQuery("");
  };

  // Filter conversations with high performance memoization
  const filteredConversations = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    return conversations.filter((c) => {
      // 1. Device Filter
      if (selectedDeviceId !== "all" && c.deviceId !== selectedDeviceId) {
        return false;
      }

      // 2. Application Filter
      if (selectedApp !== "all" && c.appPackage !== selectedApp) {
        return false;
      }

      // 3. Decryption Status Filter
      if (statusFilter === "decrypted" && !c.latestMessage?.isDecrypted) {
        return false;
      }
      if (statusFilter === "encrypted" && c.latestMessage?.isDecrypted) {
        return false;
      }

      // 4. Date Range Filter
      const msgTime = Number(c.lastTimestamp) || 0;
      if (dateFilter === "today" && msgTime < startOfTodayMs) {
        return false;
      }
      if (dateFilter === "24h" && msgTime < now - 24 * 60 * 60 * 1000) {
        return false;
      }
      if (dateFilter === "7d" && msgTime < now - 7 * 24 * 60 * 60 * 1000) {
        return false;
      }

      // 5. Text Search Filter (Sender, App, Device, or Message body)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = c.senderName && c.senderName.toLowerCase().includes(q);
        const appMatch = c.appPackage && c.appPackage.toLowerCase().includes(q);
        const deviceMatch = c.deviceId && c.deviceId.toLowerCase().includes(q);
        const msgMatch = c.latestMessage?.decryptedMessage?.toLowerCase().includes(q);
        if (!nameMatch && !appMatch && !deviceMatch && !msgMatch) {
          return false;
        }
      }

      return true;
    });
  }, [conversations, selectedDeviceId, selectedApp, dateFilter, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-[#111b21] border-r border-[#222d34] select-none min-h-0 min-w-0">
      {/* Header bar */}
      <div className="p-3.5 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#e9edef] tracking-tight">Chats Directory</h2>
            <p className="text-[10px] text-[#8696a0] font-mono">
              {filteredConversations.length} of {conversations.length} threads
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`p-1.5 rounded-xl border text-xs transition flex items-center gap-1 ${
              showAdvancedFilters || activeFiltersCount > 0
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : "bg-[#111b21] border-[#2a3942] text-[#8696a0] hover:text-white"
            }`}
            title="Toggle advanced filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-black font-bold text-[9px] flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <button
            onClick={onOpenKeyModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border shadow-xs ${
              isKeyUnlocked
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
            title={isKeyUnlocked ? "Key Vault is unlocked" : "Click to unlock Key Vault"}
          >
            {isKeyUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px]">
              {isKeyUnlocked ? "Vault Active" : "Decrypt"}
            </span>
          </button>
        </div>
      </div>

      {/* Primary Device Filter Dropdown */}
      <div className="p-3 bg-[#111b21] border-b border-[#222d34] flex-shrink-0 space-y-2">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-semibold text-[#8696a0] uppercase tracking-wider flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-emerald-400" />
              <span>Target Device</span>
            </label>
            {selectedDeviceId !== "all" && (
              <span className="text-[10px] text-emerald-400 font-mono">
                {deviceCounts[selectedDeviceId] || 0} msgs
              </span>
            )}
          </div>
          <div className="relative">
            <select
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice && onSelectDevice(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs bg-[#202c33] border border-[#2a3942] rounded-xl text-[#e9edef] focus:outline-none focus:border-emerald-500 transition appearance-none cursor-pointer font-medium"
            >
              <option value="all">
                🌐 All Connected Devices ({devices.length || Object.keys(deviceCounts).length})
              </option>
              {devices.map((devId, idx) => {
                const count = deviceCounts[devId] || 0;
                const shortId = devId.length > 16 ? `${devId.slice(0, 10)}...${devId.slice(-4)}` : devId;
                return (
                  <option key={devId} value={devId}>
                    📱 Device #{idx + 1} ({shortId}) — {count} msgs
                  </option>
                );
              })}
            </select>
            <div className="absolute right-3 top-2.5 pointer-events-none text-[#8696a0] text-[10px]">
              ▼
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by contact, text or device..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#202c33] border border-transparent rounded-xl text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-[#8696a0] hover:text-white text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick App filter pills */}
        {availableApps.length > 1 && (
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedApp("all")}
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition ${
                selectedApp === "all"
                  ? "bg-[#00a884] text-white shadow-xs"
                  : "bg-[#202c33] text-[#8696a0] hover:text-white"
              }`}
            >
              All Apps
            </button>
            {availableApps.map((pkg) => {
              const meta = getAppMeta(pkg);
              return (
                <button
                  key={pkg}
                  onClick={() => setSelectedApp(pkg)}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition ${
                    selectedApp === pkg
                      ? "bg-[#00a884] text-white shadow-xs"
                      : "bg-[#202c33] text-[#8696a0] hover:text-white"
                  }`}
                >
                  {meta.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Advanced Filters Expandable Panel (Date & Status) */}
        {showAdvancedFilters && (
          <div className="p-2.5 rounded-xl bg-[#0c1317] border border-[#2a3942]/60 space-y-2 mt-1 animate-in fade-in duration-150">
            {/* Date Range Selector */}
            <div>
              <span className="text-[10px] text-[#8696a0] font-semibold uppercase tracking-wider block mb-1">
                Time Window
              </span>
              <div className="grid grid-cols-4 gap-1 text-[10px]">
                {[
                  { id: "all", label: "All Time" },
                  { id: "today", label: "Today" },
                  { id: "24h", label: "Last 24h" },
                  { id: "7d", label: "7 Days" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setDateFilter(item.id)}
                    className={`py-1 px-1 rounded-lg text-center transition ${
                      dateFilter === item.id
                        ? "bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/40"
                        : "bg-[#202c33] text-[#8696a0] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Decryption Status Selector */}
            <div>
              <span className="text-[10px] text-[#8696a0] font-semibold uppercase tracking-wider block mb-1">
                Decryption Filter
              </span>
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                {[
                  { id: "all", label: "All Records" },
                  { id: "decrypted", label: "Decrypted 🔓" },
                  { id: "encrypted", label: "Locked 🔒" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setStatusFilter(item.id)}
                    className={`py-1 px-1 rounded-lg text-center transition ${
                      statusFilter === item.id
                        ? "bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/40"
                        : "bg-[#202c33] text-[#8696a0] hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reset Filters action */}
            {activeFiltersCount > 0 && (
              <div className="pt-1 flex items-center justify-between border-t border-[#222d34]">
                <span className="text-[10px] text-[#8696a0]">
                  {activeFiltersCount} filter(s) active
                </span>
                <button
                  onClick={handleResetFilters}
                  className="text-[10px] text-rose-400 hover:underline font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conversation Thread Items */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#222d34]/40">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-[#8696a0] text-xs">
            <p>No conversations found.</p>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="mt-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[11px] hover:bg-emerald-500/20 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isSelected = conv.id === selectedConversationId;
            const appMeta = getAppMeta(conv.appPackage);
            const latestMsg = conv.latestMessage;
            const previewText = latestMsg?.isDecrypted
              ? latestMsg.decryptedMessage
              : "🔒 Encrypted AES-256 payload";

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-[#2a3942] border-l-4 border-[#00a884] shadow-sm"
                    : "hover:bg-[#202c33]/80 bg-transparent border-l-4 border-transparent"
                }`}
              >
                {/* Avatar with app-based color */}
                <div
                  className={`relative flex-shrink-0 w-11 h-11 rounded-full ${appMeta.color} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-black/20`}
                >
                  {getInitials(conv.senderName)}
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#111b21] flex items-center justify-center"
                    title={appMeta.name}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  </span>
                </div>

                {/* Sender info & snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-sm text-[#e9edef] truncate">
                      {conv.senderName}
                    </span>
                    <span className="text-[11px] text-[#8696a0] whitespace-nowrap font-normal">
                      {formatConversationDate(conv.lastTimestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-[#aebac1] truncate font-normal flex items-center gap-1.5">
                      <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] flex-shrink-0" />
                      <span className="truncate">{previewText}</span>
                    </p>
                    <span className="px-2 py-0.5 rounded-full bg-[#00a884]/20 text-emerald-400 font-bold text-[10px] flex-shrink-0">
                      {conv.messageCount}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-1.5">
                    <span
                      className="text-[9px] px-1.5 py-0.2 rounded-full font-medium"
                      style={{
                        backgroundColor: "rgba(0, 168, 132, 0.12)",
                        color: "#00a884",
                        border: "1px solid rgba(0, 168, 132, 0.2)",
                      }}
                    >
                      {appMeta.name}
                    </span>
                    <span className="text-[9px] text-[#8696a0] font-mono truncate">
                      dev:{conv.deviceId.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
