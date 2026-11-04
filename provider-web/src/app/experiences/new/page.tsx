"use client";

import React, { useState, useEffect, useMemo, useRef, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Compass,
  ArrowLeft,
  ArrowRight,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  Trash2,
  Plus,
  X,
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Eye,
  Rocket,
  ShieldCheck,
  Star,
  Users,
  Layers,
  Wand2,
  Navigation,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/lib/supabaseClient";
import { getStoredExperiences, saveStoredExperiences, saveStoredExperiencesForProvider } from "@/services/mockExperiences";
import { ExperienceListing } from "@/types/experience";
import { AIContentValidatorWidget } from "@/components/ai/AIContentValidatorWidget";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";

// Dynamic map pin dropper
const GoogleMapPinDropper = dynamic(
  () =>
    import("@/components/map/GoogleMapPinDropper").then(
      (mod) => mod.GoogleMapPinDropper
    ),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[300px] bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400 font-bold">
        Loading Map Coordinates...
      </div>
    ),
  }
);

function NewExperienceWizardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id") || searchParams.get("edit");
  const isEditMode = Boolean(editId);
  const { user, profile } = useAuth();
  const userId = user?.id || profile?.id || "provider_default";
  const userEmail = profile?.email || user?.email || "provider@locallens.in";

  // Active step: 1 = Details, 2 = Location & Schedule, 3 = Pricing & Publish
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // STEP 1: EXPERIENCE DETAILS
  const [name, setName] = useState("Sunset Kayaking at Versova");
  const [category, setCategory] = useState("Nature & Adventure");
  const [setting, setSetting] = useState<"Outdoor" | "Indoor" | "Mixed">("Outdoor");
  const [description, setDescription] = useState(
    "Paddle through calm coastal waters and scenic mangrove channels with certified safety marshals and premium gear."
  );
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlightInput, setNewHighlightInput] = useState("");

  const [images, setImages] = useState<string[]>([
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80",
  ]);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // STEP 2: LOCATION & SCHEDULE
  const [meetingPoint, setMeetingPoint] = useState("Versova Beach Pier 2, Off Fisherfolk Jetty, Mumbai");
  const [city, setCity] = useState("Mumbai");
  const [district, setDistrict] = useState("Mumbai Suburban");
  const [stateName, setStateName] = useState("Maharashtra");
  const [lat, setLat] = useState<number>(19.131102);
  const [lng, setLng] = useState<number>(72.81541);
  const [showAdvancedCoords, setShowAdvancedCoords] = useState(false);

  // Show 1 Times
  const [startTime, setStartTime] = useState("05:00 PM");
  const [endTime, setEndTime] = useState("07:00 PM");

  // Multi-Show Support (Optional Show 2)
  const [hasShow2, setHasShow2] = useState(false);
  const [show2Name, setShow2Name] = useState("Morning Mangrove Session");
  const [show2Venue, setShow2Venue] = useState("Versova Beach Pier 2");
  const [show2StartTime, setShow2StartTime] = useState("07:30 AM");
  const [show2EndTime, setShow2EndTime] = useState("09:30 AM");

  // STEP 3: PRICING & PUBLISH
  const [priceInr, setPriceInr] = useState<number>(1200);
  const [maxGuests, setMaxGuests] = useState<number>(8);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [availability, setAvailability] = useState("Daily");

  // Show success toast helper
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Add / remove highlights
  const handleAddHighlight = () => {
    if (!newHighlightInput.trim()) return;
    setHighlights((prev) => [...prev, newHighlightInput.trim()]);
    setNewHighlightInput("");
  };

  const handleRemoveHighlight = (idx: number) => {
    setHighlights((prev) => prev.filter((_, i) => i !== idx));
  };

  // Photo handlers
  const handleAddImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setImages((prev) => [...prev, customImageUrl.trim()]);
    setCustomImageUrl("");
    showToast("Photo added to gallery");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImages((prev) => [...prev, event.target!.result as string]);
        showToast("Photo uploaded successfully");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = (index: number) => {
    if (images.length <= 1) {
      showToast("Please keep at least one photo for your listing", "error");
      return;
    }
    setImages((prev) => prev.filter((_, i) => i !== index));
    showToast("Photo removed");
  };

  // Save Draft to Local Storage
  const handleSaveDraft = () => {
    if (typeof window === "undefined") return;
    const draft = {
      name,
      category,
      setting,
      description,
      highlights,
      images,
      meetingPoint,
      city,
      district,
      lat,
      lng,
      startTime,
      endTime,
      hasShow2,
      show2Name,
      show2Venue,
      show2StartTime,
      show2EndTime,
      priceInr,
      maxGuests,
      durationHours,
      availability,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("locallens_experience_draft", JSON.stringify(draft));
      showToast("Draft saved successfully! You can resume anytime.");
    } catch {
      showToast("Could not save draft to local storage.", "error");
    }
  };

  // Fetch listing for editing when id or edit query param is present
  useEffect(() => {
    if (!editId) return;

    let isMounted = true;
    async function fetchListingForEdit() {
      // 1. Try Supabase public.experience table
      try {
        const { data, error } = await supabase
          .from("experience")
          .select("*")
          .eq("experience_id", editId)
          .maybeSingle();

        if (isMounted && data && !error) {
          if (data.experience_name) setName(data.experience_name);
          if (data.category) setCategory(data.category);
          if (data.indoor_outdoor) setSetting(data.indoor_outdoor as any);
          if (data.description) setDescription(data.description);
          if (data.city) setCity(data.city);
          if (data.district) setDistrict(data.district);
          if (data.state) setStateName(data.state);
          if (data.latitude) setLat(Number(data.latitude));
          if (data.longitude) setLng(Number(data.longitude));
          if (data.meeting_point) setMeetingPoint(data.meeting_point);
          if (data.price_inr_clean || data.price_inr) {
            setPriceInr(Number(data.price_inr_clean) || Number(String(data.price_inr).replace(/[^0-9]/g, "")) || 1200);
          }
          if (data.duration_hours_clean || data.duration_hours) {
            setDurationHours(Number(data.duration_hours_clean) || Number(String(data.duration_hours).replace(/[^0-9.]/g, "")) || 2);
          }
          if (data.max_group_size) setMaxGuests(Number(data.max_group_size));
          if (data.availability) setAvailability(data.availability);
          if (data.best_time) setStartTime(data.best_time);
          if (data.image_url) setImages([data.image_url]);

          // Exact user-entered highlights extraction (NO defaults/suggestions)
          let fetchedHl: string[] = [];
          if (data.image_note) {
            try {
              const parsed = JSON.parse(data.image_note);
              if (Array.isArray(parsed.highlights)) {
                fetchedHl = parsed.highlights;
              }
            } catch {}
          }
          if (fetchedHl.length === 0 && Array.isArray(data.inclusions) && data.inclusions.length > 0) {
            fetchedHl = data.inclusions;
          }
          setHighlights(fetchedHl);
          return;
        }
      } catch (err) {
        console.warn("Listing fetch for edit notice:", err);
      }

      // 2. Fallback to locally stored experiences
      const stored = getStoredExperiences();
      const local = stored.find((exp) => exp.experience_id === editId);
      if (isMounted && local) {
        if (local.experience_name) setName(local.experience_name);
        if (local.category) setCategory(local.category);
        if (local.indoor_outdoor_clean) setSetting(local.indoor_outdoor_clean);
        if (local.description) setDescription(local.description);
        if (local.city) setCity(local.city);
        if (local.district) setDistrict(local.district);
        if (local.state) setStateName(local.state);
        if (local.latitude) setLat(local.latitude);
        if (local.longitude) setLng(local.longitude);
        if (local.meeting_point) setMeetingPoint(local.meeting_point);
        if (local.price_inr_clean) setPriceInr(local.price_inr_clean);
        if (local.duration_hours_clean) setDurationHours(local.duration_hours_clean);
        if (local.max_group_size) setMaxGuests(local.max_group_size);
        if (local.availability) setAvailability(local.availability);
        if (local.images && local.images.length > 0) setImages(local.images);
        setHighlights(Array.isArray(local.inclusions) ? local.inclusions : []);
      }
    }

    fetchListingForEdit();
    return () => {
      isMounted = false;
    };
  }, [editId]);

  // Load draft on mount if available
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("locallens_experience_draft");
      if (saved) {
        const d = JSON.parse(saved);
        if (d.name) setName(d.name);
        if (d.category) setCategory(d.category);
        if (d.description) setDescription(d.description);
        if (d.priceInr) setPriceInr(Number(d.priceInr));
        if (d.meetingPoint) setMeetingPoint(d.meetingPoint);
      }
    } catch {}
  }, []);

  // Step Navigation Validation
  const handleContinueToStep2 = () => {
    if (!name.trim()) {
      showToast("Please enter an Experience Name", "error");
      return;
    }
    if (!description.trim() || description.trim().length < 15) {
      showToast("Please write a short description (at least 15 characters)", "error");
      return;
    }
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleContinueToStep3 = () => {
    if (!meetingPoint.trim()) {
      showToast("Please provide a Meeting Point address or landmark", "error");
      return;
    }
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Publish Experience Handler
  const handlePublishExperience = async () => {
    setIsSubmitting(true);

    const generatedId = `EXP-${Date.now()}`;
    const newListing: ExperienceListing = {
      experience_id: generatedId,
      experience_name: name.trim(),
      provider_id: userId,
      provider_email: userEmail,
      user_id: userId,
      category: category as any,
      sub_category: "Guided Tour",
      tags: [category, city, setting, `provider:${userId}`],
      local_experience_bool: true,
      hidden_gem_bool: false,
      description: description.trim(),
      city: city.trim(),
      district: district.trim(),
      state: stateName.trim(),
      region: "Konkan",
      latitude: lat,
      longitude: lng,
      price_inr_clean: priceInr,
      duration_hours_clean: durationHours,
      min_group_size: 1,
      max_group_size: maxGuests,
      booking_required_bool: true,
      advance_booking_days_clean: 1,
      availability: hasShow2 ? "2 Daily Shows" : availability,
      indoor_outdoor_clean: setting,
      best_time: startTime,
      season: "All Year",
      accessibility: "Accessible",
      images: images,
      meeting_point: meetingPoint.trim(),
      inclusions: highlights,
      rules: ["Comfortable attire recommended"],
      cancellation_policy: "100% refund 24 hours prior",
      status: "active",
      health_score: 95,
      earnings_generated_inr: 0,
      bookings_count: 0,
      rating: 4.9,
      review_count: 0,
    };

    const finalId = editId || generatedId;
    const dbPayload = {
      experience_id: finalId,
      experience_name: name.trim(),
      provider_id: userId,
      provider_email: userEmail,
      user_id: userId,
      category: category,
      sub_category: "Guided Tour",
      tags: highlights.length > 0 ? `${highlights.join("; ")}; provider:${userId}` : `${category}; ${city}; ${setting}; provider:${userId}`,
      local_experience_bool: true,
      hidden_gem_bool: false,
      description: description.trim(),
      city: city.trim(),
      district: district.trim(),
      state: stateName.trim(),
      region: "Konkan",
      latitude: lat,
      longitude: lng,
      price_inr: String(priceInr),
      duration_hours: `${durationHours} hours`,
      rating: 4.9,
      review_count: 0,
      image_url: images[0] || "",
      image_note: highlights.length > 0 ? JSON.stringify({ highlights }) : null,
      source_name: `provider:${userId}`,
      source_url: typeof window !== "undefined" ? `${window.location.origin}/provider/${userId}` : `https://locallens.in/provider/${userId}`,
      last_verified: new Date().toISOString(),
      booking_required: "Yes",
      advance_booking_days: "1 day",
      availability: hasShow2 ? "2 Daily Shows" : availability,
      accessibility: "Accessible",
      local_experience: "Yes",
      hidden_gem: "Yes",
      indoor_outdoor: setting,
      best_time: startTime,
      season: "All Year",
      min_group_size: 1,
      max_group_size: maxGuests,
    };

    try {
      if (editId) {
        await supabase.from("experience").update(dbPayload).eq("experience_id", editId);
      } else {
        await supabase.from("experience").insert(dbPayload);
      }
      await fetch("/api/experiences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dbPayload),
      });
    } catch (e) {
      console.warn("Database sync note:", e);
    }

    const currentStored = getStoredExperiences();
    const updatedListings = editId
      ? currentStored.map((exp) => (exp.experience_id === editId ? newListing : exp))
      : [newListing, ...currentStored];

    saveStoredExperiencesForProvider(userId, updatedListings, userEmail);
    saveStoredExperiences(updatedListings);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("locallens_experience_update", { detail: { providerId: userId } }));
    }

    try {
      localStorage.removeItem("locallens_experience_draft");
    } catch {}

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#00875A", "#10B981", "#3B82F6", "#F59E0B"],
    });

    showToast("Experience published successfully! Redirecting...");
    setTimeout(() => {
      try {
        router.push("/dashboard");
      } catch (_) {}
      window.location.href = "/dashboard";
    }, 1000);
  };

  const categoriesList = [
    "Nature & Adventure",
    "Heritage & Culture",
    "Food & Culinary",
    "Art & Workshops",
    "Wellness & Yoga",
    "Boat & Watersports",
  ];  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-[#F8FAFC] to-emerald-100/50 text-[#0F172A] font-sans pb-24 selection:bg-[#00875A] selection:text-white relative overflow-x-hidden">
      {/* Green Monochromatic Ambient Background Aura */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-200/35 via-transparent to-emerald-100/25" />
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-emerald-100/40 via-transparent to-transparent" />
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#00875A] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <Compass className="w-4 h-4" />
            </div>
            <span className="font-black text-sm text-[#0F172A] tracking-tight">
              LocalLens <span className="text-[#00875A] font-bold text-xs">- Provider</span>
            </span>
          </Link>

          {/* Clean 3-Step Tracker */}
          <div className="hidden sm:flex items-center gap-2">
            {[
              { num: 1, label: "Details" },
              { num: 2, label: "Location & Schedule" },
              { num: 3, label: "Pricing & Publish" },
            ].map((s) => {
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => {
                    if (s.num === 1) setCurrentStep(1);
                    else if (s.num === 2) handleContinueToStep2();
                    else if (s.num === 3) handleContinueToStep3();
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#00875A] text-white shadow-xs"
                      : isPast
                      ? "bg-emerald-50 text-[#00875A] hover:bg-emerald-100"
                      : "text-slate-400 hover:text-slate-700 bg-slate-50"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isActive ? "bg-white text-[#00875A]" : isPast ? "bg-[#00875A] text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isPast ? "✓" : s.num}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSelector variant="navbar" />
            <button
              type="button"
              onClick={handleSaveDraft}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Save Draft</span>
            </button>
            <Link
              href="/dashboard"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Close and exit to Dashboard"
            >
              <X className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Mobile Step Indicator */}
        <div className="sm:hidden px-4 py-2 bg-slate-50 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-slate-600">
          <span>
            Step {currentStep} of 3:{" "}
            {currentStep === 1 ? "Details" : currentStep === 2 ? "Location & Schedule" : "Pricing & Publish"}
          </span>
          <div className="flex gap-1">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={`w-2 h-2 rounded-full ${n === currentStep ? "bg-[#00875A]" : n < currentStep ? "bg-emerald-300" : "bg-slate-200"}`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* ── Toast Notification ────────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed top-20 right-4 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
          <div
            className={`px-4 py-2.5 rounded-2xl shadow-xl border flex items-center gap-2 text-xs font-bold ${
              toastMsg.type === "success"
                ? "bg-white text-emerald-800 border-emerald-200"
                : "bg-white text-rose-800 border-rose-200"
            }`}
          >
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        </div>
      )}

      {/* ── Main Container ────────────────────────────────────────────── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-8">

        {/* ============================================================== */}
        {/* STEP 1: DETAILS                                                */}
        {/* ============================================================== */}
        {currentStep === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <span className="text-[11px] font-bold text-[#00875A] uppercase tracking-wider">Step 1 of 3</span>
              <h1 className="text-2xl font-black text-[#0F172A] tracking-tight mt-0.5">
                Tell travelers about your experience
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                A captivating title, clear description, and vibrant photos attract more bookings.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs p-5 sm:p-7 space-y-6">
              {/* Experience Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-[#0F172A]">
                  Experience Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sunset Kayaking at Versova Beach"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Category & Setting Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#0F172A]">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-[#00875A] text-xs font-bold text-slate-800 outline-none bg-white cursor-pointer"
                  >
                    {categoriesList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-[#0F172A]">Setting</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Outdoor", "Indoor", "Mixed"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSetting(s)}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          setting === s
                            ? "bg-[#00875A] text-white border-[#00875A] shadow-xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Short Description */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-extrabold text-[#0F172A]">
                    Description <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {description.length} characters
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the adventure, what travelers will see, do and feel..."
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 hover:border-slate-300 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-normal text-slate-700 leading-relaxed outline-none transition-all placeholder:text-slate-400 resize-none"
                />
              </div>

              {/* Photos Gallery */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-extrabold text-[#0F172A]">
                      Experience Photos ({images.length})
                    </label>
                    <span className="text-[10.5px] text-slate-400 font-medium">
                      First photo is your listing cover image.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-[#00875A]" />
                    <span>Upload Photo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                {/* Thumbnails Grid with Delete Trash Icon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs"
                    >
                      <Image
                        src={img}
                        alt={`Photo ${idx + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        unoptimized
                      />
                      {idx === 0 && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#00875A] text-white text-[9px] font-black tracking-tight shadow-xs">
                          Cover
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(idx)}
                        className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/60 hover:bg-rose-600 text-white backdrop-blur-xs transition-colors cursor-pointer"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Add Photo by URL Box */}
                  <div className="aspect-[4/3] rounded-2xl border-2 border-dashed border-slate-200 p-2.5 flex flex-col justify-center items-center gap-1.5 bg-slate-50/50">
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => setCustomImageUrl(e.target.value)}
                      placeholder="Paste image URL..."
                      className="w-full text-[10px] px-2 py-1 rounded-lg border border-slate-200 bg-white outline-none text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="text-[10px] font-bold text-[#00875A] hover:underline cursor-pointer"
                    >
                      + Add by URL
                    </button>
                  </div>
                </div>
              </div>

              {/* Experience Highlights */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-xs font-extrabold text-[#0F172A]">
                  Experience Highlights
                </label>
                <div className="flex flex-wrap gap-2">
                  {highlights.map((h, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/80 text-[#00875A] text-xs font-semibold border border-emerald-200/80"
                    >
                      <span>✓ {h}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveHighlight(idx)}
                        className="text-emerald-700 hover:text-rose-600 cursor-pointer ml-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex gap-2 max-w-md pt-1">
                  <input
                    type="text"
                    value={newHighlightInput}
                    onChange={(e) => setNewHighlightInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddHighlight())}
                    placeholder="e.g. Safety marshals on water, Sunset tea provided"
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs outline-none focus:border-[#00875A]"
                  />
                  <button
                    type="button"
                    onClick={handleAddHighlight}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Small Collapsible AI Quality Card (Quiet & Compact) */}
              <div className="pt-2">
                <AIContentValidatorWidget
                  title={name}
                  description={description}
                  onApplyPolish={(polished) => {
                    setDescription(polished);
                    showToast("AI Polished description applied!");
                  }}
                  show1={{
                    id: "show-1",
                    name: "Main Show",
                    venue: meetingPoint,
                    city: city,
                    district: district,
                    lat: lat,
                    lng: lng,
                    timeSlot: `${startTime} - ${endTime}`,
                  }}
                />
              </div>

              {/* Continue to Step 2 Button */}
              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleContinueToStep2}
                  className="px-6 py-3 rounded-2xl bg-[#00875A] hover:bg-[#00704A] text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                >
                  <span>Continue to Location &amp; Schedule</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}﻿        {/* ========================================================================= */}
        {/* STEP 2: LOCATION & SCHEDULE                                              */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div>
                <h2 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#00875A]" />
                  <span>Step 2: Location & Schedule</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Where will travelers meet you, and what are your operating hours or show timings?
                </p>
              </div>

              {/* Meeting Point Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Meeting Point / Venue Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4 text-[#00875A]" />
                  </div>
                  <input
                    type="text"
                    value={meetingPoint}
                    onChange={(e) => setMeetingPoint(e.target.value)}
                    placeholder="e.g. Versova Beach Pier 2, Off Fisherfolk Jetty, Mumbai"
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-[#00875A] focus:ring-4 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 pl-1">
                  Be clear and specific so travelers easily find your starting spot.
                </p>
              </div>

              {/* City, District, State Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Mumbai"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">District</label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="e.g. Mumbai Suburban"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">State</label>
                  <input
                    type="text"
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    placeholder="e.g. Maharashtra"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Interactive Map Section */}
              <div className="space-y-3 pt-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-[#00875A]" />
                      <span>Interactive Map Pin Dropper</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#00875A] border border-emerald-200/50">
                      Click or drag pin
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                          (pos) => {
                            setLat(pos.coords.latitude);
                            setLng(pos.coords.longitude);
                            showToast("Location set from GPS!");
                          },
                          () => {
                            showToast("Could not retrieve GPS location.", "error");
                          }
                        );
                      } else {
                        showToast("Geolocation not supported by your browser.", "error");
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-[#00875A] text-[11px] font-bold flex items-center gap-1.5 border border-slate-200/80 transition-all cursor-pointer"
                  >
                    <Navigation className="w-3 h-3 text-[#00875A]" />
                    <span>Use My GPS</span>
                  </button>
                </div>

                {/* Map Component with Auto Fallback */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <GoogleMapPinDropper
                    position={{ lat, lng }}
                    onPinSelected={(coords) => {
                      setLat(coords.lat);
                      setLng(coords.lng);
                      if (coords.address) setMeetingPoint(coords.address);
                      if (coords.city) setCity(coords.city);
                      if (coords.district) setDistrict(coords.district);
                      if (coords.state) setStateName(coords.state);
                    }}
                    venueName={meetingPoint}
                  />
                </div>

                {/* Collapsible Advanced Coordinates */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvancedCoords(!showAdvancedCoords)}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-[#00875A] transition-colors cursor-pointer"
                  >
                    <span>{showAdvancedCoords ? "Hide" : "Show"} Advanced Location (GPS Coordinates)</span>
                    {showAdvancedCoords ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {showAdvancedCoords && (
                    <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-fadeIn">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Latitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={lat}
                          onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-[#00875A]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Longitude</label>
                        <input
                          type="number"
                          step="0.000001"
                          value={lng}
                          onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-800 outline-none focus:border-[#00875A]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Schedule & Show Timings */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div>
                  <h3 className="text-xs font-extrabold text-[#0F172A] uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#00875A]" />
                    <span>Show & Timing Slots</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configure your daily session timing. You can optionally add a second show if you run multiple slots.
                  </p>
                </div>

                {/* Show 1 Card */}
                <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/40 border border-emerald-100/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#00875A] text-white flex items-center justify-center text-[10px] font-bold">
                        1
                      </span>
                      <span>Show 1 (Main Session)</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-[#00875A]">
                      Default Slot
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Start Time</label>
                      <input
                        type="text"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        placeholder="e.g. 05:00 PM"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#00875A] text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">End Time</label>
                      <input
                        type="text"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        placeholder="e.g. 07:00 PM"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 focus:border-[#00875A] text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Show 2 Card (Conditional) */}
                {hasShow2 ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/40 border border-blue-100/80 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                          2
                        </span>
                        <span>Show 2 (Second Slot)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setHasShow2(false)}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove Show 2</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Show Title</label>
                          <input
                            type="text"
                            value={show2Name}
                            onChange={(e) => setShow2Name(e.target.value)}
                            placeholder="e.g. Morning Mangrove Session"
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-blue-500 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Meeting Point / Venue</label>
                          <input
                            type="text"
                            value={show2Venue}
                            onChange={(e) => setShow2Venue(e.target.value)}
                            placeholder="e.g. Versova Beach Pier 2"
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-blue-500 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Start Time</label>
                          <input
                            type="text"
                            value={show2StartTime}
                            onChange={(e) => setShow2StartTime(e.target.value)}
                            placeholder="e.g. 07:30 AM"
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-blue-500 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">End Time</label>
                          <input
                            type="text"
                            value={show2EndTime}
                            onChange={(e) => setShow2EndTime(e.target.value)}
                            placeholder="e.g. 09:30 AM"
                            className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 focus:border-blue-500 text-xs font-semibold text-slate-800 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHasShow2(true)}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#00875A] bg-slate-50/50 hover:bg-emerald-50/30 text-slate-600 hover:text-[#00875A] text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Another Show / Session Time</span>
                  </button>
                )}
              </div>

              {/* Step 2 Bottom Controls */}
              <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Details</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-400" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleContinueToStep3}
                    className="px-6 py-2.5 rounded-2xl bg-[#00875A] hover:bg-[#00704A] text-white font-extrabold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                  >
                    <span>Continue to Pricing &amp; Publish</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
﻿        {/* ========================================================================= */}
        {/* STEP 3: PRICING & PUBLISH                                                 */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-fadeIn">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Form Inputs (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
                <div>
                  <h2 className="text-lg font-black text-[#0F172A] flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-[#00875A]" />
                    <span>Step 3: Pricing &amp; Final Settings</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Set your pricing per person, group capacity, and publish your experience to travelers.
                  </p>
                </div>

                {/* Price In INR */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Price per Traveler (INR ₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold text-sm">
                      ₹
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={priceInr}
                      onChange={(e) => setPriceInr(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="1200"
                      className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-200 focus:border-[#00875A] focus:ring-4 focus:ring-emerald-500/10 text-sm font-extrabold text-slate-800 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 pl-1">
                    Competitive prices attract 3x more bookings. Standard local market average is ₹800 - ₹2,500.
                  </p>
                </div>

                {/* Capacity & Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#00875A]" />
                      <span>Max Guests per Slot</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(Math.max(1, parseInt(e.target.value) || 1))}
                      placeholder="8"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00875A]" />
                      <span>Duration (Hours)</span>
                    </label>
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      max="24"
                      value={durationHours}
                      onChange={(e) => setDurationHours(Math.max(0.5, parseFloat(e.target.value) || 1))}
                      placeholder="2"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Availability Schedule */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#00875A]" />
                    <span>Availability Schedule</span>
                  </label>
                  <select
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-[#00875A] focus:ring-2 focus:ring-emerald-500/10 text-xs font-semibold text-slate-800 bg-white outline-none transition-all cursor-pointer"
                  >
                    <option value="Daily">Daily (All 7 Days)</option>
                    <option value="Weekends Only">Weekends Only (Saturday &amp; Sunday)</option>
                    <option value="Friday to Sunday">Friday to Sunday</option>
                    <option value="Weekdays Only">Weekdays Only (Monday - Friday)</option>
                    <option value="By Appointment">By Prior Appointment</option>
                  </select>
                </div>

                {/* LocalLens Host Guarantees Card */}
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-[#00875A]">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Host Protection &amp; Guarantees</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1 font-medium">
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#00875A] shrink-0" />
                      <span>Instant direct payout via Razorpay / UPI upon trip completion</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#00875A] shrink-0" />
                      <span>Verified guest profiles with phone &amp; identity checks</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#00875A] shrink-0" />
                      <span>24-hour host cancellation &amp; no-show compensation protection</span>
                    </li>
                  </ul>
                </div>

                {/* Step 3 Controls */}
                <div className="pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(2);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Location</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      className="px-4 py-2.5 rounded-2xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5 text-slate-400" />
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handlePublishExperience}
                      className="px-7 py-3 rounded-2xl bg-[#00875A] hover:bg-[#00704A] disabled:opacity-60 text-white font-black text-xs shadow-lg shadow-emerald-700/25 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Publishing to Travelers...</span>
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          <span>{isEditMode ? "Update Experience Now" : "Publish Experience Now"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Realistic Live Traveler Preview Card (5 Cols) */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-24">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-[#00875A]" />
                      <span>Live Traveler Preview</span>
                    </span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Real-time
                    </span>
                  </div>

                  <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/90 shadow-lg shadow-slate-200/40 hover:shadow-xl transition-shadow">
                    {/* Preview Image */}
                    <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                      {images[0] ? (
                        <img
                          src={images[0]}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 gap-1">
                          <Compass className="w-8 h-8" />
                          <span className="text-[11px] font-bold">No Image Uploaded</span>
                        </div>
                      )}

                      {/* Badges on Image */}
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
                          {category}
                        </span>
                        <span className="px-2.5 py-1 rounded-full bg-[#00875A]/90 backdrop-blur-md text-white text-[10px] font-bold shadow-xs">
                          {setting}
                        </span>
                      </div>

                      <div className="absolute bottom-3 right-3">
                        <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-md text-slate-900 text-[11px] font-black shadow-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>5.0</span>
                          <span className="text-[9px] text-slate-400 font-normal">(New)</span>
                        </span>
                      </div>
                    </div>

                    {/* Preview Body */}
                    <div className="p-5 space-y-3.5">
                      <div>
                        <h3 className="text-sm font-black text-[#0F172A] line-clamp-1">
                          {name || "Untitled Experience"}
                        </h3>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3 text-[#00875A] shrink-0" />
                          <span className="line-clamp-1">{meetingPoint || `${city}, ${stateName}`}</span>
                        </p>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {description || "Your exciting experience description will show here for travelers looking to explore your local region."}
                      </p>

                      {/* Highlights */}
                      {highlights.length > 0 && (
                        <div className="space-y-1 pt-1">
                          {highlights.slice(0, 2).map((h, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
                              <Check className="w-3 h-3 text-[#00875A] shrink-0" />
                              <span className="line-clamp-1">{h}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timings & Capacity Pills */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
                        <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{durationHours} hrs</span>
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>Max {maxGuests}</span>
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-[#00875A] border border-emerald-100/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{startTime}</span>
                        </span>
                        {hasShow2 && (
                          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100/50">
                            +2nd Show ({show2StartTime})
                          </span>
                        )}
                      </div>

                      {/* Price & Book Row */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-medium">From</span>
                          <span className="text-base font-black text-[#0F172A]">
                            ₹{priceInr.toLocaleString("en-IN")}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium"> / person</span>
                        </div>

                        <span className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs">
                          Book Now
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast Notification */}
        {toastMsg && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold animate-fadeIn ${
              toastMsg.type === "success"
                ? "bg-[#00875A] text-white border-emerald-600 shadow-emerald-900/20"
                : "bg-rose-600 text-white border-rose-700 shadow-rose-900/20"
            }`}
          >
            {toastMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewExperienceWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading Experience Creator...</p>
          </div>
        </div>
      }
    >
      <NewExperienceWizardPageContent />
    </Suspense>
  );
}
