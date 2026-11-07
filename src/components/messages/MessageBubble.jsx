"use client";

import React, { useState } from "react";
import { formatMessageTime, formatFullDateTime, getAppMeta } from "@/lib/utils/formatters";
import {
  Lock,
  ShieldCheck,
  Copy,
  Check,
  Info,
  User,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  Smartphone,
  ExternalLink,
} from "lucide-react";

function MessageBubble({ message, onUnlockKey }) {
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showRawCrypto, setShowRawCrypto] = useState(false);

  const appMeta = getAppMeta(message.appPackage);
  const isDecrypted = Boolean(message.isDecrypted);

  const handleCopy = (text, e) => {
    e?.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const senderText =
    message.decryptedSender ||
    (message.senderInfo ? "Encrypted Sender" : "Incoming Notification");

  return (
    <div className="flex flex-col mb-3.5 group items-start transition-all w-full">
      <div className="relative min-w-[260px] sm:min-w-[320px] max-w-[95%] sm:max-w-[85%] md:max-w-[75%] rounded-2xl rounded-tl-xs px-4 py-3 bg-[#202c33] text-[#e9edef] border border-[#2a3942]/60 shadow-lg shadow-black/25 hover:border-[#3b4a54] transition-all">
        {/* Header: Sender Name & App Tag */}
        <div className="flex items-center justify-between gap-2.5 mb-2 select-none min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
            <span
              className="font-semibold text-xs sm:text-[13px] text-[#53bdeb] truncate block cursor-pointer hover:underline"
              title={senderText}
            >
              {senderText}
            </span>
          </div>

          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1 shadow-xs"
            style={{
              backgroundColor: "rgba(0, 168, 132, 0.12)",
              color: "#00a884",
              border: "1px solid rgba(0, 168, 132, 0.25)",
            }}
          >
            <span>{appMeta.name}</span>
          </span>
        </div>

        {/* Message Body Content (Crystal Clear Readability) */}
        {isDecrypted ? (
          <div className="text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words text-[#e9edef] select-text font-normal font-sans py-0.5 pr-2">
            {message.decryptedMessage ? (
              message.decryptedMessage
            ) : (
              <span className="text-[#8696a0] italic text-xs">
                (Empty notification body)
              </span>
            )}
          </div>
        ) : (
          <div className="my-1.5 p-3 rounded-xl bg-[#111b21]/80 border border-amber-500/20 text-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>AES-256-GCM Encrypted Message</span>
            </div>
            <p className="text-[11px] text-[#8696a0] mb-2 font-mono break-all line-clamp-2">
              {message.ciphertext || "Encrypted payload"}
            </p>
            {onUnlockKey && (
              <button
                onClick={onUnlockKey}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition shadow-xs"
              >
                <span>Unlock In-Memory Vault to Read</span>
              </button>
            )}
          </div>
        )}

        {/* Footer: Timestamp, Delivery Status, Actions */}
        <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-white/5 text-[11px] text-[#8696a0] select-none flex-shrink-0">
          {message.checksum && (
            <span
              className="inline-flex items-center gap-1 text-emerald-400/90 text-[10px] font-mono"
              title={`Digital Integrity Checksum: ${message.checksum}`}
            >
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">SHA-256</span>
            </span>
          )}

          <span title={formatFullDateTime(message.timestamp)} className="tabular-nums">
            {formatMessageTime(message.timestamp)}
          </span>

          {/* WhatsApp Double Blue Checkmark */}
          <CheckCheck className="w-4 h-4 text-[#53bdeb] flex-shrink-0" title="Delivered & Decrypted" />

          {/* Action buttons (always visible or on hover) */}
          <div className="flex items-center gap-0.5 ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
            {isDecrypted && (
              <button
                onClick={(e) => handleCopy(message.decryptedMessage, e)}
                className="p-1 text-[#8696a0] hover:text-white rounded hover:bg-[#111b21] transition"
                title="Copy message text"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`p-1 rounded transition ${
                showDetails
                  ? "text-emerald-400 bg-[#111b21]"
                  : "text-[#8696a0] hover:text-white hover:bg-[#111b21]"
              }`}
              title="Inspect security & device details"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expandable Clean Metadata Card */}
        {showDetails && (
          <div className="mt-3 pt-3 border-t border-[#2a3942] text-xs text-slate-300 space-y-2 bg-[#111b21]/90 p-3.5 rounded-xl border border-[#2a3942]/60 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#2a3942]">
              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <Fingerprint className="w-4 h-4" />
                Message Audit Record
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-medium">
                {isDecrypted ? "Decrypted (RAM Only)" : "Encrypted (At-Rest)"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] pt-1">
              <div className="min-w-0">
                <span className="text-[#8696a0] block text-[10px] uppercase tracking-wider">Sender / Contact</span>
                <span className="font-medium text-slate-100 break-words select-text block">
                  {message.decryptedSender || "Unknown"}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-[#8696a0] block text-[10px] uppercase tracking-wider">Timestamp</span>
                <span className="text-slate-200 select-text font-mono block">
                  {formatFullDateTime(message.timestamp)}
                </span>
              </div>

              <div className="min-w-0">
                <span className="text-[#8696a0] block text-[10px] uppercase tracking-wider">Application</span>
                <span className="text-slate-200 block">{appMeta.name}</span>
              </div>

              <div className="min-w-0">
                <span className="text-[#8696a0] block text-[10px] uppercase tracking-wider">Originating Device</span>
                <span className="text-emerald-400 font-mono text-[10px] break-all select-text block">
                  {message.deviceId}
                </span>
              </div>
            </div>

            {/* Cryptographic Parameters Toggle */}
            <div className="pt-2 border-t border-[#2a3942]/50">
              <button
                onClick={() => setShowRawCrypto(!showRawCrypto)}
                className="flex items-center justify-between w-full text-[11px] text-[#8696a0] hover:text-slate-200"
              >
                <span>Cryptographic Parameters (IV, Checksum)</span>
                {showRawCrypto ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showRawCrypto && (
                <div className="mt-2 p-2.5 rounded-lg bg-[#0c1317] border border-[#2a3942] font-mono text-[10px] space-y-1.5 break-all select-text">
                  <div>
                    <span className="text-emerald-400">Cipher Algorithm:</span> AES-256-GCM / 12-byte IV
                  </div>
                  {message.checksum && (
                    <div>
                      <span className="text-emerald-400">SHA-256 Checksum:</span> {message.checksum}
                    </div>
                  )}
                  {message.ciphertext && (
                    <div>
                      <span className="text-emerald-400">Ciphertext Sample:</span> {message.ciphertext.slice(0, 48)}...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(MessageBubble);
