"use client";

import React from "react";
import { ExperienceListing } from "@/types/experience";
import { performAIAudit } from "@/utils/aiAudit";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from "lucide-react";

interface AiQualityAuditModalProps {
  listing: ExperienceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyImprovement?: (listingId: string, updates: Partial<ExperienceListing>) => void;
}

export const AiQualityAuditModal: React.FC<AiQualityAuditModalProps> = ({
  listing,
  isOpen,
  onClose,
  onApplyImprovement,
}) => {
  if (!isOpen || !listing) return null;

  const audit = performAIAudit(listing);

  // Quick 1-click AI Auto-Fix recommendation
  const handleAutoFix = () => {
    if (!onApplyImprovement) return;
    const updates: Partial<ExperienceListing> = {};
    if (!listing.meeting_point || listing.meeting_point.trim().length <= 5) {
      updates.meeting_point = "Starbucks Heritage Reserve lobby, opposite Horniman Circle Gardens";
    }
    if (listing.images.length < 2) {
      updates.images = [
        ...listing.images,
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
      ];
    }
    updates.status = "active";
    updates.health_score = 95;
    onApplyImprovement(listing.experience_id, updates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  AI Quality &amp; Booking Readiness Audit
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  ML Verified
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate max-w-md">
                {listing.experience_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Health Score Overview */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Listing Health Index
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-black tracking-tight text-white">
                  {audit.score}
                </span>
                <span className="text-sm text-slate-400 font-medium">/ 100</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-sm">
                {audit.summary}
              </p>
            </div>

            <div className="text-right">
              {audit.score >= 90 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Good to List (Optimal)</span>
                </div>
              ) : audit.score >= 50 ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Eligible to Publish</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Publishing Locked (&lt; 50)</span>
                </div>
              )}
            </div>
          </div>

          {/* Actionable ML Checklist */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Dataset Compliance &amp; Conversion Checklist</span>
            </h3>

            <div className="space-y-2.5">
              {audit.checks.map((chk) => (
                <div
                  key={chk.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    chk.passed
                      ? "bg-slate-50/60 border-slate-200/80 text-slate-800"
                      : "bg-amber-50/50 border-amber-200 text-amber-900"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {chk.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold flex items-center gap-2">
                          <span>{chk.label}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            [{chk.datasetField}]
                          </span>
                        </div>
                        {!chk.passed && (
                          <p className="text-xs text-amber-800 mt-1">
                            {chk.recommendation}
                          </p>
                        )}
                      </div>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        chk.passed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      +{chk.impactWeight}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all"
          >
            Close Audit
          </button>

          {audit.score < 90 && (
            <button
              onClick={handleAutoFix}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Apply AI 1-Click Optimization</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};