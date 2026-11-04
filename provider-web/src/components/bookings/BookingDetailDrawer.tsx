"use client";

import React from "react";
import Image from "next/image";
import {
  X,
  User,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Sparkles,
} from "lucide-react";
import { Booking, BookingStatus } from "@/types/booking";
import { useI18n } from "@/lib/i18n";

interface BookingDetailDrawerProps {
  booking: Booking | null;
  onClose: () => void;
  onUpdateStatus?: (bookingId: string, newStatus: BookingStatus) => void;
}

export function BookingDetailDrawer({
  booking,
  onClose,
  onUpdateStatus,
}: BookingDetailDrawerProps) {
  const { t } = useI18n();
  if (!booking) return null;

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case "Confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Driver En Route":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Driver Arrived":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "Checked-in":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const isPrivacyProtected =
    booking.status === "Cancelled" || booking.status === "Pending";

  const guestInitials = booking.guest_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "GU";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00875A] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {t("bookings.details.title", "Booking Details")}
              </h3>
              <p className="text-[11px] font-mono text-slate-500">
                Ref: {booking.booking_reference}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Guest Profile Banner */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center gap-3">
              {booking.guest_avatar ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-xs">
                  <Image
                    src={booking.guest_avatar}
                    alt={booking.guest_name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00875A] font-extrabold text-sm flex items-center justify-center border-2 border-white shadow-xs">
                  {guestInitials}
                </div>
              )}
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  {booking.guest_name}
                </h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-medium">
                    {booking.slots} {booking.slots > 1 ? t("dashboard.schedule.guestsCount", "guests") : t("dashboard.schedule.guestCountSingle", "guest")}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-xs font-extrabold text-[#00875A]">
                    ₹{booking.total_amount_inr.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(
                booking.status
              )}`}
            >
              {booking.status === "Confirmed"
                ? t("bookings.status.confirmed", "Confirmed")
                : booking.status === "Pending"
                ? t("bookings.status.pending", "Pending")
                : booking.status === "Cancelled"
                ? t("bookings.status.cancelled", "Cancelled")
                : booking.status}
            </span>
          </div>

          {/* Experience & Schedule Info */}
          <div className="space-y-3">
            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              {t("bookings.table.experience", "Experience")} &amp; {t("bookings.table.dateTime", "Schedule")}
            </h5>

            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
              <div className="text-sm font-extrabold text-slate-900">
                {booking.experience_name}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{booking.booking_date}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">
                    {booking.booking_time}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="font-medium">{booking.meeting_point}</span>
              </div>
            </div>
          </div>

          {/* Guest Contact Information & Privacy Gate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {t("bookings.table.contact", "Guest Contact")}
              </h5>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>{t("bookings.details.privacyNotice", "Privacy Rule Protected")}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t("settings.phoneNumber", "Phone Number")}</span>
                </div>
                <span
                  className={`font-semibold font-mono ${
                    isPrivacyProtected ? "text-slate-400 italic" : "text-slate-800"
                  }`}
                >
                  {booking.guest_phone || t("dashboard.schedule.phoneMasked", "Not provided")}
                </span>
              </div>

              {isPrivacyProtected && (
                <p className="text-[10px] text-amber-700 bg-amber-50/80 p-2 rounded-xl border border-amber-200/60">
                  {t("bookings.details.privacyNotice", "Contact information is accessible exclusively for confirmed attendees under LocalLens privacy terms.")}
                </p>
              )}
            </div>
          </div>

          {booking.special_notes && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                {t("bookings.details.specialRequests", "Special Notes")}:
              </span>
              <p className="text-slate-700 italic">"{booking.special_notes}"</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2.5">
          {booking.status === "Confirmed" && onUpdateStatus && (
            <button
              type="button"
              onClick={() => onUpdateStatus(booking.id, "Checked-in")}
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t("bookings.details.markConfirmed", "Mark Checked-in")}</span>
            </button>
          )}

          {booking.status !== "Cancelled" && onUpdateStatus && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Are you sure you want to cancel this booking?")) {
                  onUpdateStatus(booking.id, "Cancelled");
                }
              }}
              className="py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>{t("bookings.details.cancelBooking", "Cancel")}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            {t("bookings.details.close", "Close")}
          </button>
        </div>
      </div>
    </div>
  );
}
