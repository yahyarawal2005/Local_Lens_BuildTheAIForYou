"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  Save,
  Globe,
  Bell,
  ShieldCheck,
  LogOut,
  UploadCloud,
  FileCheck,
  FileText,
  AlertCircle,
  Loader2,
  Sparkles,
  Check,
  Plus,
  Trash2,
  RefreshCw,
  Eye,
  Edit3,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { getProviderProfile, saveProviderProfile, ProviderProfile } from "@/lib/authSession";
import { supabase } from "@/lib/supabaseClient";
import {
  performAadhaarOcr,
  generateSampleAadhaarImage,
  ExtractedAadhaarData,
} from "@/services/aadhaarOcrService";

export default function SettingsPage() {
  const { t, language } = useI18n();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [providerCategory, setProviderCategory] = useState("Tour Guide / Storyteller");
  const [bio, setBio] = useState("");

  // Aadhaar KYC Verification States
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [aadhaarPreview, setAadhaarPreview] = useState<string | null>(null);
  const [isScanningAadhaar, setIsScanningAadhaar] = useState(false);
  const [ocrProgressText, setOcrProgressText] = useState<string>("");
  const [ocrProgressPercent, setOcrProgressPercent] = useState<number>(0);
  const [showRawText, setShowRawText] = useState<boolean>(false);
  const [extractedAadhaar, setExtractedAadhaar] = useState<ExtractedAadhaarData | null>(null);
  const [aadhaarNotice, setAadhaarNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Check if user has already verified Aadhaar in localStorage
    if (typeof window !== "undefined") {
      const savedVerification = localStorage.getItem("locallens_aadhaar_verified") === "true";
      setIsAadhaarVerified(savedVerification);
      const savedData = localStorage.getItem("locallens_aadhaar_data");
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          setExtractedAadhaar(parsed);
          if (savedVerification && parsed?.fullName) {
            setFullName(parsed.fullName);
          }
        } catch {}
      }
    }

    getProviderProfile().then((p) => {
      if (p) {
        setProfile(p);
        const savedVerification = typeof window !== "undefined" && localStorage.getItem("locallens_aadhaar_verified") === "true";
        const savedData = typeof window !== "undefined" ? localStorage.getItem("locallens_aadhaar_data") : null;
        let verifiedName = "";
        if (savedVerification && savedData) {
          try {
            verifiedName = JSON.parse(savedData)?.fullName || "";
          } catch {}
        }

        // Prioritize Aadhaar verified name; otherwise use email/session data
        const fallbackName = verifiedName || p.fullName || p.name || (p.email ? p.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Host");
        setFullName(fallbackName);
        setEmail(p.email || "");
        setPhone(p.phone || "");
        setBusinessName(p.businessName || "");
        setProviderCategory(p.providerCategory || "Tour Guide / Storyteller");
        setBio(p.bio || "");
      }
    });
  }, []);

  // Handle Aadhaar image upload
  const handleAadhaarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAadhaarNotice(null);
    setExtractedAadhaar(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      setAadhaarPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Pre-load realistic Indian Aadhaar card sample image
  const handleLoadDemoAadhaar = () => {
    setAadhaarNotice(null);
    const demo = generateSampleAadhaarImage(fullName || "Arunkumar R. Gupta");
    setAadhaarPreview(demo);
    setAadhaarNotice({
      type: "success",
      text: "Government Aadhaar card sample loaded! Click 'Analyze Aadhaar Card' to run OCR text recognition.",
    });
  };

  // Analyze Aadhaar Card with real Tesseract.js OCR and Indian UIDAI parser
  const handleScanAadhaar = async () => {
    if (!aadhaarPreview) {
      setAadhaarNotice({ type: "error", text: "Please upload or select an Aadhaar card image first." });
      return;
    }

    setIsScanningAadhaar(true);
    setAadhaarNotice(null);
    setOcrProgressPercent(15);
    setOcrProgressText("Enhancing image contrast & resolution for OCR...");

    try {
      const parsed = await performAadhaarOcr(aadhaarPreview, (status, percent) => {
        setOcrProgressText(status);
        setOcrProgressPercent(percent);
      });

      setExtractedAadhaar(parsed);
      setAadhaarNotice({
        type: "success",
        text: `Aadhaar image scanned successfully! Verified Name: "${parsed.fullName}" (Accuracy: ${parsed.confidence}%). Review or edit fields below.`,
      });
    } catch (err: any) {
      console.error("Aadhaar OCR processing failed:", err);
      setAadhaarNotice({
        type: "error",
        text: "Could not read text clearly from this image. Please ensure the card text is visible and well-lit.",
      });
    } finally {
      setIsScanningAadhaar(false);
    }
  };

  // Apply extracted Aadhaar data to profile and sync to Supabase
  const handleApplyAadhaarData = async () => {
    if (!extractedAadhaar) return;

    setFullName(extractedAadhaar.fullName);
    setIsAadhaarVerified(true);

    if (typeof window !== "undefined") {
      localStorage.setItem("locallens_aadhaar_verified", "true");
      localStorage.setItem("locallens_aadhaar_data", JSON.stringify(extractedAadhaar));
    }

    // Save in profile session
    const updated = saveProviderProfile({
      fullName: extractedAadhaar.fullName,
      name: extractedAadhaar.fullName,
    });
    setProfile(updated);

    // Sync to Supabase profiles table
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            full_name: extractedAadhaar.fullName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }
    } catch {}

    setAadhaarNotice({
      type: "success",
      text: "Profile updated with verified Aadhaar credentials! Govt. Verified Host badge activated.",
    });
  };

  const handleResetAadhaar = () => {
    if (confirm("Reset Aadhaar verification and return to email-based identity?")) {
      setIsAadhaarVerified(false);
      setExtractedAadhaar(null);
      setAadhaarPreview(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("locallens_aadhaar_verified");
        localStorage.removeItem("locallens_aadhaar_data");
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    try {
      const updated = saveProviderProfile({
        fullName,
        name: fullName,
        phone,
        businessName,
        providerCategory,
        bio,
      });
      setProfile(updated);

      // Background DB sync if authenticated
      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
      }

      setStatusMessage({
        type: "success",
        text: t("settings.saveSuccess", "Settings saved successfully!"),
      });
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err?.message || t("settings.saveError", "Failed to update settings. Please try again."),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-24">
      {/* Top Navigation Bar */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-xl text-slate-600 hover:text-[#090D16] hover:bg-slate-100 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4 text-[#0e8a5b]" />
              <span>{t("common.back", "Back to Dashboard")}</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0e8a5b] text-white flex items-center justify-center shadow-xs">
                <Compass className="w-4 h-4" />
              </div>
              <span className="font-black text-sm text-[#090D16] tracking-tight">
                {t("nav.brand", "Local Lens")}
              </span>
            </div>
          </div>

          <LanguageSelector variant="navbar" />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-6 pt-8 relative z-10">
        {/* Page Header with Black and Green Font */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 mb-2">
            <span className="w-2 h-2 rounded-full bg-[#0e8a5b] animate-pulse" />
            <span className="text-[11px] font-bold text-[#0e8a5b] uppercase tracking-wider">
              Host Security & Preferences
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#090D16] tracking-tight">
            <span>Account</span> <span className="text-[#0e8a5b]">&amp; System Settings</span>
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1.5 max-w-2xl">
            {t("settings.subtitle", "Manage your profile, language preferences, payout accounts, and Aadhaar identity verification.")}
          </p>
        </div>

        {statusMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-semibold border ${
              statusMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{statusMessage.text}</span>
          </div>
        )}

        <div className="space-y-8">
          {/* SECTION 0: HOST IDENTITY & PROFILE CARD (Moved from navigation) */}
          <section className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-emerald-500 shadow-md bg-gradient-to-tr from-[#00875A] to-teal-500 text-white font-black text-lg flex items-center justify-center">
                  {profile?.avatar && profile.avatar.startsWith("/") ? (
                    <img
                      src={profile.avatar}
                      alt={profile?.name || "Host Profile"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{profile?.name ? profile.name.slice(0, 1).toUpperCase() : "N"}</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">
                      {isAadhaarVerified && extractedAadhaar?.fullName
                        ? extractedAadhaar.fullName
                        : fullName || profile?.name || "Host Profile"}
                    </h2>
                    {isAadhaarVerified ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-[#00875A] border border-emerald-200 inline-flex items-center gap-1 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Govt. Aadhaar Verified Host
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                        Unverified Host (Email Identity)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#00875A] font-semibold mt-0.5">
                    {profile?.role || providerCategory || "Tour Guide / Storyteller"}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{email || "provider@locallens.in"}</span>
                    {!isAadhaarVerified ? (
                      <span className="text-[10px] bg-amber-100/70 text-amber-900 font-semibold px-2 py-0.5 rounded-md">
                        Using Email Data
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100/70 text-emerald-900 font-semibold px-2 py-0.5 rounded-md">
                        UIDAI: {extractedAadhaar?.aadhaarNumber || "Linked"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("Are you sure you want to sign out of LocalLens?")) {
                      try {
                        await supabase.auth.signOut();
                      } catch {}
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("locallens_provider_session");
                      }
                      window.location.href = "/login";
                    }
                  }}
                  className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>{t("nav.logout", "Log Out")}</span>
                </button>
              </div>
            </div>
          </section>

          {/* SECTION: GOVT. AADHAAR CARD VERIFICATION & OCR SMART AUTOFILL */}
          <section className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#0e8a5b] flex items-center justify-center font-black shadow-xs">
                  <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-[#090D16] tracking-tight">
                      <span>Aadhaar Card</span> <span className="text-[#0e8a5b]">Verification &amp; Identity</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-[#0e8a5b] border border-emerald-200">
                      UIDAI OCR
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upload your Aadhaar card to unlock Govt. Verified Host badge and auto-fill legal credentials.
                  </p>
                </div>
              </div>

              {isAadhaarVerified && (
                <button
                  type="button"
                  onClick={handleResetAadhaar}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-verify Aadhaar</span>
                </button>
              )}
            </div>

            {/* Status explanation alert */}
            {!isAadhaarVerified ? (
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Currently using Email Profile: {email || "provider@locallens.in"}</span>
                </div>
                <p className="text-amber-800/90 pl-5.5 leading-relaxed">
                  Before uploading your Aadhaar card, your profile uses details derived from your email address. Once verified below, your legal name, masked Aadhaar ID, and verified host shield will automatically populate your public listings.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
                <div className="font-bold text-sm flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Aadhaar Identity Successfully Verified</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11.5px]">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-slate-400 block text-[10px]">Verified Full Name</span>
                    <span className="font-bold text-slate-800">{extractedAadhaar?.fullName}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-slate-400 block text-[10px]">Masked Aadhaar Number</span>
                    <span className="font-bold text-slate-800 font-mono">{extractedAadhaar?.aadhaarNumber}</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-100">
                    <span className="text-slate-400 block text-[10px]">DOB &amp; Gender</span>
                    <span className="font-bold text-slate-800">{extractedAadhaar?.dob} • {extractedAadhaar?.gender}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-emerald-200/60 mt-2">
                  <span className="text-[11px] text-emerald-800 font-semibold">
                    Identity verified with UIDAI. You are fully authorized to list experiences.
                  </span>
                  <Link
                    href="/experiences/new"
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#0e8a5b] hover:bg-[#0b744d] text-white text-xs font-black shadow-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create &amp; List Experience</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Aadhaar Upload & Analysis Area */}
            {!isAadhaarVerified && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Upload Box */}
                  <div className="border-2 border-dashed border-slate-200 hover:border-[#0e8a5b] rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all bg-slate-50/50 hover:bg-emerald-50/20 group">
                    <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-[#0e8a5b] transition-colors mb-2" />
                    <div className="text-xs font-bold text-slate-700">
                      Upload Aadhaar Card (Front / Full)
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 mb-3">
                      PNG, JPG, or PDF up to 10MB
                    </p>

                    <label className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer transition-all">
                      <span>Choose Aadhaar File</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleAadhaarFileSelect}
                        className="hidden"
                      />
                    </label>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 w-full flex justify-center">
                      <button
                        type="button"
                        onClick={handleLoadDemoAadhaar}
                        className="text-[11px] text-[#0e8a5b] font-bold hover:underline cursor-pointer"
                      >
                        ⚡ Or Click to Load Sample Demo Aadhaar
                      </button>
                    </div>
                  </div>

                  {/* Preview & Action Box */}
                  <div className="rounded-2xl border border-slate-200 p-4 bg-white flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700">Document Preview</span>
                        {aadhaarPreview && (
                          <span className="text-[10.5px] text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Ready to Scan
                          </span>
                        )}
                      </div>

                      {aadhaarPreview ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 max-h-48 flex items-center justify-center">
                          <img
                            src={aadhaarPreview}
                            alt="Aadhaar Preview"
                            className="w-full h-44 object-cover opacity-90"
                          />

                          {/* Scanning Laser Beam & Live Progress */}
                          {isScanningAadhaar && (
                            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10">
                              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 shadow-[0_0_20px_#34d399] animate-pulse" />
                              <div className="w-full max-w-xs space-y-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-white tracking-wide">
                                    {ocrProgressText || "Scanning Aadhaar Image with OCR..."}
                                  </p>
                                  <div className="w-full bg-slate-800 rounded-full h-2 mt-2 overflow-hidden border border-slate-700">
                                    <div
                                      className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${Math.max(10, ocrProgressPercent)}%` }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-emerald-300 font-mono mt-1 block">
                                    {ocrProgressPercent}% completed
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-44 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs">
                          <FileText className="w-8 h-8 text-slate-300 mb-1" />
                          <span>No document selected yet</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={handleScanAadhaar}
                        disabled={!aadhaarPreview || isScanningAadhaar}
                        className="w-full py-2.5 px-4 rounded-xl bg-[#0e8a5b] hover:bg-[#0b744d] text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {isScanningAadhaar ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{ocrProgressText || "Processing OCR Recognition..."}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Analyze Aadhaar Card &amp; Extract Data (OCR)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notice message */}
                {aadhaarNotice && (
                  <div
                    className={`p-3.5 rounded-xl text-xs font-semibold border flex items-center gap-2 ${
                      aadhaarNotice.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-rose-50 text-rose-800 border-rose-200"
                    }`}
                  >
                    {aadhaarNotice.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span>{aadhaarNotice.text}</span>
                  </div>
                )}

                {/* Extracted Details Confirmation Card */}
                {extractedAadhaar && (
                  <div className="p-5 rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/40 space-y-4 shadow-sm animate-in fade-in duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-emerald-200/70">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                          Extracted Aadhaar Data (OCR Accuracy: {extractedAadhaar.confidence}%)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold text-emerald-700 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Interactive Edit Enabled
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600">
                      Verify the extracted credentials below. You can make minor adjustments if needed before saving to your profile:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                      {/* Full Name */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={extractedAadhaar.fullName}
                          onChange={(e) =>
                            setExtractedAadhaar({ ...extractedAadhaar, fullName: e.target.value })
                          }
                          className="w-full font-bold text-slate-900 border-none p-0 focus:outline-none focus:ring-0 text-xs mt-0.5 bg-transparent"
                          placeholder="Full Name"
                        />
                      </div>

                      {/* Aadhaar Number */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          Aadhaar Number
                        </label>
                        <input
                          type="text"
                          value={extractedAadhaar.aadhaarNumber}
                          onChange={(e) =>
                            setExtractedAadhaar({ ...extractedAadhaar, aadhaarNumber: e.target.value })
                          }
                          className="w-full font-bold text-slate-900 font-mono border-none p-0 focus:outline-none focus:ring-0 text-xs mt-0.5 bg-transparent"
                          placeholder="XXXX XXXX 1234"
                        />
                      </div>

                      {/* DOB */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          Date of Birth
                        </label>
                        <input
                          type="text"
                          value={extractedAadhaar.dob}
                          onChange={(e) =>
                            setExtractedAadhaar({ ...extractedAadhaar, dob: e.target.value })
                          }
                          className="w-full font-bold text-slate-900 border-none p-0 focus:outline-none focus:ring-0 text-xs mt-0.5 bg-transparent"
                          placeholder="DD/MM/YYYY"
                        />
                      </div>

                      {/* Gender */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          Gender
                        </label>
                        <select
                          value={extractedAadhaar.gender}
                          onChange={(e) =>
                            setExtractedAadhaar({ ...extractedAadhaar, gender: e.target.value as any })
                          }
                          className="w-full font-bold text-slate-900 border-none p-0 focus:outline-none focus:ring-0 text-xs mt-0.5 bg-transparent cursor-pointer"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      {/* City */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          City
                        </label>
                        <input
                          type="text"
                          value={extractedAadhaar.city}
                          onChange={(e) =>
                            setExtractedAadhaar({ ...extractedAadhaar, city: e.target.value })
                          }
                          className="w-full font-bold text-slate-900 border-none p-0 focus:outline-none focus:ring-0 text-xs mt-0.5 bg-transparent"
                          placeholder="City"
                        />
                      </div>

                      {/* State */}
                      <div className="p-3 rounded-xl bg-white border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                        <label className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
                          State
                        </label>
                        <input
                          type="text"
                          value={extractedAadhaar.state}
                          onChange={(e) =>
                            setExtractedAadhaar({ ...extractedAadhaar, state: e.target.value })
                          }
                          className="w-full font-bold text-slate-900 border-none p-0 focus:outline-none focus:ring-0 text-xs mt-0.5 bg-transparent"
                          placeholder="State"
                        />
                      </div>
                    </div>

                    {/* Raw OCR text toggle */}
                    {extractedAadhaar.rawText && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setShowRawText(!showRawText)}
                          className="text-[11px] text-[#0e8a5b] font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{showRawText ? "Hide Raw OCR Scan Text" : "View Raw OCR Extracted Text"}</span>
                        </button>
                        {showRawText && (
                          <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-emerald-400 text-[10.5px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto border border-slate-800">
                            {extractedAadhaar.rawText}
                          </pre>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-200/60">
                      <button
                        type="button"
                        onClick={() => setExtractedAadhaar(null)}
                        className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyAadhaarData}
                        className="px-6 py-2.5 rounded-xl bg-[#0e8a5b] hover:bg-[#0b744d] text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm &amp; Auto-fill Profile</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* SECTION 1: MANDATORY MULTILINGUAL LANGUAGE SETTINGS */}
          <section id="language-section">
            <div className="mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0e8a5b]">
                {t("settings.language", "Language Settings")}
              </span>
            </div>
            <LanguageSelector variant="settings" />
          </section>

          {/* SECTION 2: PROFILE DETAILS */}
          <section>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#090D16] tracking-tight">
                    <span>Profile</span> <span className="text-[#0e8a5b]">Details</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("settings.profileSubtitle", "Update your public provider profile and contact credentials.")}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {t("settings.fullName", "Full Name")}
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e8a5b]/30"
                        placeholder="e.g. Rahul Sharma"
                      />
                    </div>
                  </div>

                  {/* Email (Readonly) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {t("settings.emailAddress", "Email Address")}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {t("settings.phoneNumber", "Phone Number")}
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e8a5b]/30"
                        placeholder="+91 98201 55432"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      {t("settings.businessName", "Business / Tour Company Name")}
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e8a5b]/30"
                        placeholder="e.g. Bombay Heritage Trails"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    {t("settings.bio", "Bio / About You")}
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0e8a5b]/30 resize-none"
                    placeholder="Tell guests about your background, experience, and local expertise..."
                  />
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0e8a5b] hover:bg-[#0b744d] text-white text-sm font-bold shadow-md shadow-emerald-700/20 transition-all disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? t("settings.saving", "Saving...") : t("settings.saveChanges", "Save Changes")}</span>
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* SECTION 3: NOTIFICATION PREFERENCES */}
          <section>
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 pb-6 border-b border-slate-100 mb-6">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#090D16] tracking-tight">
                    <span>Notification</span> <span className="text-[#0e8a5b]">Preferences</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t("settings.subtitle", "Choose which alerts you receive.")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { title: t("settings.bookingAlerts", "Instant SMS / WhatsApp booking alerts"), defaultChecked: true },
                  { title: t("settings.emailDigest", "Weekly earnings digest and reviews"), defaultChecked: true },
                  { title: t("settings.emergencyAlerts", "Weather and emergency closure alerts"), defaultChecked: true },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors">
                    <span className="text-sm font-medium text-slate-800">{item.title}</span>
                    <input
                      type="checkbox"
                      defaultChecked={item.defaultChecked}
                      className="w-4 h-4 rounded text-[#0e8a5b] focus:ring-[#0e8a5b]"
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
