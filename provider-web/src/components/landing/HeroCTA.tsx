"use client";

import React from "react";
import Link from "next/link";
import { Play } from "lucide-react";

export const HeroCTA: React.FC = () => {
  return (
    <div className="flex flex-wrap items-center gap-3.5 pt-1">
      {/* Primary CTA */}
      <Link
        href="/experiences/new"
        className="w-[208px] h-[48px] rounded-[9px] bg-[#059669] hover:bg-[#047857] text-white font-bold text-[14px] shadow-sm transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
      >
        <span>List Your Experience</span>
        <span className="text-[16px] leading-none">&rarr;</span>
      </Link>

      {/* Secondary CTA */}
      <Link
        href="/dashboard"
        className="w-[200px] h-[48px] rounded-[9px] bg-white hover:bg-slate-50 text-[#0F172A] font-semibold text-[14px] border border-[#E2E8F0] shadow-sm transition-all duration-200 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
      >
        <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[#0F172A] shrink-0">
          <Play className="w-2.5 h-2.5 fill-[#0F172A] ml-0.5" />
        </span>
        <span>Watch 2-Min Demo</span>
      </Link>
    </div>
  );
};
