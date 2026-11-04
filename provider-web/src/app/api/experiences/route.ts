import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { ExperienceDatabaseRow } from "@/types/experience";

// Server-side provider registry for instant fallback & multi-tenant caching
const serverProviderRegistry: Map<string, ExperienceDatabaseRow[]> = new Map();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get("provider_id")?.trim();
    const providerEmail = searchParams.get("email")?.trim();

    // If no provider identity is provided, return empty for security & multi-tenant isolation
    if (!providerId && !providerEmail) {
      return NextResponse.json({ success: true, data: [] });
    }

    const cleanId = providerId?.toLowerCase() || "";
    const cleanEmail = providerEmail?.toLowerCase() || "";
    const results: any[] = [];
    const seenIds = new Set<string>();

    // 1. Fetch from Supabase experience table matching this provider
    try {
      const filters: string[] = [];
      if (cleanId) {
        filters.push(`provider_id.eq.${cleanId}`);
        filters.push(`user_id.eq.${cleanId}`);
        filters.push(`source_url.ilike.%/provider/${cleanId}%`);
        filters.push(`source_name.ilike.%${cleanId}%`);
        filters.push(`tags.ilike.%provider:${cleanId}%`);
      }
      if (cleanEmail && cleanEmail !== "provider@locallens.in") {
        filters.push(`provider_email.eq.${cleanEmail}`);
        filters.push(`source_url.ilike.%${cleanEmail}%`);
        filters.push(`tags.ilike.%provider_email:${cleanEmail}%`);
      }

      if (filters.length > 0) {
        const { data, error } = await supabase
          .from("experience")
          .select("*")
          .or(filters.join(","));

        if (!error && Array.isArray(data)) {
          for (const item of data) {
            const k = (item.experience_id || item.experience_name || "").trim().toLowerCase();
            if (k && !seenIds.has(k)) {
              seenIds.add(k);
              results.push(item);
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase provider query notice:", err);
    }

    // 2. Fetch from server-side provider registry
    const registryItems: any[] = [
      ...(cleanId ? serverProviderRegistry.get(cleanId) || [] : []),
      ...(cleanEmail && cleanEmail !== cleanId ? serverProviderRegistry.get(cleanEmail) || [] : []),
    ];

    for (const item of registryItems) {
      const k = (item.experience_id || item.experience_name || "").trim().toLowerCase();
      if (k && !seenIds.has(k)) {
        seenIds.add(k);
        results.push(item);
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ExperienceDatabaseRow;

    if (!body || !body.experience_name) {
      return NextResponse.json(
        { success: false, error: "Invalid experience data: name is required" },
        { status: 400 }
      );
    }

    const providerId = (body.provider_id || "provider_default").trim();
    const providerEmail = (body.provider_email || "").trim();
    const cleanId = providerId.toLowerCase();
    const cleanEmail = providerEmail.toLowerCase();

    // 1. Build the full 52-column record
    const experienceRecord: ExperienceDatabaseRow = {
      experience_id: body.experience_id || `LL-EXP-${Date.now().toString(36).toUpperCase()}`,
      experience_name: body.experience_name.trim(),
      city: body.city || "Mumbai",
      district: body.district || body.city || "Mumbai",
      state: body.state || "Maharashtra",
      region: body.region || "Konkan",
      latitude: Number(body.latitude) || 19.076,
      longitude: Number(body.longitude) || 72.8777,
      category: body.category || "Adventure",
      sub_category: body.sub_category || "Kayaking",
      description: body.description || "",
      tags: typeof body.tags === "string" ? body.tags : Array.isArray(body.tags) ? (body.tags as string[]).join(";") : "",
      price_inr: String(body.price_inr || body.price_inr_clean || "0"),
      duration_hours: String(body.duration_hours || body.duration_hours_clean || "2"),
      best_for: body.best_for || "Travelers;Families",
      min_group_size: Number(body.min_group_size) || 1,
      max_group_size: body.max_group_size !== undefined && body.max_group_size !== null ? Number(body.max_group_size) : null,
      rating: null, // STRICT: No fake ratings
      review_count: null, // STRICT: No fake review count
      best_time: body.best_time || "Morning or evening",
      season: body.season || "All",
      indoor_outdoor: body.indoor_outdoor || "Outdoor",
      booking_required: body.booking_required || "Yes",
      advance_booking_days: String(body.advance_booking_days || "0"),
      availability: body.availability || "Daily",
      accessibility: body.accessibility || "Wheelchair accessible partially",
      local_experience: body.local_experience || "Yes",
      hidden_gem: body.hidden_gem || "No",
      estimated_travel_time_from_city_center: body.estimated_travel_time_from_city_center || null,
      estimated_travel_time_from_panvel: body.estimated_travel_time_from_panvel || null,
      source_name: body.source_name || "LocalLens Provider",
      source_url: body.source_url || null,
      last_verified: body.last_verified || new Date().toISOString().slice(0, 7),
      price_inr_clean: Number(body.price_inr_clean) || 0,
      duration_hours_clean: Number(body.duration_hours_clean) || 2,
      advance_booking_days_clean: Number(body.advance_booking_days_clean) || 0,
      travel_time_city_center_min: body.travel_time_city_center_min !== undefined ? body.travel_time_city_center_min : null,
      travel_time_panvel_hrs: body.travel_time_panvel_hrs !== undefined ? body.travel_time_panvel_hrs : null,
      travel_dist_panvel_km: body.travel_dist_panvel_km !== undefined ? body.travel_dist_panvel_km : null,
      local_experience_bool: body.local_experience_bool !== undefined ? Boolean(body.local_experience_bool) : true,
      hidden_gem_bool: body.hidden_gem_bool !== undefined ? Boolean(body.hidden_gem_bool) : false,
      booking_required_detail: body.booking_required_detail || body.booking_required || "Yes",
      booking_required_bool: body.booking_required_bool !== undefined ? Boolean(body.booking_required_bool) : true,
      indoor_outdoor_clean: body.indoor_outdoor_clean || body.indoor_outdoor || "Outdoor",
      rating_missing: true,
      review_count_missing: true,
      max_group_size_missing: body.max_group_size === null || body.max_group_size === undefined,
      image_url: body.image_url || "https://images.unsplash.com/photo-1544551763-46a013bb70d5",
      image_note: body.image_note || null,
      provider_id: cleanId,
      user_id: body.user_id || cleanId,
      provider_email: cleanEmail,
    };

    // 2. Persist in memory registry
    const existingForId = serverProviderRegistry.get(cleanId) || [];
    serverProviderRegistry.set(
      cleanId,
      [experienceRecord, ...existingForId.filter((x) => x.experience_id !== experienceRecord.experience_id)]
    );

    // 3. Persist to Supabase public.experience table
    let dbSuccess = false;
    let dbWarning: string | null = null;
    let insertedRow: any = null;

    try {
      const { data: existingRow } = await supabase
        .from("experience")
        .select("experience_id")
        .eq("experience_id", experienceRecord.experience_id)
        .maybeSingle();

      if (existingRow) {
        const { data, error } = await supabase
          .from("experience")
          .update(experienceRecord)
          .eq("experience_id", experienceRecord.experience_id)
          .select()
          .single();
        if (error) {
          dbWarning = error.message;
        } else {
          dbSuccess = true;
          insertedRow = data;
        }
      } else {
        const { data, error } = await supabase
          .from("experience")
          .insert([experienceRecord])
          .select()
          .single();
        if (error) {
          dbWarning = error.message;
        } else {
          dbSuccess = true;
          insertedRow = data;
        }
      }
    } catch (dbErr: any) {
      dbWarning = dbErr.message;
    }

    return NextResponse.json({
      success: true,
      dbSuccess,
      warning: dbWarning,
      record: insertedRow || experienceRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
