import { ExperienceDatabaseRow, ExperienceListing } from "@/types/experience";
import { calculatePanvelDistanceKm } from "@/utils/geoMath";
import { supabase } from "@/lib/supabaseClient";

export interface ExperienceFormState {
  // Step 1: Basic Information
  experience_name: string;
  description: string;
  tags: string[];
  best_for: string[];

  // Step 2: Location
  city: string;
  district: string;
  state: string;
  region: string;
  latitude: number;
  longitude: number;
  estimated_travel_time_from_city_center: string;
  estimated_travel_time_from_panvel: string;

  // Step 3: Category & Experience Details
  category: string;
  sub_category: string;
  indoor_outdoor: "Indoor" | "Outdoor" | "Mixed";

  // Step 4: Pricing & Group
  price_inr: string | number;
  duration_hours: string | number;
  min_group_size: number;
  max_group_size: number | null;
  has_no_max_group: boolean;

  // Step 5: Availability & Booking
  availability: string;
  best_time: string;
  season: string;
  booking_required: "Yes" | "No";
  booking_required_detail: string;
  advance_booking_days: string | number;

  // Step 6: Accessibility & Experience Attributes
  accessibility: string;
  local_experience: "Yes" | "No";
  hidden_gem: "Yes" | "No";

  // Step 7: Media & Source
  image_url: string;
  image_note: string;
  images: string[];
  source_name?: string;
  source_url?: string | null;

