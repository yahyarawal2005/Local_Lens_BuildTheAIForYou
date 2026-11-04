export type ExperienceCategory =
  | 'Adventure'
  | 'Heritage'
  | 'Food'
  | 'Culture'
  | 'Nature & Adventure'
  | 'Photography'
  | 'Water Sports'
  | 'Wildlife'
  | 'Workshop'
  | 'Wellness'
  | 'Beach'
  | 'Nightlife'
  | 'Culture & Arts'
  | 'Culinary & Food'
  | 'Wellness & Spiritual'
  | 'Nightlife & Social'
  | 'Workshops & Crafts';

export type IndoorOutdoorType = 'Indoor' | 'Outdoor' | 'Mixed';

/**
 * EXACT 52-COLUMN SUPABASE DATABASE SCHEMA
 * Table: public.experience & View: public.experiences
 */
export interface ExperienceDatabaseRow {
  experience_id: string;
  experience_name: string;
  city: string;
  district: string;
  state: string;
  region: string;
  latitude: number;
  longitude: number;
  category: string;
  sub_category: string;
  description: string;
  tags: string; // Semicolon-separated: "mumbai;kayaking;sunset;beach"
  price_inr: string; // e.g. "1200"
  duration_hours: string; // e.g. "2.5"
  best_for: string; // Semicolon-separated: "Families;Couples;Solo Travelers"
  min_group_size: number;
  max_group_size: number | null;
  rating: number | null;
  review_count: number | null;
  best_time: string;
  season: string;
  indoor_outdoor: 'Indoor' | 'Outdoor' | 'Mixed';
  booking_required: 'Yes' | 'No';
  advance_booking_days: string;
  availability: string;
  accessibility: string;
  local_experience: 'Yes' | 'No';
  hidden_gem: 'Yes' | 'No';
  estimated_travel_time_from_city_center: string | null;
  estimated_travel_time_from_panvel: string | null;
  source_name: string;
  source_url: string | null;
  last_verified: string;
  price_inr_clean: number;
  duration_hours_clean: number;
  advance_booking_days_clean: number;
  travel_time_city_center_min: number | null;
  travel_time_panvel_hrs: number | null;
  travel_dist_panvel_km: number | null;
  local_experience_bool: boolean;
  hidden_gem_bool: boolean;
  booking_required_detail: string;
  booking_required_bool: boolean;
  indoor_outdoor_clean: 'Indoor' | 'Outdoor' | 'Mixed';
  rating_missing: boolean;
  review_count_missing: boolean;
  max_group_size_missing: boolean;
  image_url: string;
  image_note: string | null;
  provider_id: string | null;
  user_id: string | null;
  provider_email: string | null;
}

export interface ExperienceListing {
  // ML Dataset Schema Identity
  experience_id: string;
  experience_name: string;
  category: ExperienceCategory | string;
  sub_category: string;
  tags: string[];
  local_experience_bool: boolean;
  hidden_gem_bool: boolean;

  // Geolocation
  latitude: number;
  longitude: number;
  city: string;
  district: string;
  state: string;
  region: string;

  // Logistics & Pricing
  price_inr?: string;
  price_inr_clean: number;
  duration_hours?: string;
  duration_hours_clean: number;
  min_group_size: number;
  max_group_size: number | null;
  max_group_size_missing?: boolean;
  booking_required?: 'Yes' | 'No';
  booking_required_detail?: string;
  booking_required_bool: boolean;
  advance_booking_days?: string;
  advance_booking_days_clean: number;
  availability: string;

  // Travel Times
  estimated_travel_time_from_city_center?: string | null;
  estimated_travel_time_from_panvel?: string | null;
  travel_time_city_center_min?: number | null;
  travel_time_panvel_hrs?: number | null;
  travel_dist_panvel_km?: number | null;

  // Adaptability & Accessibility
  indoor_outdoor?: 'Indoor' | 'Outdoor' | 'Mixed';
  indoor_outdoor_clean: IndoorOutdoorType;
  best_time: string;
  season: string;
  accessibility: string;
  best_for?: string;

  // Media & Narrative
  image_url?: string;
  image_note?: string | null;
  images: string[];
  description: string;
  meeting_point?: string;
  inclusions?: string[];
  rules?: string[];
  cancellation_policy?: string;

  // Provider Platform Status
  status?: 'active' | 'needs_improvement' | 'boosted' | 'paused';
  health_score?: number; // 0 - 100
  boost_tier?: 'Weekend Spark' | 'Weekly Surge' | 'Season Push' | null;
  boost_expires_at?: string | null;
  earnings_generated_inr?: number;
  bookings_count?: number;
  rating?: number | null;
  rating_missing?: boolean;
  review_count?: number | null;
  review_count_missing?: boolean;

  // Provider Ownership & Identity
  provider_id?: string | null;
  user_id?: string | null;
  provider_email?: string | null;
  source_name?: string;
  source_url?: string | null;
  last_verified?: string;
}

export interface BoostPackage {
  id: string;
  name: 'Weekend Spark' | 'Weekly Surge' | 'Season Push';
  price: number;
  durationDays: number;
  multiplierText: string;
  description: string;
  recommendedFor: string;
}
