"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, MapPin, Heart, Sparkles } from "lucide-react";

export const ExperienceShowcase: React.FC = () => {
  const [isFavorited, setIsFavorited] = useState(false);
  const [showPinTooltip, setShowPinTooltip] = useState(false);

  return (
    <div className="relative w-full max-w-[480px] sm:max-w-[530px] h-[410px] select-none">
      {/* ============================================================ */}
      {/* 1. ANIMATED LIVE DASHED TRAVEL ROUTE (SVG)                   */}
      {/* ============================================================ */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <svg className="w-full h-full" viewBox="0 0 520 410" fill="none">
          <defs>
            <filter id="routeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000000" floodOpacity="0.55" />
            </filter>
          </defs>

          {/* Upper dashed connector: From Earnings Card down to 3D Pin */}
          <path
            d="M 448 62 C 458 80, 442 92, 428 102"
            stroke="white"
            strokeWidth="2.8"
            strokeDasharray="4 4"
            strokeLinecap="round"
            filter="url(#routeShadow)"
            className="animate-dash-flow"
          />

          {/* Main sweeping dashed route: Exactly from bottom tip of 3D Pin down to the Road */}
          <path
            d="M 424 168 C 445 235, 405 295, 308 354"
            stroke="white"
            strokeWidth="3.2"
            strokeDasharray="6 6"
            strokeLinecap="round"
            filter="url(#routeShadow)"
            className="animate-dash-flow"
          />
        </svg>

        {/* Trail Endpoint on the Road: White Teardrop Pin + Authentic Local Experience Plaque */}
        {/* Positioned at y=350px (Sunset Kayaking card ends at y=290px -> 60px vertical clearance, ZERO OVERLAP!) */}
        <div className="absolute left-[225px] sm:left-[248px] top-[346px] flex items-center gap-1.5 z-30 pointer-events-auto group">
          {/* Small White Teardrop Pin Marker on the road */}
          <div className="relative filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] transform -rotate-12 transition-transform duration-200 group-hover:scale-115">
            <svg viewBox="0 0 20 26" fill="white" className="w-4 h-5.5 shrink-0">
              <path d="M10 0 C4.5 0 0 4.5 0 10 C0 16 10 26 10 26 C10 26 20 16 20 10 C20 4.5 15.5 0 10 0 Z" />
              <circle cx="10" cy="10" r="3" fill="#0F172A" />
            </svg>
          </div>

          {/* Authentic Local Experience Dark Plaque: Angled slightly like a coastal road sign */}
          <div className="bg-[#0A1628]/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-teal-300/40 shadow-[0_8px_24px_rgba(0,0,0,0.5)] tracking-wide whitespace-nowrap flex items-center gap-2 transform -rotate-2 hover:rotate-0 hover:bg-[#0A1628] hover:border-teal-300 transition-all duration-300 hover:scale-[1.03]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shrink-0" />
            <span className="font-script text-[15px] sm:text-[16px] font-bold tracking-wide text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Authentic Local Experience
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SUNSET KAYAKING CARD (Left: 0, Top: 15px, Height: ~275px) */}
      {/* ============================================================ */}
      <div className="absolute left-0 top-[15px] z-20 w-[265px] sm:w-[285px] bg-white rounded-[22px] p-2.5 sm:p-3 shadow-[0_18px_42px_rgba(15,23,42,0.12)] border border-[#E2E8F0] space-y-2.5 animate-in fade-in slide-in-from-left-4 duration-700 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(15,23,42,0.16)] transition-all duration-300">
        {/* Exact Sunset Kayaking Photo from User Reference */}
        <div className="relative aspect-[16/10.5] w-full rounded-[16px] overflow-hidden bg-amber-50 group/img">
          <Image
            src="/dashboard/kayaking_exact_hq.png"
            alt="Sunset Kayaking at Versova"
            fill
            className="object-cover group-hover/img:scale-105 transition-transform duration-500"
            priority
            unoptimized
          />

          {/* Interactive Heart Button overlayed with haptic spring feel */}
          <button
            type="button"
            onClick={() => setIsFavorited(!isFavorited)}
            aria-label="Add to favorites"
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-transform active:scale-75 z-10"
          >
            {isFavorited ? (
              <div className="w-7 h-7 rounded-full bg-white/95 backdrop-blur-md flex items-center justify-center shadow-md animate-in zoom-in-75 duration-200">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full opacity-0 hover:opacity-100 bg-white/40 backdrop-blur-sm transition-opacity flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-slate-800" />
              </div>
            )}
          </button>
        </div>

        {/* Card Info Section with Compatible Sleek Typography */}
        <div className="px-0.5 space-y-1.5">
          <h3 className="text-[14.5px] sm:text-[15.5px] font-black text-[#0F172A] tracking-tight leading-snug font-display">
            Sunset Kayaking at Versova
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 text-[12px]">
            <Star className="w-3.5 h-3.5 fill-[#F59E0B] text-[#F59E0B]" />
            <span className="font-extrabold text-[#0F172A]">4.8</span>
            <span className="text-slate-400 font-normal text-[11px]">(142 reviews)</span>
          </div>

          {/* Location */}
          <div className="text-[11.5px] text-slate-500 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
            <span>Versova Beach, Mumbai</span>
          </div>

          {/* Price - Matches user reference */}
          <div className="pt-0.5 flex items-baseline">
            <span className="text-[16.5px] sm:text-[17.5px] font-black text-[#059669] font-display">
              ₹1,200
            </span>
            <span className="text-[11px] text-slate-400 font-normal ml-1">
              / person
            </span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. FLOATING 'YOUR EARNINGS' BADGE (Top-Right: ~155px wide)    */}
      {/* ============================================================ */}
      <div className="absolute right-0 top-0 z-30 animate-in fade-in slide-in-from-top-4 duration-700 delay-150">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 px-3.5 shadow-[0_12px_28px_rgba(15,23,42,0.10)] border border-[#E2E8F0] flex items-center gap-2.5 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          {/* Green concentric target icon */}
          <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center shrink-0">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#059669] flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            </div>
          </div>
          <div>
            <div className="text-[9.5px] font-semibold text-slate-500 leading-none">
              Your Earnings
            </div>
            <div className="text-[16px] sm:text-[17.5px] font-black text-[#005A36] leading-snug font-display">
              ₹48,500
            </div>
            <div className="text-[9px] sm:text-[9.5px] font-medium text-slate-500 leading-none">
              this month <span className="text-[#059669] font-bold">↑ 12%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. EXACT 3D TEAL/ORANGE MAP PIN (STRICT 52px × 68px, NO EXPAND)*/}
      {/* ============================================================ */}
      <div
        className="absolute right-[48px] sm:right-[56px] top-[92px] z-30 animate-in fade-in zoom-in-75 duration-800 delay-300"
        onMouseEnter={() => setShowPinTooltip(true)}
        onMouseLeave={() => setShowPinTooltip(false)}
      >
        <div
          className="relative filter drop-shadow-[0_12px_22px_rgba(0,0,0,0.38)] animate-bounce-gentle cursor-pointer hover:scale-110 transition-transform duration-300 shrink-0"
          style={{ width: "52px", height: "68px", maxWidth: "52px", maxHeight: "68px" }}
        >
          <svg
            width="52"
            height="68"
            viewBox="0 0 64 80"
            style={{ width: "52px", height: "68px", maxWidth: "52px", maxHeight: "68px" }}
            className="block shrink-0"
          >
            <defs>
              {/* Outer 3D Teal Body Gradient with realistic light direction */}
              <linearGradient id="pinTeal3D" x1="15%" y1="0%" x2="85%" y2="100%">
                <stop offset="0%" stopColor="#2DD4BF" />
                <stop offset="30%" stopColor="#14B8A6" />
                <stop offset="65%" stopColor="#0D9488" />
                <stop offset="100%" stopColor="#044E3D" />
              </linearGradient>

              {/* Inner Rim Bevel Light */}
              <linearGradient id="innerRimGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0F766E" stopOpacity="0.2" />
              </linearGradient>

              {/* 3D Shiny Orange Sphere Gradient */}
              <radialGradient id="orangeSphere3D" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#FED7AA" />
                <stop offset="25%" stopColor="#FB923C" />
                <stop offset="65%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#9A3412" />
              </radialGradient>

              {/* Ambient Occlusion Cavity Shadow */}
              <radialGradient id="innerCavityShadow" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#032E24" stopOpacity="0" />
                <stop offset="100%" stopColor="#02211A" stopOpacity="0.75" />
              </radialGradient>
            </defs>

            {/* 3D Teardrop Pin Body */}
            <path
              d="M32 0 C14.3 0 0 14.3 0 32 C0 50 32 80 32 80 C32 80 64 50 64 32 C64 14.3 49.7 0 32 0 Z"
              fill="url(#pinTeal3D)"
            />

            {/* Recessed cavity shadow ring */}
            <circle cx="32" cy="30" r="17.5" fill="#044E3D" opacity="0.6" />
            <circle cx="32" cy="30" r="17.5" fill="url(#innerCavityShadow)" />

            {/* Inner rim highlight stroke */}
            <circle cx="32" cy="30" r="17" stroke="url(#innerRimGlow)" strokeWidth="1.5" fill="none" />

            {/* Supporting neck/pedestal under sphere */}
            <path d="M29 36 L35 36 L33 42 L31 42 Z" fill="#9A3412" opacity="0.85" />

            {/* 3D Shiny Orange Sphere */}
            <circle cx="32" cy="30" r="13.5" fill="url(#orangeSphere3D)" />

            {/* Crisp specular gloss curved reflection */}
            <ellipse cx="27" cy="24.5" rx="4" ry="2.2" fill="white" opacity="0.9" />
          </svg>

          {/* Creative Interactive Floating Tooltip on Hover */}
          {showPinTooltip && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xl whitespace-nowrap pointer-events-none animate-in fade-in zoom-in-90 duration-150 border border-slate-700 flex items-center gap-1 z-50">
              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
              <span>Versova Sunset Point</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
