"use client";

import React, { useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useFirebaseData } from "@/hooks/useFirebaseData";
import { getAppMeta } from "@/lib/utils/formatters";
import { BarChart3, TrendingUp, Calendar, Layers, Smartphone, PieChart } from "lucide-react";

export default function AnalyticsPage() {
  const { allMessages, applications, devices } = useFirebaseData();

  // Hourly message histogram (24 hours)
  const hourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    for (const m of allMessages) {
      const d = new Date(Number(m.timestamp));
      hours[d.getHours()]++;
    }
    const max = Math.max(...hours, 1);
    return { hours, max };
  }, [allMessages]);

  // Day of week distribution
  const dayOfWeekData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = Array(7).fill(0);
    for (const m of allMessages) {
      const d = new Date(Number(m.timestamp));
      counts[d.getDay()]++;
    }
    const max = Math.max(...counts, 1);
    return days.map((day, idx) => ({ day, count: counts[idx], percentage: (counts[idx] / max) * 100 }));
  }, [allMessages]);

  return (
    <DashboardLayout
      title="Advanced Analytics"
      subtitle="Temporal activity patterns, package frequency, and device telemetry metrics"
    >
      <div className="p-4 sm:p-6 space-y-6">
        {/* Top summary row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <div className="flex items-center justify-between text-[#8696a0] text-xs">
              <span>Overall Capture Velocity</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-2">
              {allMessages.length} total
            </div>
            <p className="text-[11px] text-emerald-400 mt-1">100% Realtime Database verified</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <div className="flex items-center justify-between text-[#8696a0] text-xs">
              <span>Dominant App</span>
              <Layers className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-white truncate mt-2">
              {applications[0] ? getAppMeta(applications[0].pkg).name : "None"}
            </div>
            <p className="text-[11px] text-[#8696a0] mt-1 font-mono">
              {applications[0] ? `${applications[0].count} messages logged` : "No data"}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <div className="flex items-center justify-between text-[#8696a0] text-xs">
              <span>Average per Device</span>
              <Smartphone className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-2">
              {devices.length > 0 ? Math.round(allMessages.length / devices.length) : 0}
            </div>
            <p className="text-[11px] text-[#8696a0] mt-1">Messages / hardware target</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Time of Day Histogram */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <h3 className="text-sm font-semibold text-white mb-1">Time of Day Distribution</h3>
            <p className="text-xs text-[#8696a0] mb-4">Notification volume across 24-hour cycle</p>

            <div className="h-44 flex items-end gap-1 pt-6 pb-2 border-b border-[#222d34]">
              {hourlyData.hours.map((count, hr) => {
                const height = Math.max((count / hourlyData.max) * 100, 6);
                return (
                  <div key={hr} className="flex-1 flex flex-col items-center group relative">
                    <div className="absolute -top-7 hidden group-hover:flex px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-white font-mono whitespace-nowrap z-10">
                      {hr}:00 — {count}
                    </div>
                    <div
                      style={{ height: `${height}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        count > 0 ? "bg-emerald-500 group-hover:bg-emerald-400" : "bg-[#202c33]"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-[#8696a0] font-mono mt-2 px-1">
              <span>00h</span>
              <span>06h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </div>

          {/* Chart 2: Day of Week Breakdown */}
          <div className="p-5 rounded-2xl bg-[#111b21] border border-[#222d34]">
            <h3 className="text-sm font-semibold text-white mb-1">Weekly Activity Pattern</h3>
            <p className="text-xs text-[#8696a0] mb-4">Notification captures aggregated by day of week</p>

            <div className="space-y-2.5">
              {dayOfWeekData.map((d) => (
                <div key={d.day} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-mono text-[#8696a0]">{d.day}</span>
                  <div className="flex-1 h-3 rounded-full bg-[#202c33] overflow-hidden">
                    <div
                      style={{ width: `${Math.max(d.percentage, 2)}%` }}
                      className="h-full rounded-full bg-emerald-500"
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-slate-300">{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

