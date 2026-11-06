"use client";

import React, { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { getAppMeta } from "@/lib/utils/formatters";
import { Layers, ArrowRight, MessageSquare, Smartphone } from "lucide-react";
import Link from "next/link";

export default function ApplicationsPage() {
  const { applications, allMessages, devices } = useFirebaseData();

  const appData = useMemo(() => {
    return applications.map((item) => {
      const meta = getAppMeta(item.pkg);
      const msgs = allMessages.filter((m) => m.appPackage === item.pkg);
      const appDevices = new Set(msgs.map((m) => m.deviceId));

      return {
        pkg: item.pkg,
        name: meta.name,
        color: meta.color,
        count: item.count,
        deviceCount: appDevices.size,
        latestTs: Math.max(...msgs.map((m) => m.timestamp), 0),
      };
    });
  }, [applications, allMessages]);

  return (
    <DashboardLayout
      title="Monitored Applications"
      subtitle="Overview of Android applications with active notification interception"
    >
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {appData.map((app) => (
            <div
              key={app.pkg}
              className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34] flex flex-col justify-between hover:border-[#374248] transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${app.color} flex items-center justify-center text-white font-bold text-sm shadow`}>
                      {app.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{app.name}</h3>
                      <p className="text-[10px] text-[#8696a0] font-mono truncate max-w-[150px]">
                        {app.pkg}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-semibold">
                    {app.count} msgs
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-[#222d34] flex items-center justify-between text-xs text-[#8696a0]">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                    <span>{app.deviceCount} Devices</span>
                  </span>
                  <span className="font-mono text-[11px]">Active</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#222d34]">
                <Link
                  href="/dashboard/messages"
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-[#202c33] hover:bg-[#2a3942] text-emerald-400 text-xs font-semibold transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>View Messages</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

