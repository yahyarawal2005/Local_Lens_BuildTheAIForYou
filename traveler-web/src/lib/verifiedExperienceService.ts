// ==============================================================================
// LocalLens Web - Verified Supabase Experience Service
// Queries and manages records from Supabase table where:
// image_note = 'verified exact match'
// ==============================================================================

import { supabase } from '@/lib/supabase';
import { RecommendationModel } from '@/types';

export interface VerifiedExperienceRecord {
  id?: number;
  experience_id: string;
  experience_name: string;
  city: string;
  district?: string | null;
  state?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category: string;
  sub_category?: string | null;
  description?: string | null;
  tags?: string | null;
  price_inr?: string | number | null;
  price_inr_clean?: number | null;
  duration_hours?: string | number | null;
  duration_hours_clean?: number | null;
  best_for?: string | null;
  min_group_size?: number | null;
  max_group_size?: number | null;
  rating?: number | null;
  review_count?: number | null;
  best_time?: string | null;
  season?: string | null;
  indoor_outdoor?: string | null;
  booking_required?: string | null;
  advance_booking_days?: string | number | null;
  availability?: string | null;
  accessibility?: string | null;
  local_experience?: string | boolean | null;
  hidden_gem?: string | boolean | null;
  image_url?: string | null;
  image_note?: string | null;
  source_name?: string | null;
  source_url?: string | null;
  last_verified?: string | null;
}

export interface FetchVerifiedExperiencesOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  destination?: string;
  searchQuery?: string;
}

export interface FetchVerifiedExperiencesResult {
  data: VerifiedExperienceRecord[];
  recommendations: RecommendationModel[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string | null;
}

// Cached active table name so we don't repeat PGRST205 check every query
let resolvedTableName: string | null = null;

/**
 * Resolves the active table name. Tries 'experince' first as specified by user.
 * Falls back to 'experience' if 'experince' is not present in PostgREST schema cache.
 */
async function getActiveTableName(): Promise<string> {
  if (resolvedTableName) return resolvedTableName;

  try {
    const { error } = await supabase.from('experince').select('experience_id').limit(1);
    if (!error) {
      resolvedTableName = 'experince';
      return 'experince';
    }
    if (error.code === 'PGRST205' || error.message?.includes('experince') || error.message?.includes('schema cache')) {
      resolvedTableName = 'experience';
      return 'experience';
    }
  } catch {
    // default fallback
  }

  resolvedTableName = 'experience';
  return 'experience';
}

/**
 * Helper to resolve actual image URLs or Supabase storage paths.
 */
export function resolveExperienceImageUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  // Already a full HTTP/HTTPS URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Absolute local public asset path
  if (trimmed.startsWith('/')) {
    return trimmed;
  }

  // Supabase Storage path (e.g. 'experiences/delhi-001.jpg' or 'images/...')
  try {
    const parts = trimmed.split('/');
    const bucket = parts.length > 1 ? parts[0] : 'experiences';
    const filePath = parts.length > 1 ? parts.slice(1).join('/') : trimmed;
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  } catch {
    // fallback
  }

  return trimmed;
}

/**
 * Maps a verified Supabase database record to the RecommendationModel interface
 * used throughout the Traveler Web components and itinerary system.
 */
export function mapRecordToRecommendation(record: VerifiedExperienceRecord): RecommendationModel {
  const imageUrl = resolveExperienceImageUrl(record.image_url);

  // Price conversion
  let price = 0;
  if (record.price_inr_clean != null) {
    price = Number(record.price_inr_clean) || 0;
  } else if (record.price_inr != null) {
    const parsed = parseFloat(String(record.price_inr).replace(/[^0-9.]/g, ''));
    price = isNaN(parsed) ? 0 : parsed;
  }

  // Duration conversion
  let durationHours = 1;
  if (record.duration_hours_clean != null) {
    durationHours = Number(record.duration_hours_clean) || 1;
  } else if (record.duration_hours != null) {
    const parsed = parseFloat(String(record.duration_hours).replace(/[^0-9.]/g, ''));
    durationHours = isNaN(parsed) ? 1 : parsed;
  }

  // Location display string
  const locationParts = [record.district, record.city, record.state].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(', ') : record.city || 'India';

  // Boolean flags
  const isHiddenGem =
    record.hidden_gem === true ||
    String(record.hidden_gem).toLowerCase() === 'yes' ||
    String(record.hidden_gem).toLowerCase() === 'true';

  const isLocalExp =
    record.local_experience === true ||
    String(record.local_experience).toLowerCase() === 'yes' ||
    String(record.local_experience).toLowerCase() === 'true';

  const isBookingReq =
    record.booking_required === 'Yes' ||
    String(record.booking_required).toLowerCase() === 'true';

  return {
    experienceId: record.experience_id,
    name: record.experience_name,
    imageUrl: imageUrl || null,
    image: imageUrl, // Full verified image URL
    category: record.category || 'General',
    subCategory: record.sub_category || null,
    location,
    city: record.city || 'Delhi',
    durationMinutes: Math.round(durationHours * 60),
    durationHours,
    price,
    priceInr: price,
    rating: record.rating != null ? Number(record.rating) : 4.5,
    reviewCount: record.review_count != null ? Number(record.review_count) : 0,
    reason: record.description || record.best_for || `Verified ${record.category} experience in ${record.city}`,
    score: 95,
    recommendationScore: 0.95,
    latitude: record.latitude != null ? Number(record.latitude) : null,
    longitude: record.longitude != null ? Number(record.longitude) : null,
    tags: record.tags || null,
    bestFor: record.best_for || null,
    localExperience: isLocalExp,
    hiddenGem: isHiddenGem,
    indoorOutdoor: record.indoor_outdoor || 'Outdoor',
    bookingRequired: isBookingReq,
  };
}

