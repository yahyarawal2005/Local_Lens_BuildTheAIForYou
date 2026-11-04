import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { NearbyGuest } from "@/types/booking";

// Haversine formula to compute great-circle distance in kilometers
function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerLat = parseFloat(searchParams.get("lat") || "19.131102");
    const providerLng = parseFloat(searchParams.get("lng") || "72.81541");
    const radiusKm = parseFloat(searchParams.get("radius_km") || "25");
    const providerId = searchParams.get("provider_id")?.toLowerCase() || "";

    const nearbyGuests: NearbyGuest[] = [];
    const seenGuestNames = new Set<string>();

    // 1. Fetch active bookings from Supabase that have geographic coordinates
    try {
      const { data: activeBookings } = await supabase
        .from("bookings")
        .select("id, guest_name, guest_avatar, experience_name, latitude, longitude, city, booking_time, booking_date, status, provider_id")
        .in("status", ["Confirmed", "Driver En Route", "Driver Arrived"])
        .limit(50);

      if (activeBookings && Array.isArray(activeBookings)) {
        for (const item of activeBookings) {
          if (item.latitude && item.longitude) {
            const dist = calculateHaversineDistanceKm(
              providerLat,
              providerLng,
              item.latitude,
              item.longitude
            );

            if (dist <= radiusKm && !seenGuestNames.has(item.guest_name)) {
              seenGuestNames.add(item.guest_name);
              // Format privacy-compliant public name (e.g. "Ananya P.")
              const parts = item.guest_name.split(" ");
              const publicName = parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0];

              nearbyGuests.push({
                id: item.id,
                guest_name: publicName,
                guest_avatar: item.guest_avatar || "",
                experience_name: item.experience_name,
                category: "Local Exploration",
                distance_km: dist,
                area: item.city || "Mumbai",
                booking_time: item.booking_time,
                booking_date: item.booking_date,
                status: item.status,
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn("Supabase nearby query notice:", e);
    }

    // 2. Fetch active experiences from Supabase experience table with coordinates to detect nearby traveler activities
    try {
      const { data: experiences } = await supabase
        .from("experience")
        .select("experience_id, experience_name, latitude, longitude, city, district, category, best_time")
        .limit(30);

      if (experiences && Array.isArray(experiences)) {
        for (const exp of experiences) {
          if (exp.latitude && exp.longitude) {
            const dist = calculateHaversineDistanceKm(
              providerLat,
              providerLng,
              exp.latitude,
              exp.longitude
            );

            // If an experience is within radius and not hosted by this same provider ID
            if (dist > 0.1 && dist <= radiusKm) {
              const spotArea = exp.district || exp.city || "Mumbai";
              const key = `EXP-${exp.experience_id}`;
              if (!seenGuestNames.has(key)) {
                seenGuestNames.add(key);
              }
            }
          }
        }
      }
    } catch (e) {}

    // Sort closest first
    nearbyGuests.sort((a, b) => a.distance_km - b.distance_km);

    return NextResponse.json({
      success: true,
      data: nearbyGuests,
      providerCoordinates: { latitude: providerLat, longitude: providerLng },
      radiusKm,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}
