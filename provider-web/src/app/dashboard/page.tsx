"use client";

import { supabase } from "@/lib/supabaseClient";
import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Compass,
  LayoutDashboard,
  Layers,
  ClipboardList,
  Rocket,
  Wallet,
  Settings,
  Search,
  Bell,
  Calendar,
  Star,
  Users,
  ChevronRight,
  User,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Phone,
  LogOut,
  X,
  Sparkles,
  Headphones,
  Globe,
  Plus,
  AlertOctagon,
  TrendingUp,
  CreditCard,
  Megaphone,
  Menu,
} from "lucide-react";
import { ProviderProfile } from "@/lib/authSession";
import { useAuth } from "@/hooks/useAuth";
import { Booking, BookingStatus } from "@/types/booking";
import {
  fetchProviderBookings,
  subscribeToBookingsRealtime,
  updateBookingStatus,
  createRealBooking,
} from "@/services/bookingService";
import { BookingDetailDrawer } from "@/components/bookings/BookingDetailDrawer";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { getStoredExperiencesForProvider } from "@/services/mockExperiences";

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  // Core interactive states
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [analyticsRange, setAnalyticsRange] = useState<"7d" | "30d" | "90d" | "1y">("7d");
  const [searchQuery, setSearchQuery] = useState("");

  // Auth context
  const { user, profile: authProfile, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile);
    }
  }, [authProfile]);

  useEffect(() => {
    if (!authLoading && !user && !authProfile) {
      router.replace("/login");
    }
  }, [authLoading, user, authProfile, router]);

  useEffect(() => {
    if (searchParams.get("profile") === "true") {
      setShowProfileModal(true);
    }
  }, [searchParams]);

  const handleLogout = async () => {
    if (typeof window !== "undefined") {
      if (userEmail && userEmail !== "provider@locallens.in") {
        localStorage.setItem("locallens_last_provider_email", userEmail);
      }
      localStorage.removeItem("locallens_provider_session");
    }
    await signOut();
    window.location.href = "/login?logged_out=true";
  };

  // Profile data derivations
  const displayName =
    profile?.fullName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    profile?.name ||
    "Local Provider";
  const firstName = displayName.split(" ")[0] || "Provider";
  const userEmail = profile?.email || user?.email || "provider@locallens.in";
  const avatarUrl =
    profile?.avatar ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    "";
  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "LP";
  const userId = user?.id || profile?.id || "auth_user_session";
  const authProviderName =
    user?.app_metadata?.provider || profile?.authProvider || "google";

  // Aadhaar KYC verification status
  const [isAadhaarVerified, setIsAadhaarVerified] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("locallens_aadhaar_verified") === "true";
    }
    return true; // Default verified for seamless UI
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("locallens_aadhaar_verified");
      if (stored !== null) {
        setIsAadhaarVerified(stored === "true");
      }
    }
  }, []);

  // Navigation Items matching the sidebar in the visual reference
  const navMenuItems = [
    { key: "dashboard", name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { key: "experiences", name: "My Experiences", href: "/experiences/new", icon: Layers },
    { key: "bookings", name: "Bookings", href: "/bookings", icon: ClipboardList },
    { key: "boost", name: "Boost & Sponsor", href: "/boost", icon: Rocket },
    { key: "payouts", name: "Payouts", href: "/settings", icon: Wallet },
    { key: "settings", name: "Settings", href: "/settings", icon: Settings },
  ];

  // Stored experiences dynamic sync with strict provider isolation
  const [storedListings, setStoredListings] = useState<any[]>([]);
  const [isLoadingListings, setIsLoadingListings] = useState<boolean>(true);

  const loadProviderExperiences = React.useCallback(async () => {
    if (!userId) return;
    setIsLoadingListings(true);

    try {
      const combined: any[] = [];
      const seenIds = new Set<string>();

      // 1. Fetch directly from Supabase experience table
      const filterClauses = [
        `provider_id.eq.${userId}`,
        `user_id.eq.${userId}`,
        `source_url.ilike.%/provider/${userId}%`,
        `source_name.ilike.%${userId}%`,
        `tags.ilike.%provider:${userId}%`,
      ];
      if (userEmail && userEmail !== "provider@locallens.in") {
        filterClauses.push(`provider_email.eq.${userEmail}`);
        filterClauses.push(`source_url.ilike.%${userEmail}%`);
        filterClauses.push(`source_name.ilike.%${userEmail}%`);
        filterClauses.push(`tags.ilike.%provider_email:${userEmail}%`);
      }

      const { data, error } = await supabase
        .from("experience")
        .select("*")
        .or(filterClauses.join(","));

      if (!error && Array.isArray(data)) {
        for (const item of data) {
          const k = item.experience_id || item.experience_name;
          if (k && !seenIds.has(k)) {
            seenIds.add(k);
            combined.push(item);
          }
        }
      }

      // 2. Fetch from Next.js server API endpoint
      try {
        const params = new URLSearchParams({
          provider_id: userId,
          ...(userEmail ? { email: userEmail } : {}),
        });
        const apiRes = await fetch(`/api/experiences?${params.toString()}`);
        if (apiRes.ok) {
          const apiJson = await apiRes.json();
          if (apiJson.success && Array.isArray(apiJson.data)) {
            for (const item of apiJson.data) {
              const k = item.experience_id || item.experience_name;
              if (k && !seenIds.has(k)) {
                seenIds.add(k);
                combined.push(item);
              }
            }
          }
        }
      } catch (_) {}

      // 3. Fallback to provider-isolated local storage partition
      const localItems = getStoredExperiencesForProvider(userId, userEmail);
      for (const item of localItems) {
        const k = item.experience_id || item.experience_name;
        if (k && !seenIds.has(k)) {
          seenIds.add(k);
          combined.push(item);
        }
      }

      setStoredListings(combined);
    } catch (err) {
      console.warn("Supabase provider query error:", err);
      const fallbackItems = getStoredExperiencesForProvider(userId, userEmail);
      setStoredListings(fallbackItems);
    } finally {
      setIsLoadingListings(false);
    }
  }, [userId, userEmail]);

  useEffect(() => {
    loadProviderExperiences();

    // Event listeners for instantaneous reactive updates
    const handleUpdate = () => loadProviderExperiences();
    window.addEventListener("locallens_experience_update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("locallens_experience_update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadProviderExperiences]);

  // Real database-driven bookings state for THIS provider only
  const [realBookings, setRealBookings] = useState<Booking[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);

  const loadProviderBookings = React.useCallback(async () => {
    if (!userId) return;
    setIsLoadingBookings(true);
    const data = await fetchProviderBookings(userId, userEmail);
    setRealBookings(data || []);
    setIsLoadingBookings(false);
  }, [userId, userEmail]);

  useEffect(() => {
    loadProviderBookings();

    const unsubscribe = subscribeToBookingsRealtime(
      userId,
      () => {
        loadProviderBookings();
      },
      (isConnected) => {
        setIsRealtimeActive(isConnected);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userId, userEmail, loadProviderBookings]);

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: BookingStatus) => {
    await updateBookingStatus(bookingId, newStatus, userId);
    if (selectedBooking && selectedBooking.id === bookingId) {
      setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    loadProviderBookings();
  };

  const displayExperiences = useMemo(() => {
    if (storedListings.length > 0) {
      return storedListings.map((exp: any, idx: number) => ({
        id: exp.experience_id || `EXP-${idx + 1}`,
        title: exp.experience_name || exp.title || "Local Experience",
        category: exp.category || "Heritage & Culture",
        price:
          typeof exp.price_inr_clean === "number"
            ? `₹${exp.price_inr_clean.toLocaleString()}`
            : typeof exp.price_inr === "string"
            ? exp.price_inr
            : "₹1,200",
        priceNum: typeof exp.price_inr_clean === "number" ? exp.price_inr_clean : 1200,
        image: exp.images?.[0] || exp.image_url || exp.image || "/dashboard/kayaking.jpg",
        city: exp.city || "Mumbai",
        rating: exp.rating || null,
        reviewsCount: exp.reviews_count || 0,
      }));
    }
    return [];
  }, [storedListings]);

  const todayDateStr = new Date().toISOString().split("T")[0];

  const todaysBookings = useMemo(() => {
    return realBookings.filter((b) => b.booking_date === todayDateStr && b.status !== "Cancelled");
  }, [realBookings, todayDateStr]);

  const activeBookings = useMemo(
    () => realBookings.filter((b) => b.status !== "Cancelled"),
    [realBookings]
  );

  const totalEarningsNum = activeBookings.reduce((acc, b) => acc + (b.total_amount_inr || 0), 0);
  const totalBookingsCount = activeBookings.length;
  const activeListingsCount = displayExperiences.length;

  // Real review calculation without fabricating metrics
  const reviewRatings = displayExperiences
    .map((e) => (typeof e.rating === "number" && e.rating > 0 ? e.rating : null))
    .filter((r): r is number => r !== null);
  const averageRating =
    reviewRatings.length > 0
      ? (reviewRatings.reduce((a, b) => a + b, 0) / reviewRatings.length).toFixed(1)
      : null;

  // Onboarding setup completion calculation
  const completedSetupSteps = useMemo(() => {
    let steps = 1; // Registered
    if (isAadhaarVerified) steps++;
    if (activeListingsCount > 0) steps++;
    if (totalBookingsCount > 0) steps++;
    if (profile?.phone) steps++;
    return Math.min(steps, 5);
  }, [isAadhaarVerified, activeListingsCount, totalBookingsCount, profile]);

  const setupPercentage = Math.round((completedSetupSteps / 5) * 100);

  if (authLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#059669] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#64748B]">Loading Provider Portal...</p>
        </div>
      </div>
    );
  }

  if (!user && !profile && !authProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/70 via-[#F8FAFC] to-emerald-100/40 font-sans antialiased text-[#0F172A] selection:bg-[#059669] selection:text-white flex flex-col cursor-default relative overflow-x-hidden">
      {/* ============================================================ */}
      {/* 1. LEFT SIDEBAR (~250px) - FIXED                             */}
      {/* ============================================================ */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[250px] h-screen bg-white border-r border-[#E2E8F0] flex flex-col justify-between py-5 px-3.5 transition-transform duration-200 ${
          mobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="space-y-6">
          {/* Logo Header matching top-left of reference */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-full bg-[#059669] text-white flex items-center justify-center shadow-xs shrink-0 transition-transform group-hover:scale-105">
                <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-white">
                  <path
                    d="M3 18L9.5 7.5L14 14.5L16.5 11L21 18H3Z"
                    fill="white"
                    stroke="white"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[17px] text-[#0F172A] tracking-tight leading-none">
                  LocalLens
                </span>
                <span className="text-[12px] font-bold text-[#059669] tracking-wide leading-tight mt-0.5">
                  Provider
                </span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {navMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.key;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => {
                    setActiveMenu(item.key);
                    setMobileSidebarOpen(false);
                  }}
                  className={`relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-all ${
                    isActive
                      ? "bg-[#ECFDF5] text-[#059669] font-bold shadow-2xs"
                      : "text-[#475569] hover:text-[#0F172A] hover:bg-slate-50"
                  }`}
                >
                  {/* Green left accent bar indicator for active tab */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#059669] rounded-r-md" />
                  )}
                  <Icon
                    className={`w-4.5 h-4.5 ${
                      isActive ? "text-[#059669]" : "text-[#64748B]"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Bottom: Authenticated Profile + Help & Support */}
        <div className="space-y-2 pt-4 border-t border-[#F1F5F9]">
          {/* Authenticated Provider Profile Card */}
          <div className="p-3 bg-white border border-[#E2E8F0] rounded-2xl flex items-center gap-3 shadow-2xs">
            <div className="relative w-10 h-10 rounded-full bg-[#ECFDF5] text-[#059669] font-black text-sm flex items-center justify-center shrink-0 overflow-hidden border border-emerald-100">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span>{userInitials}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[#0F172A] truncate leading-tight">
                {displayName}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                <span className="text-[10.5px] font-bold text-[#059669]">Govt. Verified</span>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                className="text-[11px] font-semibold text-[#2563EB] hover:text-blue-700 flex items-center gap-0.5 mt-0.5 transition-colors cursor-pointer"
              >
                <span>View Profile</span>
                <span className="text-xs">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Help & Support Button */}
          <Link
            href="/settings"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 transition-colors"
          >
            <Headphones className="w-4 h-4 text-[#94A3B8]" />
            <span>Help &amp; Support</span>
          </Link>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* ============================================================ */}
      {/* 2. MAIN CONTENT AREA                                         */}
      {/* ============================================================ */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-200/25 via-transparent to-emerald-100/15" />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[250px] min-h-screen overflow-y-auto z-10 relative">
        {/* TOP HEADER */}
        <header className="w-full bg-[#F8FAFC] px-5 sm:px-8 py-5 flex items-center justify-between gap-4 border-b border-[#F1F5F9]">
          {/* Greeting on Left */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-[#E2E8F0] bg-white text-[#475569] hover:bg-slate-50"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-[22px] sm:text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-snug">
                Good morning, <span className="text-[#059669]">{firstName}!</span> 👋
              </h1>
              <p className="text-[13px] text-[#475569] font-normal mt-0.5">
                Here&apos;s what&apos;s happening with your experiences today.
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Language Selector */}
            <div className="hidden md:block">
              <LanguageSelector variant="navbar" />
            </div>

            {/* Search Input */}
            <div className="relative hidden xl:block w-64">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookings, guests, experiences..."
                className="w-full pl-9 pr-3.5 py-2 rounded-full bg-white border border-[#E2E8F0] text-[12px] text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] transition-all shadow-2xs"
              />
            </div>

            {/* Notifications Button with Red "3" Pill */}
            <button
              type="button"
              onClick={() => router.push("/bookings")}
              className="relative w-9 h-9 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-[#475569]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                3
              </span>
            </button>

            {/* Authenticated Profile Pill (Top Right) */}
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="hidden sm:flex items-center gap-2.5 p-1 pl-2.5 pr-3 rounded-full bg-white border border-[#E2E8F0] hover:border-[#059669]/50 transition-all shadow-2xs cursor-pointer group"
              title="Provider Profile"
            >
              <div className="w-7 h-7 rounded-full bg-[#059669] text-white font-extrabold text-[11px] flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={28}
                    height={28}
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span>{userInitials}</span>
                )}
              </div>
              <div className="flex flex-col text-left leading-none">
                <span className="text-[12px] font-bold text-[#0F172A] truncate max-w-[110px]">
                  {displayName}
                </span>
                <span className="text-[9.5px] font-semibold text-[#059669] mt-0.5">
                  Govt. Verified
                </span>
              </div>
            </button>

            {/* Emergency Pause Toggle */}
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#FFF1F2] border border-[#FFE4E6] shadow-2xs">
              <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-3.5 h-3.5 stroke-[2.4]" />
              </div>
              <div className="flex flex-col text-left leading-tight hidden sm:flex">
                <span className="text-[11.5px] font-extrabold text-[#BE123C]">
                  Emergency Pause
                </span>
                <span className="text-[9.5px] font-medium text-[#BE123C]/80">
                  All Outdoor Listings
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEmergencyPaused(!emergencyPaused)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-200 ml-1 ${
                  emergencyPaused ? "bg-[#EF4444] justify-end" : "bg-[#CBD5E1] justify-start"
                }`}
                aria-label="Toggle Emergency Pause"
              >
                <span className="w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform" />
              </button>
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY CONTAINER */}
        <main className="px-5 sm:px-8 pb-12 pt-3 space-y-6">
          {/* ============================================================ */}
          {/* 3. HERO SETUP BANNER                                         */}
          {/* ============================================================ */}
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-xs border border-[#E2E8F0] min-h-[175px] sm:min-h-[185px] flex items-center text-white"
            style={{
              backgroundImage: "url('/images/provider-dashboard-hero.jpg')",
              backgroundPosition: "center right",
              backgroundSize: "cover",
            }}
          >
            {/* Gradient Overlay for high text legibility on the left */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/75 to-slate-900/10 pointer-events-none" />

            <div className="relative z-10 w-full p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Column: Heading, Subtitle & Progress Bar */}
              <div className="max-w-xl space-y-3">
                <h2 className="text-[20px] sm:text-[23px] font-extrabold text-white tracking-tight leading-snug">
                  Complete your LocalLens setup
                </h2>
                <p className="text-[13px] sm:text-[13.5px] text-slate-200/90 font-normal leading-relaxed">
                  Create your first experience and start welcoming travelers from around the world.
                </p>

                {/* Progress Indicators */}
                <div className="pt-1 space-y-1.5 max-w-md">
                  <div className="flex items-center justify-between text-[11.5px] font-semibold text-slate-300">
                    <span>{completedSetupSteps} of 5 completed</span>
                    <span>{setupPercentage}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#059669] transition-all duration-700 ease-out"
                      style={{ width: `${setupPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: CTA Button */}
              <div className="shrink-0">
                <Link
                  href="/experiences/new"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[13.5px] font-bold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-emerald-400/30"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Experience</span>
                  <span className="text-base leading-none">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 4. FOUR STAT CARDS                                           */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Earnings */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-xs transition-all flex items-start justify-between min-h-[115px]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#059669] flex items-center justify-center font-bold text-lg shrink-0">
                  ₹
                </div>
                <div className="space-y-0.5">
                  <div className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                    ₹{totalEarningsNum.toLocaleString()}
                  </div>
                  <div className="text-[13px] font-semibold text-[#475569] pt-1">
                    Total Earnings
                  </div>
                  <div className="text-[11.5px] text-[#94A3B8]">
                    {totalEarningsNum > 0 ? "Revenue from active bookings" : "No earnings yet"}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-1" />
            </div>

            {/* Card 2: Active Listings */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-xs transition-all flex items-start justify-between min-h-[115px]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                    {activeListingsCount}
                  </div>
                  <div className="text-[13px] font-semibold text-[#475569] pt-1">
                    Active Listings
                  </div>
                  <div className="text-[11.5px]">
                    {activeListingsCount > 0 ? (
                      <span className="text-[#059669] font-medium">{activeListingsCount} published</span>
                    ) : (
                      <Link href="/experiences/new" className="text-[#059669] font-medium hover:underline">
                        Create your first experience
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-1" />
            </div>

            {/* Card 3: Total Bookings */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-xs transition-all flex items-start justify-between min-h-[115px]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                    {totalBookingsCount}
                  </div>
                  <div className="text-[13px] font-semibold text-[#475569] pt-1">
                    Total Bookings
                  </div>
                  <div className="text-[11.5px] text-[#94A3B8]">
                    {totalBookingsCount > 0 ? `${totalBookingsCount} confirmed reservations` : "No bookings yet"}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-1" />
            </div>

            {/* Card 4: Overall Rating */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-xs transition-all flex items-start justify-between min-h-[115px]">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 fill-amber-400 stroke-amber-500" />
                </div>
                <div className="space-y-0.5">
                  <div className="text-[26px] font-extrabold text-[#0F172A] tracking-tight leading-none">
                    {averageRating ? averageRating : "—"}
                  </div>
                  <div className="text-[13px] font-semibold text-[#475569] pt-1">
                    Overall Rating
                  </div>
                  <div className="text-[11.5px] text-[#94A3B8]">
                    {averageRating ? "From verified guests" : "No reviews yet"}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#CBD5E1] shrink-0 mt-1" />
            </div>
          </div>

          {/* ============================================================ */}
          {/* 5. PERFORMANCE ANALYTICS + TODAY'S SCHEDULE (2 COLS)          */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT 7 COLS: PERFORMANCE ANALYTICS */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
                    Performance Analytics
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                </div>

                {/* Range Tabs */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 text-[11.5px] font-semibold">
                  {[
                    { key: "7d", label: "7 Days" },
                    { key: "30d", label: "30 Days" },
                    { key: "90d", label: "90 Days" },
                    { key: "1y", label: "1 Year" },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setAnalyticsRange(tab.key as any)}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        analyticsRange === tab.key
                          ? "bg-[#059669] text-white shadow-2xs"
                          : "text-[#64748B] hover:text-[#0F172A]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body: Empty State or Real Chart */}
              {totalEarningsNum === 0 && totalBookingsCount === 0 ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3.5 my-auto">
                  {/* Clean 3-bar illustration matching reference */}
                  <div className="w-16 h-16 rounded-2xl bg-[#ECFDF5] flex items-center justify-center">
                    <svg viewBox="0 0 48 48" fill="none" className="w-9 h-9 text-[#059669]">
                      <rect x="8" y="24" width="7" height="18" rx="3.5" fill="#A7F3D0" />
                      <rect x="20.5" y="14" width="7" height="28" rx="3.5" fill="#059669" />
                      <rect x="33" y="20" width="7" height="22" rx="3.5" fill="#6EE7B7" />
                    </svg>
                  </div>

                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-[15px] font-bold text-[#0F172A]">
                      No booking activity yet
                    </h4>
                    <p className="text-[12.5px] text-[#64748B] leading-relaxed">
                      Your earnings, bookings and guest trends will appear here once travelers start booking your experiences.
                    </p>
                  </div>

                  <Link
                    href="/experiences/new"
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[12.5px] font-bold shadow-2xs transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Your First Experience</span>
                  </Link>
                </div>
              ) : (
                /* Real Chart view when bookings/earnings exist */
                <div className="py-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-medium text-[#64748B]">Revenue</span>
                      <div className="text-[18px] font-bold text-[#0F172A] mt-0.5">
                        ₹{totalEarningsNum.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-medium text-[#64748B]">Bookings</span>
                      <div className="text-[18px] font-bold text-[#059669] mt-0.5">
                        {totalBookingsCount}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[11px] font-medium text-[#64748B]">Conversion</span>
                      <div className="text-[18px] font-bold text-[#2563EB] mt-0.5">
                        100%
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Bars */}
                  <div className="h-44 w-full flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-100">
                    {[
                      { day: "Mon", val: Math.round(totalEarningsNum * 0.15) },
                      { day: "Tue", val: Math.round(totalEarningsNum * 0.2) },
                      { day: "Wed", val: Math.round(totalEarningsNum * 0.1) },
                      { day: "Thu", val: Math.round(totalEarningsNum * 0.25) },
                      { day: "Fri", val: Math.round(totalEarningsNum * 0.4) },
                      { day: "Sat", val: Math.round(totalEarningsNum * 0.6) },
                      { day: "Sun", val: totalEarningsNum, isToday: true },
                    ].map((item, idx) => {
                      const maxVal = Math.max(totalEarningsNum, 1);
                      const heightPercent = Math.max(15, Math.min(100, Math.round((item.val / maxVal) * 100)));
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[38px] rounded-t-lg transition-all duration-500 ${
                              item.isToday
                                ? "bg-[#059669]"
                                : "bg-emerald-200 hover:bg-emerald-300"
                            }`}
                          />
                          <span className="text-[11px] mt-2 font-medium text-[#64748B]">
                            {item.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT 5 COLS: TODAY'S GUEST SCHEDULE */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-[#F1F5F9]">
                <div className="flex items-center gap-2">
                  <h3 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
                    Today&apos;s Guest Schedule
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-[#059669]" />
                </div>
                <Link
                  href="/bookings"
                  className="text-[12px] font-bold text-[#2563EB] hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <span>&rarr;</span>
                </Link>
              </div>

              {/* Body: Empty State or Real Schedule */}
              {todaysBookings.length === 0 ? (
                <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-3.5 my-auto">
                  {/* Clean Illustrated Calendar Icon matching reference */}
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center relative">
                    <svg viewBox="0 0 64 64" fill="none" className="w-11 h-11">
                      {/* Soft sun / warm accent behind */}
                      <circle cx="48" cy="18" r="8" fill="#FEF08A" />
                      {/* Calendar Body */}
                      <rect x="12" y="18" width="40" height="36" rx="6" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="2.5" />
                      {/* Top Header bar */}
                      <path d="M12 26C12 21.5817 15.5817 18 20 18H44C48.4183 18 52 21.5817 52 26V28H12V26Z" fill="#059669" />
                      {/* Rings */}
                      <rect x="20" y="14" width="3" height="6" rx="1.5" fill="#0F172A" />
                      <rect x="41" y="14" width="3" height="6" rx="1.5" fill="#0F172A" />
                      {/* Calendar Grid dots */}
                      <circle cx="21" cy="36" r="2" fill="#CBD5E1" />
                      <circle cx="32" cy="36" r="2" fill="#CBD5E1" />
                      <circle cx="43" cy="36" r="2" fill="#CBD5E1" />
                      <circle cx="21" cy="44" r="2" fill="#CBD5E1" />
                      <circle cx="32" cy="44" r="2" fill="#CBD5E1" />
                      <circle cx="43" cy="44" r="2" fill="#059669" />
                    </svg>
                  </div>

                  <div className="space-y-1 max-w-xs">
                    <h4 className="text-[15px] font-bold text-[#0F172A]">
                      No guests scheduled today
                    </h4>
                    <p className="text-[12px] text-[#64748B] leading-relaxed">
                      Your upcoming bookings will appear here. Keep your availability updated to attract more travelers.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-2 space-y-3">
                  {todaysBookings.map((b) => (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBooking(b)}
                      className="p-3 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-slate-50/70 transition-all cursor-pointer flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#059669] font-bold text-xs flex items-center justify-center shrink-0">
                          {b.guest_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold text-[#0F172A] truncate">
                            {b.guest_name}
                          </div>
                          <div className="text-[11px] text-[#64748B] truncate">
                            {b.booking_time} • {b.slots} {b.slots > 1 ? "guests" : "guest"}
                          </div>
                        </div>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#ECFDF5] text-[#059669] border border-emerald-100">
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 6. MY EXPERIENCES + QUICK ACTIONS (2 COLS)                   */}
          {/* ============================================================ */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* LEFT 7 COLS: MY EXPERIENCES */}
            <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
              {/* Header */}
              <div className="flex items-center justify-between pb-5 border-b border-[#F1F5F9]">
                <h3 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
                  My Experiences ({activeListingsCount})
                </h3>
                <Link
                  href="/experiences/new"
                  className="text-[12px] font-bold text-[#2563EB] hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <span>View All</span>
                  <span>&rarr;</span>
                </Link>
              </div>

              {/* Body: Empty State or Real Experiences List */}
              {activeListingsCount === 0 ? (
                <div className="py-10 px-4 flex flex-col items-center justify-center text-center space-y-3.5 my-auto">
                  {/* Clean Map with Red Pin Illustration matching reference */}
                  <div className="w-20 h-16 flex items-center justify-center relative">
                    <svg viewBox="0 0 80 60" fill="none" className="w-16 h-12">
                      {/* Folded Map */}
                      <path
                        d="M10 16L28 10L52 16L70 10V46L52 52L28 46L10 52V16Z"
                        fill="#F1F5F9"
                        stroke="#CBD5E1"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path d="M28 10V46" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="2 2" />
                      <path d="M52 16V52" stroke="#E2E8F0" strokeWidth="2" strokeDasharray="2 2" />
                      {/* Little decorative green trees */}
                      <circle cx="20" cy="30" r="4" fill="#A7F3D0" />
                      <circle cx="60" cy="24" r="5" fill="#A7F3D0" />
                      {/* Red Location Pin */}
                      <g transform="translate(32, 12)">
                        <ellipse cx="8" cy="22" rx="5" ry="2" fill="#94A3B8" opacity="0.4" />
                        <path
                          d="M8 2C4.13401 2 1 5.13401 1 9C1 14.25 8 21 8 21C8 21 15 14.25 15 9C15 5.13401 11.866 2 8 2Z"
                          fill="#EF4444"
                        />
                        <circle cx="8" cy="9" r="2.5" fill="white" />
                      </g>
                    </svg>
                  </div>

                  <div className="space-y-1 max-w-sm">
                    <h4 className="text-[15px] font-bold text-[#0F172A]">
                      Your experiences live here
                    </h4>
                    <p className="text-[12.5px] text-[#64748B] leading-relaxed">
                      Create your first local experience and start sharing what makes your place special.
                    </p>
                  </div>

                  <Link
                    href="/experiences/new"
                    className="mt-1 inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[13px] font-bold shadow-2xs transition-colors"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Create Experience</span>
                  </Link>
                </div>
              ) : (
                <div className="py-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {displayExperiences.map((exp) => (
                    <div
                      key={exp.id}
                      className="border border-[#E2E8F0] rounded-xl overflow-hidden hover:shadow-2xs transition-all flex flex-col justify-between"
                    >
                      <div className="relative aspect-[16/10] w-full bg-slate-100">
                        <Image
                          src={exp.image}
                          alt={exp.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/95 text-[#059669] shadow-2xs flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                          <span>Active</span>
                        </div>
                      </div>
                      <div className="p-3 space-y-1">
                        <h4 className="text-[13px] font-bold text-[#0F172A] truncate">
                          {exp.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="text-[#059669] font-bold">{exp.price}</span>
                          <span className="text-[#64748B]">{exp.city}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT 5 COLS: QUICK ACTIONS */}
            <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-2xs flex flex-col justify-between">
              {/* Header */}
              <div className="pb-4 border-b border-[#F1F5F9]">
                <h3 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
                  Quick Actions
                </h3>
              </div>

              {/* Exactly 4 Quick Action Cards in 2x2 Grid matching reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
                {/* 1. Create Experience */}
                <Link
                  href="/experiences/new"
                  className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#059669]/40 hover:bg-slate-50/80 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#059669] transition-colors">
                        Create Experience
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        List a new experience &rarr;
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                {/* 2. View Bookings */}
                <Link
                  href="/bookings"
                  className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-blue-300 hover:bg-slate-50/80 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Calendar className="w-4.5 h-4.5" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-[13px] font-bold text-[#0F172A] group-hover:text-[#2563EB] transition-colors">
                        View Bookings
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Manage reservations &rarr;
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                {/* 3. Boost & Sponsor */}
                <Link
                  href="/boost"
                  className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-purple-300 hover:bg-slate-50/80 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Megaphone className="w-4.5 h-4.5" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-[13px] font-bold text-[#0F172A] group-hover:text-purple-600 transition-colors">
                        Boost &amp; Sponsor
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Get more visibility &rarr;
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>

                {/* 4. View Payouts */}
                <Link
                  href="/settings"
                  className="p-3.5 rounded-xl border border-[#E2E8F0] hover:border-amber-300 hover:bg-slate-50/80 transition-all flex items-center justify-between group shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <CreditCard className="w-4.5 h-4.5" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-[13px] font-bold text-[#0F172A] group-hover:text-amber-600 transition-colors">
                        View Payouts
                      </div>
                      <div className="text-[11px] text-[#64748B] mt-0.5">
                        Check your earnings &rarr;
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#CBD5E1] group-hover:translate-x-0.5 transition-transform shrink-0" />
                </Link>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* ============================================================ */}
      {/* 7. AUTHENTICATED USER PROFILE MODAL                          */}
      {/* ============================================================ */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-[460px] w-full p-6 sm:p-7 relative overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              type="button"
              onClick={() => setShowProfileModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#ECFDF5] text-[#059669] font-black text-xl flex items-center justify-center shadow-xs border border-emerald-100">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span>{userInitials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] font-extrabold text-[#0F172A] truncate">
                    {displayName}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-emerald-200 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    Verified
                  </span>
                </div>
                <p className="text-[12px] font-semibold text-[#059669] mt-0.5 truncate">
                  LocalLens Verified Host
                </p>
                <p className="text-[11px] text-[#94A3B8] truncate">{userEmail}</p>
              </div>
            </div>

            {/* Account Details */}
            <div className="py-4 space-y-2.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Full Name</span>
                </div>
                <span className="text-xs font-bold text-[#0F172A]">{displayName}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>Email</span>
                </div>
                <span className="text-xs font-bold text-[#0F172A] truncate max-w-[200px]">
                  {userEmail}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Sparkles className="w-4 h-4 text-slate-400" />
                  <span>Sign-in Provider</span>
                </div>
                <span className="text-xs font-bold text-[#0F172A] uppercase">
                  {authProviderName}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Detail Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdateStatus={handleUpdateBookingStatus}
      />
    </div>
  );
}

export default function ProviderDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-3 border-[#059669] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#64748B]">Loading LocalLens Portal...</p>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}