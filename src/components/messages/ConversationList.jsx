"use client";

import React, { useState, useMemo } from "react";
import { Search, Filter, Lock, Unlock, MessageSquare, CheckCheck, Smartphone } from "lucide-react";
import { formatConversationDate, getAppMeta, getInitials } from "@/lib/utils/formatters";

export default function ConversationList({
  conversations = [],
  selectedConversationId,
  onSelectConversation,
  onOpenKeyModal,
  isKeyUnlocked,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState("all");

  // Extract unique applications
  const availableApps = useMemo(() => {
    const set = new Set();
    for (const c of conversations) {
      if (c.appPackage) set.add(c.appPackage);
    }
    return Array.from(set);
  }, [conversations]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchesApp = selectedApp === "all" || c.appPackage === selectedApp;
      if (!matchesApp) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const nameMatch = c.senderName && c.senderName.toLowerCase().includes(q);
      const appMatch = c.appPackage && c.appPackage.toLowerCase().includes(q);
      const deviceMatch = c.deviceId && c.deviceId.toLowerCase().includes(q);
      const msgMatch = c.latestMessage?.decryptedMessage?.toLowerCase().includes(q);
      return nameMatch || appMatch || deviceMatch || msgMatch;
    });
  }, [conversations, selectedApp, searchQuery]);

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
              {conversations.length} active threads
            </p>
          </div>
        </div>

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
          <span className="hidden sm:inline text-[11px]">{isKeyUnlocked ? "Vault Active" : "Decrypt"}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 bg-[#111b21] border-b border-[#222d34] flex-shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#8696a0]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, number or message..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-[#202c33] border border-transparent rounded-xl text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2.5 text-[#8696a0] hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick App filter pills */}
        {availableApps.length > 1 && (
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedApp("all")}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition ${
                selectedApp === "all"
                  ? "bg-[#00a884] text-white shadow-xs"
                  : "bg-[#202c33] text-[#8696a0] hover:text-white"
              }`}
            >
              All
            </button>
            {availableApps.map((pkg) => {
              const meta = getAppMeta(pkg);
              return (
                <button
                  key={pkg}
                  onClick={() => setSelectedApp(pkg)}
                  className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition ${
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
      </div>

      {/* Conversation Thread Items */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[#222d34]/40">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-[#8696a0] text-xs">
            <p>No conversations found.</p>
            {searchQuery && (
              <p className="mt-1 text-[11px]">Try clearing search filters.</p>
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