export const VerifiedExperienceService = {
  /**
   * Primary query:
   * SELECT * FROM experince WHERE image_note = 'verified exact match'
   *
   * With support for:
   * - Optional destination filter
   * - Optional category filter
   * - Optional name/search filter
   * - Pagination (page, pageSize)
   */
  async getVerifiedExperiences(
    options: FetchVerifiedExperiencesOptions = {}
  ): Promise<FetchVerifiedExperiencesResult> {
    const {
      page = 1,
      pageSize = 12,
      category,
      destination,
      searchQuery,
    } = options;

    const tableName = await getActiveTableName();

    try {
      // Build base query matching all records whose image verification is a verified exact match
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .ilike('image_note', 'verified exact match%');

      // Category filter
      if (category && category !== 'All') {
        query = query.ilike('category', `%${category}%`);
      }

      // Destination filter
      if (destination && destination.trim() !== '' && destination.toLowerCase() !== 'all') {
        const destTrimmed = destination.trim();
        query = query.or(`city.ilike.%${destTrimmed}%,district.ilike.%${destTrimmed}%,region.ilike.%${destTrimmed}%,state.ilike.%${destTrimmed}%`);
      }

      // Search query filter (by name or description)
      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.trim();
        query = query.or(`experience_name.ilike.%${q}%,description.ilike.%${q}%,tags.ilike.%${q}%`);
      }

      // Sort by rating descending or id
      query = query.order('rating', { ascending: false, nullsFirst: false });

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) {
        console.error(`[VerifiedExperienceService] Query error on ${tableName}:`, error);
        return {
          data: [],
          recommendations: [],
          totalCount: 0,
          page,
          pageSize,
          totalPages: 0,
          error: error.message,
        };
      }

      // Client-side verification guard:
      // Ensure only records whose image_note begins with 'verified exact match'
      const verifiedRecords: VerifiedExperienceRecord[] = (data || []).filter(
        (rec) =>
          rec.image_note &&
          rec.image_note.trim().toLowerCase().startsWith('verified exact match')
      );

      const recommendations = verifiedRecords.map(mapRecordToRecommendation);
      const totalCount = count ?? verifiedRecords.length;
      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        data: verifiedRecords,
        recommendations,
        totalCount,
        page,
        pageSize,
        totalPages,
        error: null,
      };
    } catch (err: any) {
      console.error('[VerifiedExperienceService] Unexpected error:', err);
      return {
        data: [],
        recommendations: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0,
        error: err?.message || 'Failed to fetch verified experiences',
      };
    }
  },

  /**
   * Fetch all distinct categories available among verified records.
   */
  async getVerifiedCategories(): Promise<string[]> {
    const tableName = await getActiveTableName();
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('category')
        .ilike('image_note', 'verified exact match%');

      if (error || !data) return [];

      const set = new Set<string>();
      data.forEach((r) => {
        if (r.category) set.add(r.category.trim());
      });
      return Array.from(set);
    } catch {
      return [];
    }
  },

  /**
   * Fetch all distinct cities/destinations available among verified records.
   */
  async getVerifiedDestinations(): Promise<string[]> {
    const tableName = await getActiveTableName();
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('city')
        .ilike('image_note', 'verified exact match%');

      if (error || !data) return [];

      const set = new Set<string>();
      data.forEach((r) => {
        if (r.city) set.add(r.city.trim());
      });
      return Array.from(set);
    } catch {
      return [];
    }
  },

  /**
   * Fetch a single experience by ID or experience_id from Supabase
   */
  async getExperienceById(id: string): Promise<{
    record: VerifiedExperienceRecord | null;
    recommendation: RecommendationModel | null;
  }> {
    if (!id || typeof id !== 'string') return { record: null, recommendation: null };

    const tableName = await getActiveTableName();
    try {
      // First try matching experience_id
      let { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('experience_id', id)
        .maybeSingle();

      // If not found and id is numeric, try matching integer id
      if (!data && !isNaN(Number(id))) {
        const numericRes = await supabase
          .from(tableName)
          .select('*')
          .eq('id', Number(id))
          .maybeSingle();
        data = numericRes.data;
      }

      if (error || !data) {
        return { record: null, recommendation: null };
      }

      const record = data as VerifiedExperienceRecord;
      const recommendation = mapRecordToRecommendation(record);
      return { record, recommendation };
    } catch (err) {
      console.error('[VerifiedExperienceService] getExperienceById error:', err);
      return { record: null, recommendation: null };
    }
  },

  /**
   * Subscribe to realtime database changes for verified experiences.
   * Enables automatic updates when records are added, updated, or removed.
   */
  subscribeToChanges(onUpdate: () => void) {
    let channel: any = null;

    getActiveTableName().then((tableName) => {
      channel = supabase
        .channel('verified-experiences-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: tableName,
          },
          () => {
            onUpdate();
          }
        )
        .subscribe();
    });

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  },
};
