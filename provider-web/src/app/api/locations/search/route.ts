import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export interface LocationSuggestion {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  city?: string;
  district?: string;
  state?: string;
  source: "verified" | "osm" | "city";
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q")?.trim() || "";
    if (q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cleanQuery = q.toLowerCase();
    const suggestions: LocationSuggestion[] = [];
    const seenKeys = new Set<string>();

    // 1. Search verified local experiences & landmarks from Supabase
    try {
      const { data: dbData, error } = await supabase
        .from("experience")
        .select("experience_id, experience_name, city, district, state, latitude, longitude")
        .or(`experience_name.ilike.%${cleanQuery}%,city.ilike.%${cleanQuery}%,district.ilike.%${cleanQuery}%`)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .limit(8);

      if (!error && Array.isArray(dbData)) {
        for (const item of dbData) {
          const name = item.experience_name?.trim();
          const city = item.city?.trim() || "";
          const state = item.state?.trim() || "";
          const key = `${name}-${city}`.toLowerCase();
          if (name && !seenKeys.has(key)) {
            seenKeys.add(key);
            suggestions.push({
              id: `db-${item.experience_id}`,
              name: name,
              displayName: `${name}, ${city}${state ? `, ${state}` : ""}`,
              lat: Number(item.latitude),
              lng: Number(item.longitude),
              city: city,
              district: item.district?.trim() || city,
              state: state,
              source: "verified",
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn("Location search DB query notice:", dbErr);
    }

    // 2. Open-Meteo cities search
    try {
      const meteoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cleanQuery)}&count=5&language=en&format=json`,
        { signal: AbortSignal.timeout(1500) }
      );
      if (meteoRes.ok) {
        const meteoData = await meteoRes.json();
        if (Array.isArray(meteoData.results)) {
          for (const item of meteoData.results) {
            const name = item.name?.trim();
            const country = item.country?.trim() || "";
            const admin1 = item.admin1?.trim() || "";
            const key = `${name}-${country}`.toLowerCase();
            if (name && !seenKeys.has(key)) {
              seenKeys.add(key);
              suggestions.push({
                id: `meteo-${item.id}`,
                name: name,
                displayName: `${name}, ${admin1}${country ? `, ${country}` : ""}`,
                lat: Number(item.latitude),
                lng: Number(item.longitude),
                city: name,
                district: item.admin2?.trim() || admin1,
                state: admin1,
                source: "city",
              });
            }
          }
        }
      }
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true, data: suggestions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}