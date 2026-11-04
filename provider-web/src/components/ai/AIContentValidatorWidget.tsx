"use client";

import React, { useState, useMemo } from "react";
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Wand2,
  MapPin,
  XCircle,
} from "lucide-react";
import {
  checkProfanity,
  checkFakeClaims,
  checkClarity,
  validateExperienceLocations,
  validateFullListing,
  ShowLocationData,
  FullValidationResult,
} from "@/lib/aiValidator";

interface AIContentValidatorWidgetProps {
  title: string;
  description: string;
  onApplyPolish?: (polishedText: string) => void;
  show1: ShowLocationData;
  show2?: ShowLocationData | null;
  /** Called whenever validation state changes — parent uses this to enable/disable Publish */
  onValidationChange?: (result: { canPublish: boolean; blockingReason: string | null }) => void;
}

export const AIContentValidatorWidget: React.FC<AIContentValidatorWidgetProps> = ({
  title,
  description,
  onApplyPolish,
  show1,
  show2,
  onValidationChange,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Run all checks together via the combined validator
  const validation: FullValidationResult = useMemo(() => {
    const result = validateFullListing(title, description, show1, show2);
    onValidationChange?.({ canPublish: result.canPublish, blockingReason: result.blockingReason });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, show1, show2]);

  const { overallScore, blockingReason, profanity, fakeClaims, clarity, location } = validation;

  const hasIssues = Boolean(profanity?.hasBadWords || fakeClaims?.hasFakeClaims);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/95 backdrop-blur-xs shadow-2xs overflow-hidden transition-all duration-200">
      {/* ── Compact Header Bar ──────────────────────────────────────────── */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#0e8a5b] flex items-center justify-center shrink-0 border border-emerald-200/60">
            <Sparkles className="w-3.5 h-3.5" />
          </div>

          <div className="flex items-center gap-2 truncate text-xs">
            <span className="font-bold text-slate-800 shrink-0">AI Quality Check:</span>
            <span
              className={`font-black text-xs px-2 py-0.5 rounded-full ${
                overallScore >= 80
                  ? "bg-emerald-50 text-[#0e8a5b]"
                  : overallScore >= 55
                  ? "bg-amber-50 text-amber-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {overallScore}/100
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline truncate">
              {hasIssues ? "Review flagged words" : "Quality: Clean and Ready ✓"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {onApplyPolish && clarity.aiPolishedText && (
            <button
              type="button"
              onClick={() => onApplyPolish(clarity.aiPolishedText!)}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#0e8a5b] text-[10.5px] font-bold border border-emerald-200 cursor-pointer transition-colors"
            >
              <Wand2 className="w-3 h-3" />
              <span>Auto-Polish</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors"
          >
            <span>{isExpanded ? "Hide" : "Details"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>
      </div>

      {/* ── Hard-Block Banner (visible when canPublish = false) ─────────── */}
      {blockingReason && (
        <div className="mx-4 mb-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-800">
          <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block text-[11px] uppercase tracking-wide text-rose-700 mb-0.5">
              Publishing Blocked
            </span>
            <span className="leading-snug">{blockingReason}</span>
          </div>
        </div>
      )}

      {/* ── Expandable Detail Panels ───────────────────────────────────── */}
      {isExpanded && (
        <div className="px-4 pb-3.5 pt-1 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs animate-in fade-in duration-150">

          {/* Panel 1: Content Safety */}
          <div
            className={`p-2.5 rounded-xl border ${
              profanity.hasBadWords
                ? "bg-rose-50/70 border-rose-200 text-rose-800"
                : "bg-slate-50/80 border-slate-200/80 text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[11px] flex items-center gap-1.5">
                {profanity.hasBadWords ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0e8a5b]" />
                )}
                Safety Guard
              </span>
              <span className={`text-[10px] font-extrabold uppercase ${profanity.hasBadWords ? "text-rose-700" : "text-emerald-700"}`}>
                {profanity.hasBadWords ? "Blocked" : "Passed"}
              </span>
            </div>
            <p className="text-[10.5px] leading-snug text-slate-500">
              {profanity.hasBadWords
                ? `Flagged: "${profanity.badWordsFound.join('", "')}"`
                : "Content is clean and traveler-safe."}
            </p>
          </div>

          {/* Panel 2: Integrity Check */}
          <div
            className={`p-2.5 rounded-xl border ${
              fakeClaims.hasFakeClaims
                ? "bg-amber-50/70 border-amber-200 text-amber-800"
                : "bg-slate-50/80 border-slate-200/80 text-slate-700"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[11px] flex items-center gap-1.5">
                {fakeClaims.hasFakeClaims ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0e8a5b]" />
                )}
                Integrity
              </span>
              <span className={`text-[10px] font-extrabold uppercase ${fakeClaims.hasFakeClaims ? "text-amber-700" : "text-emerald-700"}`}>
                {fakeClaims.hasFakeClaims ? "Issue" : "Passed"}
              </span>
            </div>
            <p className="text-[10.5px] leading-snug text-slate-500">
              {fakeClaims.hasFakeClaims
                ? fakeClaims.claimsFound[0]
                : "No misleading or false claims found."}
            </p>
          </div>

          {/* Panel 3: Clarity */}
          <div className="p-2.5 rounded-xl border bg-slate-50/80 border-slate-200/80 text-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0e8a5b]" />
                Clarity: {clarity.level}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                {clarity.wordCount} words
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug">
              {clarity.issues.length > 0
                ? clarity.issues[0]
                : "Description is clear and engaging for travelers."}
            </p>
            {onApplyPolish && clarity.aiPolishedText && (
              <button
                type="button"
                onClick={() => onApplyPolish(clarity.aiPolishedText!)}
                className="mt-1.5 text-[10px] text-[#0e8a5b] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Wand2 className="w-2.5 h-2.5" />
                <span>Apply AI Polish</span>
              </button>
            )}
          </div>

          {/* Panel 4: Location */}
          <div className="p-2.5 rounded-xl border bg-slate-50/80 border-slate-200/80 text-slate-700">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-[11px] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0e8a5b]" />
                Location & Pin
              </span>
              <span className={`text-[10px] font-extrabold uppercase ${location.isValid ? "text-emerald-700" : "text-rose-600"}`}>
                {location.isValid ? "Verified" : "Missing"}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-500 leading-snug">
              {show1.venue || "Meeting point set"} • {show1.city || "Mumbai"}
              {show2 ? ` (+ Show 2 in ${show2.city || "Mumbai"})` : ""}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

