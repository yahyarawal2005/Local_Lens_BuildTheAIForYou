"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Compass,
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  User,
  ShieldCheck,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
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

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, profile } = useAuth();
  const { t } = useI18n();

  const providerId = user?.id || profile?.id || "provider_default";
  const providerEmail = profile?.email || user?.email || "provider@locallens.in";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<
    "Today" | "Upcoming" | "Confirmed" | "Pending" | "Cancelled" | "All"
  >((searchParams.get("filter") as any) || "Today");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchProviderBookings(providerId, providerEmail);
    setBookings(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    // Subscribe to genuine Supabase Realtime channel
    const unsubscribe = subscribeToBookingsRealtime(
      providerId,
      () => {
        loadData();
      },
      (isConnected) => {
        setIsRealtimeActive(isConnected);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [providerId, providerEmail]);

  const handleUpdateStatus = async (bookingId: string, newStatus: BookingStatus) => {
    await updateBookingStatus(bookingId, newStatus, providerId);
    if (selectedBooking && selectedBooking.id === bookingId) {
      setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    loadData();
  };

  // Filter bookings based on active filter and search query
  const todayStr = new Date().toISOString().split("T")[0];

  const filteredBookings = bookings.filter((b) => {
    // 1. Tab filter
    if (activeFilter === "Today") {
      if (b.booking_date !== todayStr) return false;
    } else if (activeFilter === "Upcoming") {
      if (b.booking_date < todayStr) return false;
    } else if (activeFilter === "Confirmed") {
      if (b.status !== "Confirmed" && b.status !== "Driver En Route" && b.status !== "Driver Arrived") {
        return false;
      }
    } else if (activeFilter === "Pending") {
      if (b.status !== "Pending") return false;
    } else if (activeFilter === "Cancelled") {
      if (b.status !== "Cancelled") return false;
    }

    // 2. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.guest_name.toLowerCase().includes(q);
      const matchExp = b.experience_name.toLowerCase().includes(q);
      const matchRef = b.booking_reference.toLowerCase().includes(q);
      return matchName || matchExp || matchRef;
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#00875A] text-white flex items-center justify-center shadow-xs">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-sm font-heading font-anton text-slate-900 tracking-tight">
                  {t("bookings.pageTitle", "Guest Schedule & Bookings")}
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  {bookings.length} reservations
                </p>
              </div>
            </div>
          </div>

          {/* Genuine Realtime Status Indicator & Language */}
          <div className="flex items-center gap-3">
            <LanguageSelector variant="navbar" />

            {isRealtimeActive ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-emerald-500 -ml-3.5" />
                <span>{t("dashboard.liveRealtime", "Live Realtime")}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[11px] font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>{t("dashboard.connecting", "Connecting...")}</span>
              </div>
            )}

            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              title="Refresh Bookings"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Controls: Search and Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { key: "Today", label: t("bookings.tabs.today", "Today") },
              { key: "Upcoming", label: t("bookings.tabs.upcoming", "Upcoming") },
              { key: "Confirmed", label: t("bookings.tabs.confirmed", "Confirmed") },
              { key: "Pending", label: t("bookings.tabs.pending", "Pending") },
              { key: "Cancelled", label: t("bookings.tabs.cancelled", "Cancelled") },
              { key: "All", label: t("bookings.tabs.all", "All Bookings") },
            ].map(({ key, label }) => {
              const isActive = activeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? "bg-[#00875A] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/60"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("bookings.searchPlaceholder", "Search by guest name, booking ID, or experience...")}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00875A]/20 focus:border-[#00875A]"
            />
          </div>
        </div>

        {/* Bookings List */}
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <div className="w-8 h-8 border-3 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading guest schedule...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#00875A] flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">
                No Bookings Found Under "{activeFilter}"
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {activeFilter === "Today"
                  ? "You don't have any guest reservations scheduled for today yet."
                  : "No bookings match the selected status or search term."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBookings.map((b) => {
              const isToday = b.booking_date === todayStr;

              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBooking(b)}
                  className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {b.guest_avatar ? (
                        <div className="relative w-11 h-11 rounded-full overflow-hidden border border-slate-200 shrink-0">
                          <Image
                            src={b.guest_avatar}
                            alt={b.guest_name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-emerald-50 text-[#00875A] font-extrabold text-xs flex items-center justify-center shrink-0 border border-emerald-100">
                          {b.guest_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900">{b.guest_name}</h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {b.slots} {b.slots > 1 ? "guests" : "guest"} • ₹{b.total_amount_inr.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        b.status === "Confirmed"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : b.status === "Driver En Route" || b.status === "Driver Arrived"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : b.status === "Cancelled"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>

                  {/* Experience Info */}
                  <div className="p-2.5 rounded-xl bg-slate-50/70 border border-slate-100 space-y-1.5">
                    <div className="text-xs font-bold text-slate-800 truncate">{b.experience_name}</div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                        <span className={isToday ? "font-bold text-emerald-700" : ""}>
                          {isToday ? "Today" : b.booking_date}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-extrabold text-slate-800">{b.booking_time}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer with meeting point & details prompt */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10.5px]">
                    <div className="flex items-center gap-1 text-slate-500 truncate max-w-[220px]">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate">{b.meeting_point}</span>
                    </div>
                    <span className="font-bold text-[#00875A] hover:underline">View Details &rarr;</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Booking Detail Modal Drawer */}
      <BookingDetailDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-[#00875A] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-600">Loading Bookings Portal...</p>
          </div>
        </div>
      }
    >
      <BookingsPageContent />
    </Suspense>
  );
}
