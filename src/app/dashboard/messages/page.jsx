"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ConversationList from "@/components/messages/ConversationList";
import ChatPanel from "@/components/messages/ChatPanel";
import KeyUnlockModal from "@/components/messages/KeyUnlockModal";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";

export default function MessagesPage() {
  const { conversations, devices, loading, error } = useFirebaseData();
  const { isUnlocked } = useKeyVault();

  const [selectedDeviceId, setSelectedDeviceId] = useState("all");
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Filter conversations by device if a specific device is selected
  const visibleConversations = useMemo(() => {
    if (selectedDeviceId === "all") return conversations;
    return conversations.filter((c) => c.deviceId === selectedDeviceId);
  }, [conversations, selectedDeviceId]);

  // Auto-select first conversation of the visible set if active is not in visible list
  useEffect(() => {
    if (visibleConversations.length > 0) {
      const exists = visibleConversations.some((c) => c.id === selectedConversationId);
      if (!exists) {
        setSelectedConversationId(visibleConversations[0].id);
      }
    } else {
      setSelectedConversationId(null);
    }
  }, [visibleConversations, selectedConversationId]);

  const activeConversation = visibleConversations.find(
    (c) => c.id === selectedConversationId
  ) || null;

  const handleSelectConversation = (convId) => {
    setSelectedConversationId(convId);
    setMobileShowChat(true);
  };

  return (
    <DashboardLayout
      title="Messages"
      subtitle="Real-time WhatsApp-style message logs with browser-side AES-256-GCM decryption"
    >
      <div className="flex-1 min-h-0 flex h-full w-full overflow-hidden relative">
        {/* Left Column: Conversation Directory */}
        <div
          className={`w-full lg:w-96 flex-shrink-0 h-full min-h-0 flex-col ${
            mobileShowChat ? "hidden lg:flex" : "flex"
          }`}
        >
          <ConversationList
            conversations={visibleConversations}
            devices={devices}
            selectedDeviceId={selectedDeviceId}
            onSelectDevice={setSelectedDeviceId}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onOpenKeyModal={() => setKeyModalOpen(true)}
            isKeyUnlocked={isUnlocked}
          />
        </div>

        {/* Right Column: Chat History & Bubble Area */}
        <div
          className={`flex-1 min-h-0 min-w-0 h-full flex-col ${
            !mobileShowChat ? "hidden lg:flex" : "flex"
          }`}
        >
          <ChatPanel
            conversation={activeConversation}
            onBackMobile={() => setMobileShowChat(false)}
            onOpenKeyModal={() => setKeyModalOpen(true)}
            isKeyUnlocked={isUnlocked}
          />
        </div>
      </div>

      <KeyUnlockModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
      />
    </DashboardLayout>
  );
}
