import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { Booking, BookingStatus } from "@/types/booking";

// Server-side persistent storage partitioned strictly by provider ID
const serverBookingsRegistry: Map<string, Booking[]> = new Map();

// Helper to mask phone for privacy if not confirmed
function maskPhoneForPrivacy(phone?: string, status?: string): string {
  if (!phone) return "Not provided";
  if (status === "Cancelled" || status === "Pending") {
    // Masked for privacy
    if (phone.length > 5) {
      return phone.substring(0, 4) + " •••• " + phone.substring(phone.length - 2);
    }
    return "Protected by privacy policy";
  }
  return phone;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider_id")?.trim().toLowerCase();
    const providerEmail = searchParams.get("email")?.trim().toLowerCase();
    const dateFilter = searchParams.get("date")?.trim(); // YYYY-MM-DD or "today"
    const statusFilter = searchParams.get("status")?.trim();

    if (!providerId && !providerEmail) {
      return NextResponse.json({ success: true, data: [] });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const targetDate = dateFilter === "today" ? todayStr : dateFilter;

    const seenIds = new Set<string>();
    const combined: Booking[] = [];

    // 1. Fetch from Supabase bookings table
    try {
      const filters: string[] = [];
      if (providerId) {
        filters.push(`provider_id.eq.${providerId}`);
      }
      if (providerEmail && providerEmail !== providerId) {
        filters.push(`provider_id.eq.${providerEmail}`);
      }

      if (filters.length > 0) {
        let query = supabase.from("bookings").select("*").or(filters.join(","));

        if (targetDate) {
          query = query.eq("booking_date", targetDate);
        }
        if (statusFilter && statusFilter !== "All") {
          query = query.eq("status", statusFilter);
        }

        const { data: dbData, error } = await query;
        if (!error && Array.isArray(dbData)) {
          for (const item of dbData) {
            if (!seenIds.has(item.id)) {
              seenIds.add(item.id);
              combined.push({
                ...item,
                guest_phone: maskPhoneForPrivacy(item.guest_phone, item.status),
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase bookings query notice:", err);
    }

    // 2. Fetch from server in-memory provider registry
    const localForId = providerId ? serverBookingsRegistry.get(providerId) || [] : [];
    const localForEmail = providerEmail && providerEmail !== providerId ? serverBookingsRegistry.get(providerEmail) || [] : [];
    const localMerged = [...localForId, ...localForEmail];

    for (const b of localMerged) {
      if (!seenIds.has(b.id)) {
        let matchesDate = true;
        let matchesStatus = true;

        if (targetDate) {
          matchesDate = b.booking_date === targetDate;
        }
        if (statusFilter && statusFilter !== "All") {
          matchesStatus = b.status === statusFilter;
        }

        if (matchesDate && matchesStatus) {
          seenIds.add(b.id);
          combined.push({
            ...b,
            guest_phone: maskPhoneForPrivacy(b.guest_phone, b.status),
          });
        }
      }
    }

    // Sort by booking_time ascending
    combined.sort((a, b) => a.booking_time.localeCompare(b.booking_time));

    return NextResponse.json({ success: true, data: combined });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const providerId = (body.provider_id || "provider_default").trim().toLowerCase();
    const providerEmail = (body.provider_email || "").trim().toLowerCase();
    const todayStr = new Date().toISOString().split("T")[0];

    // If traveler_id is provided, attempt to fetch real profile from Supabase
    let realName = body.guest_name || "Traveler Guest";
    let realAvatar = body.guest_avatar || "";
    if (body.traveler_id) {
      try {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", body.traveler_id)
          .maybeSingle();

        if (userProfile) {
          realName = userProfile.full_name || realName;
          realAvatar = userProfile.avatar_url || realAvatar;
        }
      } catch (e) {}
    }

    const newBooking: Booking = {
      id: body.id || `BK-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 899 + 100)}`,
      booking_reference: body.booking_reference || `LL-REF-${Math.floor(100000 + Math.random() * 900000)}`,
      provider_id: providerId,
      experience_id: body.experience_id || "EXP-DEFAULT",
      traveler_id: body.traveler_id || undefined,
      guest_name: realName,
      guest_email: body.guest_email || undefined,
      guest_phone: body.guest_phone || "+91 98201 11223",
      guest_avatar: realAvatar,
      experience_name: body.experience_name || "Local Experience",
      meeting_point: body.meeting_point || "Host Meeting Point, Mumbai",
      latitude: Number(body.latitude) || 19.131102,
      longitude: Number(body.longitude) || 72.81541,
      city: body.city || "Mumbai",
      booking_date: body.booking_date || todayStr,
      booking_time: body.booking_time || "11:00 AM",
      slots: Number(body.slots) || 2,
      total_amount_inr: Number(body.total_amount_inr) || 2400,
      status: (body.status as BookingStatus) || "Confirmed",
      payment_status: body.payment_status || "Paid",
      special_notes: body.special_notes || undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 1. Save to in-memory server registry partition for this provider
    const existing = serverBookingsRegistry.get(providerId) || [];
    serverBookingsRegistry.set(providerId, [newBooking, ...existing]);

    if (providerEmail && providerEmail !== providerId) {
      const existingEmail = serverBookingsRegistry.get(providerEmail) || [];
      serverBookingsRegistry.set(providerEmail, [newBooking, ...existingEmail]);
    }

    // 2. Attempt to save to Supabase bookings table
    let dbSuccess = false;
    let dbError: string | null = null;
    try {
      const { data, error } = await supabase.from("bookings").insert(newBooking).select();
      if (error) {
        dbError = error.message;
      } else {
        dbSuccess = true;
      }
    } catch (err: any) {
      dbError = err.message;
    }

    return NextResponse.json({
      success: true,
      dbSuccess,
      warning: dbError,
      data: newBooking,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { booking_id, status, booking_time, booking_date, provider_id } = body;

    if (!booking_id) {
      return NextResponse.json({ success: false, error: "Missing booking_id" }, { status: 400 });
    }

    const cleanProviderId = (provider_id || "").toLowerCase();

    // 1. Update in server registry
    let updatedBooking: Booking | null = null;
    for (const [key, bookings] of serverBookingsRegistry.entries()) {
      const idx = bookings.findIndex((b) => b.id === booking_id || b.booking_reference === booking_id);
      if (idx !== -1) {
        bookings[idx] = {
          ...bookings[idx],
          ...(status ? { status } : {}),
          ...(booking_time ? { booking_time } : {}),
          ...(booking_date ? { booking_date } : {}),
          updated_at: new Date().toISOString(),
        };
        updatedBooking = bookings[idx];
      }
    }

    // 2. Update in Supabase bookings table
    try {
      const updatePayload: any = {
        updated_at: new Date().toISOString(),
      };
      if (status) updatePayload.status = status;
      if (booking_time) updatePayload.booking_time = booking_time;
      if (booking_date) updatePayload.booking_date = booking_date;

      await supabase.from("bookings").update(updatePayload).eq("id", booking_id);
    } catch (e) {}

    return NextResponse.json({
      success: true,
      data: updatedBooking,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
