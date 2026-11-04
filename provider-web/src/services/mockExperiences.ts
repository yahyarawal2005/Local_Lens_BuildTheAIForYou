import { ExperienceListing, BoostPackage } from "@/types/experience";

export interface BookingRecord {
  booking_id: string;
  experience_id: string;
  experience_name: string;
  traveler_name: string;
  traveler_phone: string;
  traveler_email: string;
  slots: number;
  total_amount_inr: number;
  date_time: string;
  status: "Confirmed" | "Checked-in" | "Completed" | "Cancelled";
  meeting_point: string;
}

export const BOOST_PACKAGES: BoostPackage[] = [
  {
    id: "boost-spark",
    name: "Weekend Spark",
    price: 499,
    durationDays: 3,
    multiplierText: "2.4x Views",
    description: "Peak exposure across discovery feed & rider-app pins for Friday - Sunday traveler waves.",
    recommendedFor: "Weekend getaways & culinary workshops",
  },
  {
    id: "boost-surge",
    name: "Weekly Surge",
    price: 999,
    durationDays: 7,
    multiplierText: "4.8x Bookings",
    description: "Featured top placement in recommendation engine and 3D itinerary builder for 7 days.",
    recommendedFor: "High-margin heritage walks & nature adventures",
  },
  {
    id: "boost-push",
    name: "Season Push",
    price: 1999,
    durationDays: 14,
    multiplierText: "9.2x Reach",
    description: "Persistent top-tier hero billboard, priority traveler push notifications, and VIP radar ring.",
    recommendedFor: "Flagship masterclasses & iconic cultural expeditions",
  },
];

