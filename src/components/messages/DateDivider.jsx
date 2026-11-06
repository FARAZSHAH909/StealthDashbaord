"use client";

import React from "react";
import { Calendar } from "lucide-react";

export default function DateDivider({ dateLabel }) {
  return (
    <div className="flex items-center justify-center my-4 sticky top-2 z-10 select-none">
      <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-[#182229]/95 backdrop-blur-md border border-[#2a3942]/70 text-[11px] font-medium text-[#8696a0] shadow-md shadow-black/30 tracking-wide uppercase">
        <Calendar className="w-3 h-3 text-emerald-400" />
        <span>{dateLabel}</span>
      </div>
    </div>
  );
}
