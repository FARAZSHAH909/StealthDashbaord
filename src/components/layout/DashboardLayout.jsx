"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import KeyUnlockModal from "../messages/KeyUnlockModal";
import { useAuth } from "@/lib/auth/AuthContext";
import { useKeyVault } from "@/lib/encryption/KeyVaultContext";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { HARDENED_ROUTES } from "@/lib/security/routesConfig";

export default function DashboardLayout({ children, title, subtitle }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, role, loading: authLoading } = useAuth();
  const { isUnlocked } = useKeyVault();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const { devices, loading: dataLoading, rawRecords } = useFirebaseData(selectedDeviceId);

  // Authentication guard: redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(HARDENED_ROUTES.GATEWAY_LOGIN);
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0c1317] flex items-center justify-center text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-[#8696a0]">Verifying Administrator Credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const isMessagesPage =
    pathname?.includes("/messages") ||
    pathname?.includes("/encrypted-stream-terminal");

  return (
    <div className="h-screen bg-[#0c1317] flex flex-col text-slate-100 antialiased overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenKeyModal={() => setKeyModalOpen(true)}
      />

      {/* Main Shell */}
      <div className="lg:pl-64 flex flex-col h-screen overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          devices={devices}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
          onOpenKeyModal={() => setKeyModalOpen(true)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        {/* Content Pane */}
        <main
          className={`flex-1 min-h-0 flex flex-col relative ${
            isMessagesPage ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {children}
        </main>
      </div>

      {/* In-Memory Key Decryption Modal */}
      <KeyUnlockModal
        isOpen={keyModalOpen}
        onClose={() => setKeyModalOpen(false)}
      />
    </div>
  );
}