export const INITIAL_EXPERIENCES: ExperienceListing[] = [
  {
    experience_id: "EXP-MUM-001",
    experience_name: "Colaba Heritage Art & Secret Architecture Trail",
    category: "Heritage",
    sub_category: "Colonial & Deco Walking Tour",
    tags: ["heritage", "architecture", "south-mumbai", "photo-walk"],
    local_experience_bool: true,
    hidden_gem_bool: false,
    latitude: 18.922,
    longitude: 72.8347,
    city: "Mumbai",
    district: "South Mumbai",
    state: "Maharashtra",
    region: "Konkan",
    price_inr_clean: 1200,
    duration_hours_clean: 3.0,
    min_group_size: 2,
    max_group_size: 12,
    booking_required_bool: true,
    advance_booking_days_clean: 1,
    availability: "Tuesday to Sunday, 07:30 AM & 04:30 PM",
    indoor_outdoor_clean: "Outdoor",
    best_time: "Early morning or golden hour sunset",
    season: "October to March",
    accessibility: "Moderate walking, wheelchair assistance on request",
    images: [
      "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1566552881560-0be862a7c445?auto=format&fit=crop&w=1000&q=80",
    ],
    description: "Unravel Mumbai's hidden Victorian Gothic and Art Deco masterpieces with a conservation architect. Trace forgotten courtyards and vintage cafes tucked behind Colaba Causeway.",
    meeting_point: "Regal Cinema Foyer, Colaba Causeway",
    inclusions: ["Architect-guided narrative", "Art Deco illustrated handbook", "Filter coffee & Irani chai stop"],
    rules: ["Wear comfortable walking shoes", "Photography permitted for personal use"],
    cancellation_policy: "100% refund up to 24 hours before start time",
    status: "active",
    health_score: 96,
    earnings_generated_inr: 86400,
    bookings_count: 72,
    rating: 4.88,
    review_count: 64,
  },
  {
    experience_id: "EXP-MUM-002",
    experience_name: "Koli Fisherfolk Dawn Catch & Coastal Culinary Masterclass",
    category: "Culinary & Food",
    sub_category: "Seafood Cooking & Community Immersion",
    tags: ["koli", "culinary", "coastal", "sunrise", "seafood"],
    local_experience_bool: true,
    hidden_gem_bool: true,
    latitude: 18.9067,
    longitude: 72.8142,
    city: "Mumbai",
    district: "Mumbai City",
    state: "Maharashtra",
    region: "Konkan",
    price_inr_clean: 2400,
    duration_hours_clean: 4.5,
    min_group_size: 2,
    max_group_size: 6,
    booking_required_bool: true,
    advance_booking_days_clean: 2,
    availability: "Weekends only, 06:00 AM",
    indoor_outdoor_clean: "Mixed",
    best_time: "Dawn sunrise 06:00 AM",
    season: "September to May (closed during monsoon breeding season)",
    accessibility: "Steep dock steps; not wheelchair accessible",
    images: [
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1000&q=80",
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80",
    ],
    description: "Board a traditional wooden dhow at Sassoon Dock as fishermen haul the night catch. Head to a 4th-generation Koli ancestral home to cook pomfret curry and crisp bombil using secret hand-ground masalas.",
    meeting_point: "Gate 1, Sassoon Docks clock tower, Colaba",
    inclusions: ["Dock permit and guided auction walkthrough", "All fresh seafood and spices", "Full multi-course coastal breakfast feast"],
    rules: ["Waterproof footwear mandatory", "No flash photography at fishing auction desks"],
    cancellation_policy: "Free cancellation up to 48 hours before experience",
    status: "boosted",
    boost_tier: "Weekly Surge",
    boost_expires_at: "2026-09-30T23:59:59Z",
    health_score: 98,
    earnings_generated_inr: 144000,
    bookings_count: 60,
    rating: 4.96,
    review_count: 51,
  },
  {
    experience_id: "EXP-MUM-003",
    experience_name: "Elephanta Caves Sunset Catamaran & Mythological Storytelling",
    category: "Nature & Adventure",
    sub_category: "Island Exploration & Cave Mythology",
    tags: ["island", "caves", "sailing", "sunset", "mythology"],
    local_experience_bool: true,
    hidden_gem_bool: false,
    latitude: 18.9633,
    longitude: 72.9315,
    city: "Navi Mumbai",
    district: "Raigad",
    state: "Maharashtra",
    region: "Konkan",
    price_inr_clean: 1850,
    duration_hours_clean: 5.0,
    min_group_size: 4,
    max_group_size: 16,
    booking_required_bool: true,
    advance_booking_days_clean: 1,
    availability: "Wednesday to Sunday, 01:30 PM",
    indoor_outdoor_clean: "Outdoor",
    best_time: "Afternoon into sunset (1:30 PM departure)",
    season: "October to April",
    accessibility: "Mini-toy train available at island jetty; 120 stone steps to cave summit",
    images: [
      "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1000&q=80",
    ],
    description: "Private speedboat journey across Mumbai harbour to Gharapuri Island. Decode the monumental 3-faced Sadashiva sculpture with an archaeological historian before sailing back under twilight sails.",
    meeting_point: "Jetty No. 5, Gateway of India, Mumbai",
    inclusions: ["Return speed catamaran transfers", "Cave entry tickets", "Expert archaeological storyteller", "High tea & bottled water"],
    rules: ["Lifejackets required during boat ride", "Do not feed island monkeys"],
    cancellation_policy: "Full refund 48 hours prior; weather cancellations 100% refunded",
    status: "active",
    health_score: 94,
    earnings_generated_inr: 111000,
    bookings_count: 60,
    rating: 4.82,
    review_count: 42,
  },
  {
    experience_id: "EXP-MUM-004",
    experience_name: "Bandra Indo-Portuguese Alleys & Vintage Graffiti Hunt",
    category: "Culture & Arts",
    sub_category: "Urban Subculture & Street Murals",
    tags: ["bandra", "street-art", "portuguese-village", "indie"],
    local_experience_bool: true,
    hidden_gem_bool: true,
    latitude: 19.0544,
    longitude: 72.8277,
    city: "Mumbai",
    district: "Mumbai Suburban",
    state: "Maharashtra",
    region: "Konkan",
    price_inr_clean: 950,
    duration_hours_clean: 2.0,
    min_group_size: 1,
    max_group_size: 8,
    booking_required_bool: false,
    advance_booking_days_clean: 0,
    availability: "Daily, flexible 10:00 AM - 06:00 PM",
    indoor_outdoor_clean: "Outdoor",
    best_time: "Morning 08:30 AM or late afternoon 04:30 PM",
    season: "All Year",
    accessibility: "Pedestrian village lanes with minor curbs",
    images: [
      "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80",
    ],
    description: "Explore the bohemian streets of Ranwar and Chapel Road where Portuguese cross-shrines blend into psychedelic Bollywood murals and cutting-edge typography.",
    meeting_point: "",
    inclusions: ["Local community docent", "Cold brewed organic kombucha"],
    rules: ["Respect residential privacy inside quiet village hamlets"],
    cancellation_policy: "Flexible cancellation up to 6 hours before start",
    status: "needs_improvement",
    health_score: 68,
    earnings_generated_inr: 28500,
    bookings_count: 30,
    rating: 4.65,
    review_count: 18,
  },
];

