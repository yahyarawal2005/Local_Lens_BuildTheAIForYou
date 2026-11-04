import { supabase } from "@/lib/supabaseClient";
import { Booking, BookingStatus, NearbyGuest } from "@/types/booking";

const STORAGE_BOOKINGS_PREFIX = "locallens_provider_bookings_";

export function getLocalProviderBookings(providerId?: string | null): Booking[] {
  if (typeof window === "undefined" || !providerId) return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_BOOKINGS_PREFIX}${providerId.toLowerCase()}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalProviderBookings(providerId: string, bookings: Booking[]): void {
  if (typeof window === "undefined" || !providerId) return;
  try {
    localStorage.setItem(`${STORAGE_BOOKINGS_PREFIX}${providerId.toLowerCase()}`, JSON.stringify(bookings));
    // Trigger custom window event for instant same-tab/cross-tab reactive update
    window.dispatchEvent(new CustomEvent("locallens_booking_update", { detail: { providerId } }));
  } catch (err) {
    console.warn("Local storage bookings write notice:", err);
  }
}

/**
 * Fetches real database-driven bookings for the authenticated provider only
 */
export async function fetchProviderBookings(
  providerId: string,
  providerEmail?: string,
  dateFilter?: string,
  statusFilter?: string
): Promise<Booking[]> {
  const cleanId = providerId.trim().toLowerCase();
  const cleanEmail = (providerEmail || "").trim().toLowerCase();

  const seenIds = new Set<string>();
  const combined: Booking[] = [];

  // 1. Fetch from Next.js server API
  try {
    const params = new URLSearchParams({
      provider_id: cleanId,
      ...(cleanEmail ? { email: cleanEmail } : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(statusFilter && statusFilter !== "All" ? { status: statusFilter } : {}),
    });

    const res = await fetch(`/api/bookings?${params.toString()}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      for (const b of json.data) {
        if (!seenIds.has(b.id)) {
          seenIds.add(b.id);
          combined.push(b);
        }
      }
    }
  } catch (err) {
    console.warn("API booking fetch notice:", err);
  }

  // 2. Fetch directly from Supabase bookings table matching this provider
  try {
    const filters: string[] = [`provider_id.eq.${cleanId}`];
    if (cleanEmail && cleanEmail !== cleanId) {
      filters.push(`provider_id.eq.${cleanEmail}`);
    }

    let query = supabase.from("bookings").select("*").or(filters.join(","));

    if (dateFilter && dateFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      query = query.eq("booking_date", todayStr);
    } else if (dateFilter && dateFilter !== "all") {
      query = query.eq("booking_date", dateFilter);
    }

    if (statusFilter && statusFilter !== "All") {
      query = query.eq("status", statusFilter);
    }

    const { data: dbData, error } = await query;
    if (!error && Array.isArray(dbData)) {
      for (const b of dbData) {
        if (!seenIds.has(b.id)) {
          seenIds.add(b.id);
          combined.push(b);
        }
      }
    }
  } catch (dbErr) {
    console.warn("Supabase booking direct query notice:", dbErr);
  }

  // 3. Fallback to provider-isolated local partition
  const localItems = getLocalProviderBookings(cleanId);
  for (const b of localItems) {
    if (!seenIds.has(b.id)) {
      seenIds.add(b.id);
      combined.push(b);
    }
  }

  // Sort by booking_time ascending
  combined.sort((a, b) => a.booking_time.localeCompare(b.booking_time));

  return combined;
}

/**
 * Sets up genuine Supabase Realtime channel subscription for live updates
 */
export function subscribeToBookingsRealtime(
  providerId: string,
  onBookingChange: (payload: any) => void,
  onConnectionStatusChange?: (isConnected: boolean) => void
) {
  if (!providerId) return () => {};

  const cleanId = providerId.trim().toLowerCase();
  const channelName = `provider-bookings-${cleanId}-${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
        filter: `provider_id=eq.${cleanId}`,
      },
      (payload) => {
        onBookingChange(payload);
      }
    )
    .subscribe((status) => {
      const isSubscribed = status === "SUBSCRIBED";
      if (onConnectionStatusChange) {
        onConnectionStatusChange(isSubscribed);
      }
    });

  // Cross-tab reactive listener
  const handleCustomEvent = (e: any) => {
    if (e.detail?.providerId === cleanId) {
      onBookingChange({ eventType: "LOCAL_UPDATE", detail: e.detail });
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("locallens_booking_update", handleCustomEvent);
  }

  return () => {
    supabase.removeChannel(channel);
    if (typeof window !== "undefined") {
      window.removeEventListener("locallens_booking_update", handleCustomEvent);
    }
  };
}

/**
 * Updates a booking status (e.g. Confirmed, Checked-in, Cancelled)
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  providerId: string
): Promise<boolean> {
  try {
    // 1. Update in local storage partition
    const current = getLocalProviderBookings(providerId);
    const updated = current.map((b) =>
      b.id === bookingId ? { ...b, status: newStatus, updated_at: new Date().toISOString() } : b
    );
    saveLocalProviderBookings(providerId, updated);

    // 2. Call server API
    await fetch("/api/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ booking_id: bookingId, status: newStatus, provider_id: providerId }),
    });

    return true;
  } catch (err) {
    console.error("Failed to update booking status", err);
    return false;
  }
}

/**
 * Creates a real booking in database & local partition
 */
export async function createRealBooking(bookingData: Partial<Booking>): Promise<Booking | null> {
  try {
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingData),
    });
    const json = await res.json();
    if (json.success && json.data) {
      if (bookingData.provider_id) {
        const existing = getLocalProviderBookings(bookingData.provider_id);
        saveLocalProviderBookings(bookingData.provider_id, [json.data, ...existing]);
      }
      return json.data;
    }
    return null;
  } catch (err) {
    console.error("Failed to create booking", err);
    return null;
  }
}

/**
 * Fetches nearby guests for the provider's active coordinates
 */
export async function fetchGuestsNearby(
  lat: number,
  lng: number,
  radiusKm = 25,
  providerId?: string
): Promise<NearbyGuest[]> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radius_km: String(radiusKm),
      ...(providerId ? { provider_id: providerId } : {}),
    });

    const res = await fetch(`/api/guests-nearby?${params.toString()}`);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch {
    return [];
  }
}
