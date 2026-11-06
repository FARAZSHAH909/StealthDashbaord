"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import DateDivider from "./DateDivider";
import { getAppMeta, getInitials, formatFullDateTime } from "@/lib/utils/formatters";
import {
  Search,
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Info,
  RefreshCw,
  KeyRound,
  Lock,
  Unlock,
  MessageSquare,
  Radio,
  CheckCheck,
} from "lucide-react";

export default function ChatPanel({
  conversation,
  onBackMobile,
  onOpenKeyModal,
  isKeyUnlocked,
}) {
  const [inChatSearch, setInChatSearch] = useState("");
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showDeviceDetails, setShowDeviceDetails] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversation?.messages?.length, conversation?.id]);

  // Filter messages within conversation
  const displayedMessages = useMemo(() => {
    if (!conversation?.messages) return [];
    if (!inChatSearch.trim()) return conversation.messages;
    const q = inChatSearch.toLowerCase();
    return conversation.messages.filter((m) => {
      const matchMsg = m.decryptedMessage && m.decryptedMessage.toLowerCase().includes(q);
      const matchCipher = m.ciphertext && m.ciphertext.toLowerCase().includes(q);
      const matchId = m.id && m.id.toLowerCase().includes(q);
      return matchMsg || matchCipher || matchId;
    });
  }, [conversation?.messages, inChatSearch]);

  // Group messages by calendar date for date divider separators
  const messagesWithDateDividers = useMemo(() => {
    if (!displayedMessages || displayedMessages.length === 0) return [];
    const list = [];
    let lastDateStr = null;

    for (const msg of displayedMessages) {
      const dateObj = new Date(Number(msg.timestamp));
      const dateStr = dateObj.toLocaleDateString([], {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      if (dateStr !== lastDateStr) {
        list.push({ type: "divider", label: dateStr, id: `div_${dateStr}_${msg.id}` });
        lastDateStr = dateStr;
      }
      list.push({ type: "message", data: msg, id: msg.id });
    }

    return list;
  }, [displayedMessages]);

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0b141a] text-center select-none">
        <div className="w-20 h-20 rounded-full bg-[#111b21] border border-[#222d34] flex items-center justify-center mb-5 text-[#00a884] shadow-2xl shadow-emerald-500/10">
          <MessageSquare className="w-10 h-10 animate-pulse" />
        </div>
        <h3 className="text-xl font-bold tracking-tight text-[#e9edef]">
          Encrypted Communications Terminal
        </h3>
        <p className="max-w-md text-xs sm:text-sm text-[#8696a0] mt-2 leading-relaxed">
          Select a synchronized conversation thread from the left directory to monitor live messages,
          inspect AES-256-GCM authenticated payloads, and verify digital signatures.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
          {!isKeyUnlocked && (
            <button
              onClick={onOpenKeyModal}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a884] hover:bg-[#02906f] text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
            >
              <KeyRound className="w-4 h-4" />
              <span>Unlock In-Memory Key Vault</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const appMeta = getAppMeta(conversation.appPackage);

  return (
    <div className="flex-1 min-h-0 min-w-0 flex flex-col h-full bg-[#0b141a] overflow-hidden">
      {/* WhatsApp Clean Chat Header */}
      <div className="px-4 py-2.5 bg-[#202c33] border-b border-[#2a3942]/70 flex items-center justify-between z-20 shadow-md flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile Back Button */}
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="lg:hidden p-1.5 -ml-1 text-[#8696a0] hover:text-white rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Contact Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className={`w-10 h-10 rounded-full ${appMeta.color} flex items-center justify-center text-white font-bold text-sm shadow-md ring-2 ring-black/20`}
            >
              {getInitials(conversation.senderName)}
            </div>
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#202c33] flex items-center justify-center"
              title="Online Active Synced Stream"
            >
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </span>
          </div>

          {/* Contact Details */}
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-semibold text-[#e9edef] truncate flex items-center gap-2">
              <span className="truncate">{conversation.senderName}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-medium shadow-xs"
                style={{
                  backgroundColor: "rgba(0, 168, 132, 0.12)",
                  color: "#00a884",
                  border: "1px solid rgba(0, 168, 132, 0.25)",
                }}
              >
                {appMeta.name}
              </span>
            </h3>
            <p className="text-[11px] text-[#8696a0] truncate font-mono flex items-center gap-1.5">
              <span>Device: {conversation.deviceId.slice(0, 14)}...</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{conversation.messageCount} messages</span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          {showSearchInput ? (
            <div className="relative animate-in fade-in duration-200">
              <input
                type="text"
                autoFocus
                value={inChatSearch}
                onChange={(e) => setInChatSearch(e.target.value)}
                placeholder="Search messages..."
                className="pl-8 pr-7 py-1.5 text-xs bg-[#111b21] border border-[#2a3942] rounded-xl text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-emerald-500 w-36 sm:w-56 shadow-inner"
              />
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#8696a0]" />
              <button
                onClick={() => {
                  setInChatSearch("");
                  setShowSearchInput(false);
                }}
                className="absolute right-2.5 top-1.5 text-xs text-[#8696a0] hover:text-white"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearchInput(true)}
              className="p-2 text-[#8696a0] hover:text-white hover:bg-[#111b21] rounded-xl transition"
              title="Search in this conversation"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowDeviceDetails(!showDeviceDetails)}
            className={`p-2 rounded-xl transition ${
              showDeviceDetails
                ? "bg-emerald-600 text-white shadow-md"
                : "text-[#8696a0] hover:text-white hover:bg-[#111b21]"
            }`}
            title="Toggle Device & Telemetry Details"
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenKeyModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition border ${
              isKeyUnlocked
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            }`}
            title={isKeyUnlocked ? "Vault is Unlocked" : "Unlock Decryption Vault"}
          >
            {isKeyUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[11px] font-semibold">
              {isKeyUnlocked ? "Active" : "Unlock"}
            </span>
          </button>
        </div>
      </div>

      {/* Device Info Dropdown Card */}
      {showDeviceDetails && (
        <div className="p-3.5 bg-[#111b21] border-b border-[#222d34] text-xs text-slate-300 font-mono grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-200 flex-shrink-0">
          <div className="min-w-0">
            <span className="text-[#8696a0] block text-[10px] uppercase">Sender Identity</span>
            <span className="text-[#53bdeb] font-semibold truncate block" title={conversation.senderName}>
              {conversation.senderName}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[#8696a0] block text-[10px] uppercase">Package Name</span>
            <span className="text-slate-200 truncate block">{appMeta.name}</span>
          </div>
          <div className="min-w-0">
            <span className="text-[#8696a0] block text-[10px] uppercase">Device Hardware ID</span>
            <span className="text-emerald-400 truncate block" title={conversation.deviceId}>
              {conversation.deviceId}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-[#8696a0] block text-[10px] uppercase">Synchronized Threads</span>
            <span className="text-slate-200 block">{conversation.messageCount} messages</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area with WhatsApp Chat Wallpaper Pattern */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6"
        style={{
          backgroundColor: "#0b141a",
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(17, 27, 33, 0.4) 0%, rgba(11, 20, 26, 0.98) 100%),
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23182229' fill-opacity='0.4' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")
          `,
        }}
      >
        {messagesWithDateDividers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#8696a0] text-xs">
            <p>No messages match your search criteria.</p>
          </div>
        ) : (
          messagesWithDateDividers.map((item) => {
            if (item.type === "divider") {
              return <DateDivider key={item.id} dateLabel={item.label} />;
            }
            return (
              <MessageBubble
                key={item.id}
                message={item.data}
                onUnlockKey={!isKeyUnlocked ? onOpenKeyModal : null}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Read-Only Status Bar */}
      <div className="px-4 py-2 bg-[#202c33] border-t border-[#2a3942]/70 flex items-center justify-between text-[11px] text-[#8696a0] select-none flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-medium text-slate-300">Live Firebase Stream Active</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono">
            {displayedMessages.length} of {conversation.messageCount} messages
          </span>
          <span className="font-mono flex items-center gap-1.5 text-emerald-400">
            <CheckCheck className="w-3.5 h-3.5" />
            <span>{isKeyUnlocked ? "AES-256-GCM Unlocked" : "Locked"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