export const INITIAL_BOOKINGS: BookingRecord[] = [
  {
    booking_id: "BK-8821",
    experience_id: "EXP-MUM-001",
    experience_name: "Colaba Heritage Art & Secret Architecture Trail",
    traveler_name: "Priya Sharma",
    traveler_phone: "+91 98201 44321",
    traveler_email: "priya.sharma@gmail.com",
    slots: 2,
    total_amount_inr: 2400,
    date_time: "Today, 04:30 PM",
    status: "Confirmed",
    meeting_point: "Regal Cinema Foyer, Colaba Causeway",
  },
  {
    booking_id: "BK-8822",
    experience_id: "EXP-MUM-002",
    experience_name: "Koli Fisherfolk Dawn Catch & Coastal Culinary Masterclass",
    traveler_name: "David Miller",
    traveler_phone: "+44 7911 123456",
    traveler_email: "david.m@wanderlust.co.uk",
    slots: 4,
    total_amount_inr: 9600,
    date_time: "Tomorrow, 06:00 AM",
    status: "Confirmed",
    meeting_point: "Gate 1, Sassoon Docks clock tower, Colaba",
  },
  {
    booking_id: "BK-8823",
    experience_id: "EXP-MUM-003",
    experience_name: "Elephanta Caves Sunset Catamaran & Storytelling",
    traveler_name: "Rohan & Ananya Varma",
    traveler_phone: "+91 99870 12890",
    traveler_email: "rohan.v@outlook.com",
    slots: 2,
    total_amount_inr: 3700,
    date_time: "Today, 01:30 PM",
    status: "Checked-in",
    meeting_point: "Jetty No. 5, Gateway of India",
  },
  {
    booking_id: "BK-8824",
    experience_id: "EXP-MUM-001",
    experience_name: "Colaba Heritage Art & Secret Architecture Trail",
    traveler_name: "Aakash Mehta",
    traveler_phone: "+91 97654 32109",
    traveler_email: "aakash.m@corp.in",
    slots: 1,
    total_amount_inr: 1200,
    date_time: "Yesterday, 07:30 AM",
    status: "Completed",
    meeting_point: "Regal Cinema Foyer, Colaba Causeway",
  },
];

// In-browser state persistence helper
const STORAGE_KEY_EXPERIENCES = "locallens_provider_experiences";
const STORAGE_KEY_BOOKINGS = "locallens_provider_bookings";
const STORAGE_KEY_WEATHER_PAUSE = "locallens_weather_paused";

export function getStoredExperiences(): ExperienceListing[] {
  if (typeof window === "undefined") return INITIAL_EXPERIENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPERIENCES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_EXPERIENCES, JSON.stringify(INITIAL_EXPERIENCES));
      return INITIAL_EXPERIENCES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EXPERIENCES;
  }
}

export function saveStoredExperiences(experiences: ExperienceListing[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_EXPERIENCES, JSON.stringify(experiences));
  } catch (err) {
    console.error("Failed to save experiences", err);
  }
}

/**
 * Returns experiences created specifically by the given provider ID/email.
 * Ensures strict multi-tenant isolation so providers only see their own listings.
 */