  // Internal / Auth
  experience_id?: string;
  provider_id?: string;
  user_id?: string;
  provider_email?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates experience form data before normalization and database insertion.
 */
export function validateExperienceForm(form: ExperienceFormState): ValidationResult {
  const errors: Record<string, string> = {};

  // Step 1: Basic
  if (!form.experience_name || form.experience_name.trim().length < 3) {
    errors.experience_name = "Experience name is required (minimum 3 characters).";
  }
  if (!form.description || form.description.trim().length < 20) {
    errors.description = "Please provide a detailed description (minimum 20 characters).";
  }
  if (!form.tags || form.tags.length === 0) {
    errors.tags = "Please add at least one tag (e.g. sunset, kayaking).";
  }

  // Step 2: Location
  if (!form.city || form.city.trim().length === 0) {
    errors.city = "City is required.";
  }
  if (!form.state || form.state.trim().length === 0) {
    errors.state = "State is required.";
  }
  if (
    typeof form.latitude !== "number" ||
    isNaN(form.latitude) ||
    form.latitude < -90 ||
    form.latitude > 90
  ) {
    errors.latitude = "Valid latitude is required (-90 to +90).";
  }
  if (
    typeof form.longitude !== "number" ||
    isNaN(form.longitude) ||
    form.longitude < -180 ||
    form.longitude > 180
  ) {
    errors.longitude = "Valid longitude is required (-180 to +180).";
  }

  // Step 3: Category
  if (!form.category || form.category.trim().length === 0) {
    errors.category = "Please select a category.";
  }
  if (!form.sub_category || form.sub_category.trim().length === 0) {
    errors.sub_category = "Please select or enter a sub-category.";
  }

  // Step 4: Pricing & Group
  const priceNum = parseFloat(String(form.price_inr || "0"));
  if (isNaN(priceNum) || priceNum < 0) {
    errors.price_inr = "Price must be a valid number (0 or greater).";
  }

  const durationNum = parseFloat(String(form.duration_hours || "0"));
  if (isNaN(durationNum) || durationNum <= 0) {
    errors.duration_hours = "Duration must be greater than 0 hours.";
  }

  if (form.min_group_size < 1) {
    errors.min_group_size = "Minimum group size must be at least 1.";
  }

  if (!form.has_no_max_group && form.max_group_size !== null) {
    if (form.max_group_size < form.min_group_size) {
      errors.max_group_size = "Maximum group size cannot be less than minimum group size.";
    }
  }

  // Step 5: Availability & Booking
  if (!form.availability || form.availability.trim().length === 0) {
    errors.availability = "Please specify availability schedule.";
  }

  // Step 7: Media
  if (!form.image_url || !form.image_url.trim().startsWith("http")) {
    errors.image_url = "A valid primary image URL is required.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Normalizes user form state into the exact 52-column Supabase database payload.
 */
export function normalizeExperiencePayload(
  form: ExperienceFormState,
  auth: { provider_id: string; user_id: string; provider_email: string }
): ExperienceDatabaseRow {
  // 1. Tags: semicolon-separated: "mumbai;kayaking;sunset;beach"
  const cleanTags = Array.isArray(form.tags)
    ? form.tags
        .map((t) => t.trim().toLowerCase().replace(/;/g, ""))
        .filter(Boolean)
    : String(form.tags || "")
        .split(/[,;]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
  const tagsString = Array.from(new Set(cleanTags)).join(";");

  // 2. Best For: semicolon-separated: "Families;Couples;Solo Travelers"
  const cleanBestFor = Array.isArray(form.best_for)
    ? form.best_for.map((b) => b.trim()).filter(Boolean)
    : String(form.best_for || "")
        .split(/[,;]/)
        .map((b) => b.trim())
        .filter(Boolean);
  const bestForString = Array.from(new Set(cleanBestFor)).join(";");

  // 3. Price & Clean Numeric Price
  const cleanPrice = Math.max(0, Math.round(parseFloat(String(form.price_inr)) || 0));
  const priceInr = String(cleanPrice);

  // 4. Duration & Clean Numeric Duration
  const cleanDuration = Math.max(0.5, parseFloat(String(form.duration_hours)) || 2.0);
  const durationHours = String(cleanDuration);

  // 5. Group Sizes
  const minGroup = Math.max(1, Math.round(Number(form.min_group_size) || 1));
  const maxGroupMissing = form.has_no_max_group || form.max_group_size === null;
  const maxGroup = maxGroupMissing ? null : Math.max(minGroup, Math.round(Number(form.max_group_size)));

  // 6. Booking & Advance Days
  const bookingRequired = form.booking_required === "Yes" ? "Yes" : "No";
  const bookingRequiredBool = bookingRequired === "Yes";
  const bookingDetail = form.booking_required_detail?.trim() || bookingRequired;
  const advanceDaysClean = Math.max(0, Math.round(parseFloat(String(form.advance_booking_days)) || 0));
  const advanceDays = String(advanceDaysClean);

  // 7. Travel times & distances
  const cityCenterMinParsed = parseInt(
    String(form.estimated_travel_time_from_city_center || "").replace(/[^0-9]/g, ""),
    10
  );
  const travelTimeCityCenterMin = !isNaN(cityCenterMinParsed) && cityCenterMinParsed > 0 ? cityCenterMinParsed : null;
  const estimatedCityCenter = form.estimated_travel_time_from_city_center?.trim() || (travelTimeCityCenterMin ? `${travelTimeCityCenterMin} min` : null);

  const panvelHrsParsed = parseFloat(
    String(form.estimated_travel_time_from_panvel || "").replace(/[^0-9.]/g, "")
  );
  const travelTimePanvelHrs = !isNaN(panvelHrsParsed) && panvelHrsParsed > 0 ? panvelHrsParsed : null;
  const estimatedPanvel = form.estimated_travel_time_from_panvel?.trim() || (travelTimePanvelHrs ? `${travelTimePanvelHrs} hrs` : null);

  const panvelDistanceKm = calculatePanvelDistanceKm(form.latitude, form.longitude);

  // 8. Unique Experience ID
  const experienceId =
    form.experience_id?.trim() ||
    `LL-EXP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 9. Current year-month verification
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return {
    experience_id: experienceId,
    experience_name: form.experience_name.trim(),
    city: form.city.trim(),
    district: form.district?.trim() || form.city.trim(),
    state: form.state.trim(),
    region: form.region?.trim() || "Konkan",
    latitude: Number(form.latitude),
    longitude: Number(form.longitude),
    category: form.category.trim(),
    sub_category: form.sub_category.trim(),
    description: form.description.trim(),
    tags: tagsString,
    price_inr: priceInr,
    duration_hours: durationHours,
    best_for: bestForString,
    min_group_size: minGroup,
    max_group_size: maxGroup,
    rating: null, // STRICT: No fake ratings for newly created experiences
    review_count: null, // STRICT: No fake review count
    best_time: form.best_time?.trim() || "Morning or evening",
    season: form.season?.trim() || "All",
    indoor_outdoor: form.indoor_outdoor || "Outdoor",
    booking_required: bookingRequired,
    advance_booking_days: advanceDays,
    availability: form.availability?.trim() || "Daily",
    accessibility: form.accessibility?.trim() || "Wheelchair accessible partially",
    local_experience: form.local_experience === "Yes" ? "Yes" : "No",
    hidden_gem: form.hidden_gem === "Yes" ? "Yes" : "No",
    estimated_travel_time_from_city_center: estimatedCityCenter,
    estimated_travel_time_from_panvel: estimatedPanvel,
    source_name: form.source_name?.trim() || "LocalLens Provider",
    source_url: form.source_url?.trim() || null,
    last_verified: yearMonth,
    price_inr_clean: cleanPrice,
    duration_hours_clean: cleanDuration,
    advance_booking_days_clean: advanceDaysClean,
    travel_time_city_center_min: travelTimeCityCenterMin,
    travel_time_panvel_hrs: travelTimePanvelHrs,
    travel_dist_panvel_km: panvelDistanceKm,
    local_experience_bool: form.local_experience === "Yes",
    hidden_gem_bool: form.hidden_gem === "Yes",
    booking_required_detail: bookingDetail,
    booking_required_bool: bookingRequiredBool,
    indoor_outdoor_clean: form.indoor_outdoor || "Outdoor",
    rating_missing: true,
    review_count_missing: true,
    max_group_size_missing: maxGroupMissing,
    image_url: form.image_url.trim(),
    image_note: form.image_note?.trim() || null,
    provider_id: auth.provider_id,
    user_id: auth.user_id,
    provider_email: auth.provider_email,
  };
}

/**
 * Inserts the normalized 52-column experience into Supabase and verifies
 * persistence by reading back the created row.
 */
export async function insertExperienceToSupabase(
  payload: ExperienceDatabaseRow
): Promise<{ success: boolean; data?: ExperienceDatabaseRow; error?: string; verified: boolean }> {
  try {
    // 1. Insert into Supabase table public.experience
    const { data: inserted, error: insertErr } = await supabase
      .from("experience")
      .insert([payload])
      .select()
      .single();

    if (insertErr) {
      // Fallback try on view public.experiences if permission rule dictates
      const { data: viewInserted, error: viewErr } = await supabase
        .from("experiences")
        .insert([payload])
        .select()
        .single();

      if (viewErr) {
        return {
          success: false,
          error: insertErr.message || viewErr.message,
          verified: false,
        };
      }
    }

    // 2. Perform database verification query (Requirement 41)
    const { data: verifiedRow, error: verifyErr } = await supabase
      .from("experience")
      .select("*")
      .eq("experience_id", payload.experience_id)
      .maybeSingle();

    if (verifyErr || !verifiedRow) {
      console.warn("Post-insert verification warning:", verifyErr?.message);
      return {
        success: true,
        data: (inserted || payload) as ExperienceDatabaseRow,
        verified: false,
      };
    }

    return {
      success: true,
      data: verifiedRow as ExperienceDatabaseRow,
      verified: true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to execute database insert pipeline.",
      verified: false,
    };
  }
}

/**
 * Updates an existing experience in Supabase.
 */
export async function updateExperienceInSupabase(
  experienceId: string,
  payload: Partial<ExperienceDatabaseRow>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("experience")
      .update(payload)
      .eq("experience_id", experienceId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