export function getStoredExperiencesForProvider(
  providerId?: string | null,
  providerEmail?: string | null
): ExperienceListing[] {
  if (typeof window === "undefined") return [];
  const cleanId = (providerId || "").trim().toLowerCase();
  const cleanEmail = (providerEmail || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) return [];

  try {
    const results: ExperienceListing[] = [];
    const seen = new Set<string>();

    // 1. Check primary ID key
    if (cleanId) {
      const raw = localStorage.getItem(`${STORAGE_KEY_EXPERIENCES}_${cleanId}`);
      if (raw) {
        const parsed: ExperienceListing[] = JSON.parse(raw);
        for (const item of parsed) {
          const k = item.experience_id || item.experience_name;
          if (k && !seen.has(k)) {
            seen.add(k);
            results.push(item);
          }
        }
      }
    }

    // 2. Check email key if different
    if (cleanEmail && cleanEmail !== cleanId) {
      const rawEmail = localStorage.getItem(`${STORAGE_KEY_EXPERIENCES}_${cleanEmail}`);
      if (rawEmail) {
        const parsed: ExperienceListing[] = JSON.parse(rawEmail);
        for (const item of parsed) {
          const k = item.experience_id || item.experience_name;
          if (k && !seen.has(k)) {
            seen.add(k);
            results.push(item);
          }
        }
      }
    }

    // 3. Fallback: scan global store and strictly filter by provider ID or email
    const globalRaw = localStorage.getItem(STORAGE_KEY_EXPERIENCES);
    if (globalRaw) {
      const all: ExperienceListing[] = JSON.parse(globalRaw);
      for (const exp of all) {
        const pId = (exp.provider_id || "").toLowerCase();
        const pEmail = (exp.provider_email || "").toLowerCase();
        const match =
          (cleanId && (pId === cleanId || pEmail === cleanId)) ||
          (cleanEmail && (pId === cleanEmail || pEmail === cleanEmail));
        if (match) {
          const k = exp.experience_id || exp.experience_name;
          if (k && !seen.has(k)) {
            seen.add(k);
            results.push(exp);
          }
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

/**
 * Saves experiences exclusively for the given provider ID/email.
 */
export function saveStoredExperiencesForProvider(
  providerId: string | null | undefined,
  experiences: ExperienceListing[],
  providerEmail?: string | null
): void {
  if (typeof window === "undefined") return;
  const cleanId = (providerId || "").trim().toLowerCase();
  const cleanEmail = (providerEmail || "").trim().toLowerCase();
  if (!cleanId && !cleanEmail) return;

  try {
    if (cleanId) {
      localStorage.setItem(`${STORAGE_KEY_EXPERIENCES}_${cleanId}`, JSON.stringify(experiences));
    }
    if (cleanEmail) {
      localStorage.setItem(`${STORAGE_KEY_EXPERIENCES}_${cleanEmail}`, JSON.stringify(experiences));
    }

    // Also update global store with provider stamps preserved
    const globalRaw = localStorage.getItem(STORAGE_KEY_EXPERIENCES);
    let existing: ExperienceListing[] = [];
    try {
      if (globalRaw && globalRaw.trim() && globalRaw !== "undefined" && globalRaw !== "null") {
        existing = JSON.parse(globalRaw);
      }
    } catch (_) {
      existing = [];
    }
    const others = existing.filter((exp: any) => {
      const pId = (exp.provider_id || "").toLowerCase();
      const pEmail = (exp.provider_email || "").toLowerCase();
      const isThisProvider =
        (cleanId && (pId === cleanId || pEmail === cleanId)) ||
        (cleanEmail && (pId === cleanEmail || pEmail === cleanEmail));
      return !isThisProvider;
    });
    localStorage.setItem(STORAGE_KEY_EXPERIENCES, JSON.stringify([...experiences, ...others]));
  } catch (err) {
    console.error("Failed to save provider experiences", err);
  }
}

export function getStoredBookings(): BookingRecord[] {
  if (typeof window === "undefined") return INITIAL_BOOKINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
      return INITIAL_BOOKINGS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_BOOKINGS;
  }
}

export function saveStoredBookings(bookings: BookingRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  } catch (err) {
    console.error("Failed to save bookings", err);
  }
}

export function getStoredWeatherPause(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(STORAGE_KEY_WEATHER_PAUSE) === "true";
  } catch {
    return false;
  }
}

export function setStoredWeatherPause(paused: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_WEATHER_PAUSE, String(paused));
  } catch (err) {
    console.error("Failed to save weather state", err);
  }
}