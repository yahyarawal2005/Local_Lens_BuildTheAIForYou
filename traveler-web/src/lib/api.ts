// ==============================================================================
// LocalLens Web - API Client & ML Backend Integration
// Faithfully matches traveler-app's itinerary_api_service.dart
// ==============================================================================

import axios from 'axios';
import {
  RecommendationModel,
  Itinerary,
  ItineraryItem,
  SkippedExperienceItem,
  DiscoveryCanvasResponse,
  DestinationSearchResult,
  WeatherForecastModel,
  WeatherTripSummaryModel,
  SavedPlaceRecord,
} from '@/types';
import { supabase } from '@/lib/supabase';
import { KNOWN_CITY_COORDINATES } from '@/lib/geocoding';

const API_TIMEOUT = 12000;

export async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}

export const CANDIDATE_URLS = [
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8000',
];

let cachedBaseUrl: string | null = null;

export async function resolveBaseUrl(): Promise<string> {
  if (cachedBaseUrl) {
    try {
      const res = await axios.get(`${cachedBaseUrl}/health`, { timeout: 1500 });
      if (res.status === 200) return cachedBaseUrl;
    } catch {
      cachedBaseUrl = null;
    }
  }

  for (const candidate of CANDIDATE_URLS) {
    try {
      const res = await axios.get(`${candidate}/health`, { timeout: 1500 });
      if (res.status === 200) {
        cachedBaseUrl = candidate;
        return candidate;
      }
    } catch {}
  }

  const fallback = CANDIDATE_URLS[0];
  cachedBaseUrl = fallback;
  return fallback;
}

export const ApiService = {
  async fetchRecommendations(params: {
    destination: string;
    startLocation?: string;
    startLat?: number | null;
    startLon?: number | null;
    budget: number;
    durationHours: number;
    travelerCount: number;
    travelerType: string;
    interests: string[];
    preferences?: string;
    tripDate?: string;
    excludedCategories?: string[];
    topN?: number;
  }): Promise<RecommendationModel[]> {
    const activeBase = await resolveBaseUrl();
    const url = `${activeBase}/api/recommendations`;
    const payload = {
      destination: params.destination,
      start_location: params.startLocation,
      start_lat: params.startLat,
      start_lon: params.startLon,
      user_lat: params.startLat,
      user_lon: params.startLon,
      budget: params.budget,
      budget_inr: params.budget,
      duration_hours: params.durationHours,
      available_time_hours: params.durationHours,
      traveler_count: params.travelerCount,
      traveler_type: params.travelerType,
      group_type: params.travelerType,
      interests: params.interests,
      trip_date: params.tripDate,
      excluded_categories: params.excludedCategories || [],
      radius_km: 25.0,
      additional_preferences: params.preferences ? { notes: params.preferences } : {},
      top_n: params.topN || 50,
    };

    try {
      const response = await axios.post(url, payload, { timeout: API_TIMEOUT });
      const data = response.data;
      if (data?.success && Array.isArray(data.recommendations)) {
        let items: RecommendationModel[] = data.recommendations.map((item: any) => ({
          experienceId: item.experience_id || item.id || '',
          name: item.experience_name || item.name || 'Local Experience',
          imageUrl: item.image_url || item.image,
          image: item.image_url || item.image || '/assets/images/destinations/food_trail.png',
          category: item.category || 'Local Experience',
          subCategory: item.sub_category,
          location: item.location || item.city || params.destination,
          city: item.city || params.destination,
          durationMinutes: Number(item.duration_minutes) || (Number(item.duration_hours) || 1) * 60,
          durationHours: Number(item.duration_hours) || 1.0,
          price: Number(item.price_inr ?? item.price ?? 250),
          priceInr: Number(item.price_inr ?? item.price ?? 250),
          rating: Number(item.rating ?? 4.8),
          reviewCount: Number(item.review_count ?? 120),
          reason: item.reason || 'Recommended based on your preferences',
          score: Number(item.score ?? item.recommendation_score ?? 0.9),
          recommendationScore: Number(item.recommendation_score ?? item.score ?? 0.9),
          latitude: item.latitude != null ? Number(item.latitude) : null,
          longitude: item.longitude != null ? Number(item.longitude) : null,
          tags: Array.isArray(item.tags) ? item.tags.join('; ') : item.tags,
          bestFor: item.best_for,
          distanceKm: item.distance_km != null ? Number(item.distance_km) : null,
          localExperience: item.local_experience ?? true,
          hiddenGem: item.hidden_gem ?? false,
          indoorOutdoor: item.indoor_outdoor || 'Flexible',
          bookingRequired: item.booking_required ?? false,
        }));

        if (params.excludedCategories && params.excludedCategories.length > 0) {
          items = items.filter((item) => {
            const combined = `${item.category} ${item.subCategory || ''} ${item.name} ${item.tags || ''}`.toLowerCase();
            return !params.excludedCategories!.some((ex) => combined.includes(ex.toLowerCase()));
          });
        }
        return items;
      }
    } catch (e) {
      console.warn('ApiService.fetchRecommendations error:', e);
    }

    return buildFallbackRecommendations(params.destination, params.interests, params.budget, params.excludedCategories);
  },

  async smartSearch(params: {
    query: string;
    userLat?: number | null;
    userLon?: number | null;
    city?: string;
  }): Promise<{
    success: boolean;
    parsedIntent: Record<string, any>;
    recommendations: RecommendationModel[];
  }> {
    const activeBase = await resolveBaseUrl();
    const url = `${activeBase}/api/recommendations/smart-search`;
    const payload = {
      query: params.query,
      user_lat: params.userLat,
      user_lon: params.userLon,
      city: params.city,
    };

    try {
      const response = await axios.post(url, payload, { timeout: API_TIMEOUT });
      const data = response.data;
      if (data?.parsed_intent) {
        const rawRecs = data.recommendations || [];
        const recs: RecommendationModel[] = rawRecs.map((item: any) => ({
          experienceId: item.experience_id || item.id || '',
          name: item.experience_name || item.name || 'Local Experience',
          imageUrl: item.image_url || item.image,
          image: item.image_url || item.image || '/assets/images/destinations/food_trail.png',
          category: item.category || 'Local Experience',
          subCategory: item.sub_category,
          location: item.location || item.city || 'Local',
          city: item.city || 'Local',
          durationMinutes: Number(item.duration_minutes) || (Number(item.duration_hours) || 1) * 60,
          durationHours: Number(item.duration_hours) || 1.0,
          price: Number(item.price_inr ?? item.price ?? 250),
          priceInr: Number(item.price_inr ?? item.price ?? 250),
          rating: Number(item.rating ?? 4.8),
          reviewCount: Number(item.review_count ?? 120),
          reason: item.reason || 'Recommended based on your smart search',
          score: Number(item.score ?? 0.9),
          recommendationScore: Number(item.score ?? 0.9),
          latitude: item.latitude != null ? Number(item.latitude) : null,
          longitude: item.longitude != null ? Number(item.longitude) : null,
          tags: item.tags,
          bestFor: item.best_for,
          distanceKm: item.distance_km != null ? Number(item.distance_km) : null,
          localExperience: true,
          hiddenGem: false,
          indoorOutdoor: 'Flexible',
          bookingRequired: false,
        }));
        return {
          success: true,
          parsedIntent: data.parsed_intent,
          recommendations: recs,
        };
      }
    } catch (e) {
      console.warn('ApiService.smartSearch error:', e);
    }

    return {
      success: false,
      parsedIntent: {},
      recommendations: [],
    };
  },

  async generateItinerary(params: {
    destination: string;
    tripDate: string;
    startTime: string;
    durationHours: number;
    budget: number;
    startLocation?: string;
    startLat?: number | null;
    startLon?: number | null;
    selectedExperienceIds: string[];
    selectedPlacesModels?: RecommendationModel[];
    travelerCount: number;
    travelerType: string;
    weatherCondition?: string;
  }): Promise<Itinerary> {
    const activeBase = await resolveBaseUrl();
    const url = `${activeBase}/api/itinerary/generate`;
    const payload = {
      destination: params.destination,
      trip_date: params.tripDate,
      start_time: params.startTime,
      duration_hours: params.durationHours,
      available_time_hours: params.durationHours,
      budget: params.budget,
      budget_inr: params.budget,
      start_location: params.startLocation,
      start_lat: params.startLat,
      start_lon: params.startLon,
      user_lat: params.startLat,
      user_lon: params.startLon,
      selected_experience_ids: params.selectedExperienceIds,
      traveler_count: params.travelerCount,
      traveler_type: params.travelerType,
      group_type: params.travelerType,
      ...(params.weatherCondition ? { weather_condition: params.weatherCondition } : {}),
    };

    try {
      const response = await axios.post(url, payload, { timeout: API_TIMEOUT });
      const data = response.data;
      if (data?.success) {
        const rawStops = data.scheduled_experiences || [];
        const items: ItineraryItem[] = rawStops.map((s: any) => ({
          id: s.id || s.experience_id || '',
          experienceName: s.experience_name || s.name || 'Experience',
          category: s.category || 'Local Experience',
          location: s.location || '',
          description: s.description || '',
          startTime: s.startTime || s.start_time || '',
          endTime: s.endTime || s.end_time || '',
          durationMinutes: Number(s.duration_minutes ?? s.durationMinutes ?? 60),
          price: Number(s.price_inr ?? s.price ?? 0),
          distanceKm: Number(s.distance_km ?? s.distanceKm ?? 1.5),
          image: s.image_url || s.image || '/assets/images/destinations/food_trail.png',
          isCompleted: Boolean(s.isCompleted),
          isSelected: s.isSelected ?? true,
          requiresBooking: Boolean(s.requiresBooking || s.booking_required),
          rating: Number(s.rating ?? 4.8),
          iconType: s.iconType || 'experience',
          travelToNextMinutes: Number(s.travel_to_next_minutes ?? s.travelToNextMinutes ?? 0),
          travelToNextDistanceKm: Number(s.travel_to_next_distance_km ?? s.travelToNextDistanceKm ?? 0),
          latitude: s.latitude != null ? Number(s.latitude) : null,
          longitude: s.longitude != null ? Number(s.longitude) : null,
          dwellDurationMinutes: Number(s.dwellDurationMinutes ?? 0),
          arrivedWithinProximity: Boolean(s.arrivedWithinProximity),
        }));

        const rawSkipped = data.skipped_experiences || [];
        const skipped: SkippedExperienceItem[] = rawSkipped.map((sk: any) => ({
          experienceId: sk.experience_id || '',
          name: sk.name || '',
          reason: sk.reason || 'Insufficient time',
        }));

        return {
          id: `itin-${Date.now()}`,
          destination: data.destination || params.destination,
          displayAddress: params.startLocation || params.destination,
          tripDate: data.trip_date || params.tripDate,
          startTime: data.start_time || params.startTime,
          endTime: data.end_time || '05:00 PM',
          startLat: data.start_lat ?? params.startLat,
          startLon: data.start_lon ?? params.startLon,
          totalDurationMinutes: Number(data.total_duration_minutes ?? 360),
          totalEstimatedCost: Number(data.total_experience_cost ?? params.budget),
          estimatedTransportCost: Number(data.estimated_transport_cost ?? 100),
          budgetExceeded: Boolean(data.budget_exceeded),
          budgetWarning: data.budget_warning,
          items,
          skippedExperiences: skipped,
          createdAt: new Date().toISOString(),
          hasRideAttached: false,
          nugen: data.nugen,
        };
      }
    } catch (e) {
      console.warn('ApiService.generateItinerary error:', e);
    }

    return buildFallbackItinerary(params);
  },

  async optimizeItinerary(itinerary: Itinerary): Promise<Itinerary> {
    const activeBase = await resolveBaseUrl();
    const url = `${activeBase}/api/itinerary/optimize`;
    const selectedIds = itinerary.items.map((i) => i.id);

    const payload = {
      destination: itinerary.destination,
      trip_date: itinerary.tripDate,
      start_time: itinerary.startTime,
      budget: itinerary.totalEstimatedCost,
      budget_inr: itinerary.totalEstimatedCost,
      start_lat: itinerary.startLat,
      start_lon: itinerary.startLon,
      user_lat: itinerary.startLat,
      user_lon: itinerary.startLon,
      selected_experience_ids: selectedIds,
      scheduled_experiences: itinerary.items,
    };

    try {
      const response = await axios.post(url, payload, { timeout: API_TIMEOUT });
      const data = response.data;
      if (data?.success && Array.isArray(data.scheduled_experiences)) {
        const items: ItineraryItem[] = data.scheduled_experiences.map((s: any) => ({
          id: s.id || s.experience_id || '',
          experienceName: s.experience_name || s.name || '',
          category: s.category || 'Local Experience',
          location: s.location || '',
          description: s.description || '',
          startTime: s.startTime || s.start_time || '',
          endTime: s.endTime || s.end_time || '',
          durationMinutes: Number(s.duration_minutes ?? s.durationMinutes ?? 60),
          price: Number(s.price_inr ?? s.price ?? 0),
          distanceKm: Number(s.distance_km ?? s.distanceKm ?? 1.5),
          image: s.image_url || s.image || '/assets/images/destinations/food_trail.png',
          isCompleted: Boolean(s.isCompleted),
          isSelected: true,
          requiresBooking: Boolean(s.requiresBooking),
          rating: Number(s.rating ?? 4.8),
          iconType: s.iconType || 'experience',
          travelToNextMinutes: Number(s.travel_to_next_minutes ?? 0),
          travelToNextDistanceKm: Number(s.travel_to_next_distance_km ?? 0),
          latitude: s.latitude != null ? Number(s.latitude) : null,
          longitude: s.longitude != null ? Number(s.longitude) : null,
          dwellDurationMinutes: Number(s.dwellDurationMinutes ?? 0),
          arrivedWithinProximity: Boolean(s.arrivedWithinProximity),
        }));

        return {
          ...itinerary,
          items,
          startTime: data.start_time || itinerary.startTime,
          endTime: data.end_time || itinerary.endTime,
          totalDurationMinutes: Number(data.total_duration_minutes ?? itinerary.totalDurationMinutes),
          totalEstimatedCost: Number(data.total_experience_cost ?? itinerary.totalEstimatedCost),
          estimatedTransportCost: Number(data.estimated_transport_cost ?? itinerary.estimatedTransportCost),
        };
      }
    } catch (e) {
      console.warn('ApiService.optimizeItinerary error:', e);
    }

    // Local spatial TSP sort fallback
    const sorted = [...itinerary.items].sort((a, b) => a.distanceKm - b.distanceKm);
    return { ...itinerary, items: sorted };
  },

  async saveItineraryToDatabase(itinerary: Itinerary): Promise<boolean> {
    try {
      const activeBase = await resolveBaseUrl();
      const url = `${activeBase}/api/itinerary/save`;
      const authHeader = await getAuthHeader();
      await axios.post(
        url,
        {
          itinerary_id: itinerary.id,
          destination: itinerary.destination,
          trip_date: itinerary.tripDate,
          start_time: itinerary.startTime,
          end_time: itinerary.endTime,
          start_lat: itinerary.startLat,
          start_lon: itinerary.startLon,
          start_location: itinerary.displayAddress,
          total_duration_minutes: itinerary.totalDurationMinutes,
          total_cost: itinerary.totalEstimatedCost,
          total_experience_cost: itinerary.items.reduce((acc, i) => acc + (i.isSelected ? i.price : 0), 0),
          estimated_transport_cost: itinerary.estimatedTransportCost,
          scheduled_experiences: itinerary.items,
          items: itinerary.items,
        },
        { headers: authHeader, timeout: API_TIMEOUT }
      );
      return true;
    } catch {
      return true; // Graceful local fallback
    }
  },

  // ----------------------------------------------------------------------------
  // Production V1 API Extensions
  // ----------------------------------------------------------------------------

  async fetchDiscoveryCanvas(params: {
    destination: string;
    coordinates?: { lat: number; lng: number };
    tripDate?: string;
    days?: number;
    interests?: string[];
    groupType?: string;
    pace?: string;
    budget?: number;
  }): Promise<DiscoveryCanvasResponse | null> {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const response = await axios.post(
        `${activeBase}/api/v1/discovery/recommendations`,
        {
          destination: params.destination,
          coordinates: params.coordinates,
          trip_date: params.tripDate,
          days: params.days || 1,
          interests: params.interests || ['Food', 'Culture'],
          group_type: params.groupType || 'Solo',
          pace: params.pace || 'balanced',
          budget_inr: params.budget || 3000,
          top_n: 30,
        },
        { headers: authHeader, timeout: API_TIMEOUT }
      );
      return response.data;
    } catch (e) {
      console.warn('ApiService.fetchDiscoveryCanvas failed:', e);
      return null;
    }
  },

  async searchDestinations(query: string): Promise<DestinationSearchResult[]> {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/destinations/search`, {
        params: { q: query },
        timeout: 4000,
      });
      return res.data?.results || [];
    } catch (e) {
      console.warn('ApiService.searchDestinations failed:', e);
      return [];
    }
  },

  async fetchCurrentWeather(destination?: string, lat?: number, lon?: number) {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/weather/current`, {
        params: { destination, lat, lon },
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      console.warn('ApiService.fetchCurrentWeather failed:', e);
      return null;
    }
  },

  async fetchWeatherForecast(destination?: string, days = 7, lat?: number, lon?: number): Promise<WeatherForecastModel | null> {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/weather/forecast`, {
        params: { destination, days, lat, lon },
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      console.warn('ApiService.fetchWeatherForecast failed:', e);
      return null;
    }
  },

  async fetchWeatherTripSummary(destination: string, startDate?: string, days = 3): Promise<WeatherTripSummaryModel | null> {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/weather/trip-summary`, {
        params: { destination, start_date: startDate, days },
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      console.warn('ApiService.fetchWeatherTripSummary failed:', e);
      return null;
    }
  },

  async fetchUserProfile() {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.get(`${activeBase}/api/v1/profiles/me`, {
        headers: authHeader,
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      return null;
    }
  },

  async updateUserProfile(updates: Record<string, any>) {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.patch(`${activeBase}/api/v1/profiles/me`, updates, {
        headers: authHeader,
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      return null;
    }
  },

  async fetchUserPreferences() {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.get(`${activeBase}/api/v1/profiles/me/preferences`, {
        headers: authHeader,
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      return null;
    }
  },

  async updateUserPreferences(preferences: Record<string, any>) {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.put(`${activeBase}/api/v1/profiles/me/preferences`, preferences, {
        headers: authHeader,
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      return null;
    }
  },

  async fetchUserItineraries(): Promise<any[]> {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.get(`${activeBase}/api/v1/itineraries`, {
        headers: authHeader,
        timeout: 5000,
      });
      return res.data || [];
    } catch (e) {
      return [];
    }
  },

  async deleteUserItinerary(id: string): Promise<boolean> {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      await axios.delete(`${activeBase}/api/v1/itineraries/${id}`, {
        headers: authHeader,
        timeout: 5000,
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async savePlaceToWishlist(placeId: string, placeData?: any, notes?: string): Promise<boolean> {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      await axios.post(
        `${activeBase}/api/v1/saved-places`,
        { place_id: placeId, place_data: placeData || {}, notes },
        { headers: authHeader, timeout: 5000 }
      );
      return true;
    } catch (e) {
      return false;
    }
  },

  async fetchSavedPlaces(): Promise<SavedPlaceRecord[]> {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.get(`${activeBase}/api/v1/saved-places`, {
        headers: authHeader,
        timeout: 5000,
      });
      return res.data?.places || [];
    } catch (e) {
      return [];
    }
  },

  async removeSavedPlace(placeId: string): Promise<boolean> {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      await axios.delete(`${activeBase}/api/v1/saved-places/${placeId}`, {
        headers: authHeader,
        timeout: 5000,
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  async submitTripFeedback(feedback: {
    itineraryId?: string;
    placeId?: string;
    rating: number;
    feedbackType?: string;
    comments?: string;
  }): Promise<boolean> {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      await axios.post(
        `${activeBase}/api/v1/feedback`,
        {
          itinerary_id: feedback.itineraryId,
          place_id: feedback.placeId,
          rating: feedback.rating,
          feedback_type: feedback.feedbackType || 'trip',
          comments: feedback.comments,
        },
        { headers: authHeader, timeout: 5000 }
      );
      return true;
    } catch (e) {
      return false;
    }
  },

  async generateMultiDayItinerary(params: {
    destination: string;
    coordinates?: { lat: number; lng: number };
    startDate?: string;
    days?: number;
    pace?: string;
    travelerType?: string;
    interests?: string[];
    budget?: any;
    selectedPlaceIds?: string[];
  }) {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.post(
        `${activeBase}/api/v1/itineraries/generate`,
        {
          destination: params.destination,
          coordinates: params.coordinates,
          start_date: params.startDate || '2026-11-05',
          days: params.days || 1,
          pace: params.pace || 'balanced',
          traveler_type: params.travelerType || 'couple',
          interests: params.interests || ['heritage', 'food'],
          budget: params.budget,
          selected_place_ids: params.selectedPlaceIds || [],
        },
        { headers: authHeader, timeout: API_TIMEOUT }
      );
      return res.data;
    } catch (e) {
      console.warn('ApiService.generateMultiDayItinerary failed:', e);
      return null;
    }
  },

  async fetchExperiences(params?: {
    destination?: string;
    category?: string;
    minBudget?: number;
    maxBudget?: number;
    lat?: number;
    lon?: number;
    radiusKm?: number;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/experiences`, {
        params: {
          destination: params?.destination,
          category: params?.category,
          min_budget: params?.minBudget,
          max_budget: params?.maxBudget,
          lat: params?.lat,
          lon: params?.lon,
          radius_km: params?.radiusKm,
          q: params?.q,
          page: params?.page || 1,
          page_size: params?.pageSize || 50,
        },
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      console.warn('ApiService.fetchExperiences failed:', e);
      return { success: false, count: 0, total: 0, experiences: [] };
    }
  },

  async fetchExperienceById(id: string) {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/experiences/${id}`, {
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      console.warn(`ApiService.fetchExperienceById failed for ${id}:`, e);
      return null;
    }
  },

  async calculateRoute(params: {
    origin: { lat: number; lng: number; name?: string };
    destination: { lat: number; lng: number; name?: string };
    waypoints?: Array<{ lat: number; lng: number; name?: string }>;
    travelMode?: string;
  }) {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.post(
        `${activeBase}/api/v1/maps/route`,
        {
          origin: params.origin,
          destination: params.destination,
          waypoints: params.waypoints,
          travel_mode: params.travelMode || 'driving',
        },
        { timeout: 5000 }
      );
      return res.data;
    } catch (e) {
      console.warn('ApiService.calculateRoute failed:', e);
      return null;
    }
  },

  async fetchNearbyPlaces(params: { lat: number; lon: number; radiusKm?: number; category?: string; limit?: number }) {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/maps/nearby`, {
        params: {
          lat: params.lat,
          lon: params.lon,
          radius_km: params.radiusKm || 15,
          category: params.category,
          limit: params.limit || 20,
        },
        timeout: 5000,
      });
      return res.data;
    } catch (e) {
      console.warn('ApiService.fetchNearbyPlaces failed:', e);
      return null;
    }
  },

  async fetchDiscoveryCategories() {
    try {
      const activeBase = await resolveBaseUrl();
      const res = await axios.get(`${activeBase}/api/v1/discovery/categories`, {
        timeout: 4000,
      });
      return res.data?.categories || [];
    } catch (e) {
      console.warn('ApiService.fetchDiscoveryCategories failed:', e);
      return [];
    }
  },

  async regenerateItineraryDay(itineraryId: string, dayId: number) {
    try {
      const activeBase = await resolveBaseUrl();
      const authHeader = await getAuthHeader();
      const res = await axios.post(
        `${activeBase}/api/v1/itineraries/${itineraryId}/days/${dayId}/regenerate`,
        {},
        { headers: authHeader, timeout: API_TIMEOUT }
      );
      return res.data;
    } catch (e) {
      console.warn(`ApiService.regenerateItineraryDay failed for day ${dayId}:`, e);
      return null;
    }
  },
};

// ------------------------------------------------------------------------------
// Fallback Builders (Identical to Dart implementation in traveler-app)
// ------------------------------------------------------------------------------

export function buildFallbackRecommendations(
  destination: string,
  interests: string[],
  budget: number,
  excludedCategories?: string[]
): RecommendationModel[] {
  const dest = destination.trim() || 'Selected Destination';
  const destLower = dest.toLowerCase();
  const known = KNOWN_CITY_COORDINATES[destLower];
  const baseLat = known?.lat ?? 20.0;
  const baseLng = known?.lng ?? 77.0;

  const allItems: RecommendationModel[] = [
    {
      experienceId: 'EXP-BEACH-001',
      name: `${dest} Scenic Waterfront & Coastal Walk`,
      category: 'Nature',
      subCategory: 'Waterfront',
      tags: 'beach; coastal; water sports; scenic',
      location: `${dest} Waterfront`,
      city: dest,
      durationMinutes: 120,
      durationHours: 2.0,
      price: 450,
      rating: 4.8,
      reviewCount: 380,
      reason: 'Scenic outdoor walk and panoramic landscape matching your preferences',
      score: 0.95,
      image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
      latitude: baseLat + 0.012,
      longitude: baseLng - 0.008,
      localExperience: true,
      hiddenGem: false,
      indoorOutdoor: 'Outdoor',
      bookingRequired: false,
    },
    {
      experienceId: 'EXP-BEACH-002',
      name: 'Alibag Beach Sunset & Sea Breeze',
      category: 'Beach',
      subCategory: 'Beach Walk',
      tags: 'beach; sunset; coastal; sea view',
      location: `${dest} Beachfront`,
      city: dest,
      durationMinutes: 90,
      durationHours: 1.5,
      price: 200,
      rating: 4.7,
      reviewCount: 420,
      reason: 'Iconic beach walk with views of historic sea fort at low tide',
      score: 0.92,
      image: '/assets/images/destinations/beach_cafe.png',
      latitude: baseLat - 0.015,
      longitude: baseLng + 0.010,
      localExperience: true,
      hiddenGem: false,
      indoorOutdoor: 'Outdoor',
      bookingRequired: false,
    },
    {
      experienceId: 'EXP-FOOD-001',
      name: `${dest} Authentic Breakfast & Market Walk`,
      category: 'Food',
      subCategory: 'Food Walk',
      tags: 'food; breakfast; chai; street food; local cuisine',
      location: `${dest} Old Market`,
      city: dest,
      durationMinutes: 60,
      durationHours: 1.0,
      price: 250,
      rating: 4.9,
      reviewCount: 620,
      reason: 'Legendary regional breakfast spots showcasing authentic culinary traditions',
      score: 0.93,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80',
      latitude: baseLat + 0.005,
      longitude: baseLng + 0.004,
      localExperience: true,
      hiddenGem: true,
      indoorOutdoor: 'Sheltered',
      bookingRequired: false,
    },
    {
      experienceId: 'EXP-FOOD-002',
      name: `${dest} Culinary Masterclass & Tasting`,
      category: 'Food',
      subCategory: 'Culinary',
      tags: 'food; tasting; culinary; regional specialties',
      location: `${dest} Cultural Quarter`,
      city: dest,
      durationMinutes: 90,
      durationHours: 1.5,
      price: 550,
      rating: 4.9,
      reviewCount: 410,
      reason: 'Delicacies prepared by authentic local culinary masters',
      score: 0.91,
      image: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800&q=80',
      latitude: baseLat + 0.008,
      longitude: baseLng - 0.003,
      localExperience: true,
      hiddenGem: true,
      indoorOutdoor: 'Sheltered',
      bookingRequired: true,
    },
    {
      experienceId: 'EXP-ADV-001',
      name: `${dest} Outdoor Adventure & Trekking`,
      category: 'Adventure',
      subCategory: 'Adventure Tour',
      tags: 'adventure; climbing; trekking; outdoor',
      location: `${dest} Nature Reserve`,
      city: dest,
      durationMinutes: 120,
      durationHours: 2.0,
      price: 800,
      rating: 4.8,
      reviewCount: 290,
      reason: 'Thrilling outdoor experience with certified local guides',
      score: 0.9,
      image: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&q=80',
      latitude: baseLat - 0.02,
      longitude: baseLng + 0.015,
      localExperience: true,
      hiddenGem: false,
      indoorOutdoor: 'Outdoor',
      bookingRequired: true,
    },
    {
      experienceId: 'EXP-HER-001',
      name: `${dest} Heritage Landmark & Architecture`,
      category: 'Heritage',
      subCategory: 'Monuments',
      tags: 'heritage; history; architecture; monument',
      location: `${dest} Historic Center`,
      city: dest,
      durationMinutes: 90,
      durationHours: 1.5,
      price: 350,
      rating: 4.8,
      reviewCount: 450,
      reason: 'Top-rated historical landmark matching your cultural exploration interest',
      score: 0.94,
      image: 'https://images.unsplash.com/photo-1599661046289-e31897846e41?w=800&q=80',
      latitude: baseLat + 0.002,
      longitude: baseLng - 0.001,
      localExperience: true,
      hiddenGem: false,
      indoorOutdoor: 'Outdoor',
      bookingRequired: false,
    },
    {
      experienceId: 'EXP-CUL-001',
      name: `${dest} Artisan Craft & Cultural Workshop`,
      category: 'Culture',
      subCategory: 'Workshop',
      tags: 'culture; workshop; handicraft; artisan',
      location: `${dest} Art & Craft Enclave`,
      city: dest,
      durationMinutes: 75,
      durationHours: 1.25,
      price: 450,
      rating: 4.7,
      reviewCount: 280,
      reason: 'Interactive hands-on cultural workshop with master artisans',
      score: 0.89,
      image: 'https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=800&q=80',
      latitude: baseLat + 0.004,
      longitude: baseLng + 0.007,
      localExperience: true,
      hiddenGem: true,
      indoorOutdoor: 'Sheltered',
      bookingRequired: false,
    },
    {
      experienceId: 'EXP-NAT-001',
      name: `${dest} Scenic Botanical & Nature Trail`,
      category: 'Nature',
      subCategory: 'Botanical Park',
      tags: 'nature; gardens; sunset; viewpoint; scenic',
      location: `${dest} Green Belt`,
      city: dest,
      durationMinutes: 90,
      durationHours: 1.5,
      price: 200,
      rating: 4.9,
      reviewCount: 510,
      reason: 'Serene nature sanctuary with picturesque landscapes',
      score: 0.9,
      image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
      latitude: baseLat - 0.009,
      longitude: baseLng - 0.012,
      localExperience: true,
      hiddenGem: false,
      indoorOutdoor: 'Outdoor',
      bookingRequired: false,
    },
  ];

  let filtered = allItems;
  if (interests.length > 0) {
    const matches = allItems.filter((item) => {
      const combined = `${item.category} ${item.subCategory || ''} ${item.name} ${item.tags || ''}`.toLowerCase();
      return interests.some((intr) => combined.includes(intr.toLowerCase()));
    });
    if (matches.length > 0) filtered = matches;
  }

  if (excludedCategories && excludedCategories.length > 0) {
    filtered = filtered.filter((item) => {
      const combined = `${item.category} ${item.subCategory || ''} ${item.name} ${item.tags || ''}`.toLowerCase();
      return !excludedCategories.some((ex) => combined.includes(ex.toLowerCase()));
    });
  }

  return filtered;
}

export function buildFallbackItinerary(params: {
  destination: string;
  tripDate: string;
  startTime: string;
  durationHours: number;
  budget: number;
  startLat?: number | null;
  startLon?: number | null;
  selectedExperienceIds: string[];
  selectedPlacesModels?: RecommendationModel[];
}): Itinerary {
  let itemsToUse: RecommendationModel[] = [];

  if (params.selectedPlacesModels && params.selectedPlacesModels.length > 0) {
    itemsToUse = params.selectedPlacesModels;
  } else {
    const recs = buildFallbackRecommendations(params.destination, [], params.budget);
    const chosen = recs.filter((r) => params.selectedExperienceIds.includes(r.experienceId));
    itemsToUse = chosen.length > 0 ? chosen : recs.slice(0, 4);
  }

  let curHour = 10;
  let curMin = 30;
  const parts = params.startTime.replace(/[^\d:]/g, '').split(':');
  if (parts.length > 0) {
    curHour = parseInt(parts[0], 10) || 10;
    if (params.startTime.toUpperCase().includes('PM') && curHour < 12) curHour += 12;
    if (params.startTime.toUpperCase().includes('AM') && curHour === 12) curHour = 0;
    if (parts.length > 1) curMin = parseInt(parts[1], 10) || 30;
  }

  const items: ItineraryItem[] = [];
  let totalCost = 0;
  let totalMins = 0;
  const maxAllowedMins = Math.round(params.durationHours > 0 ? params.durationHours * 60 : 300);

  for (let i = 0; i < itemsToUse.length; i++) {
    const r = itemsToUse[i];
    const transitMins = items.length > 0 ? 15 : 0;
    if (items.length > 0 && totalMins + transitMins + r.durationMinutes > maxAllowedMins) {
      break;
    }

    const startStr = formatTime(curHour, curMin);
    curMin += r.durationMinutes;
    curHour += Math.floor(curMin / 60);
    curMin = curMin % 60;
    const endStr = formatTime(curHour, curMin);

    curMin += 15;
    curHour += Math.floor(curMin / 60);
    curMin = curMin % 60;

    const destLower = (params.destination || '').trim().toLowerCase();
    const known = KNOWN_CITY_COORDINATES[destLower];
    const baseLat = params.startLat ?? known?.lat ?? 20.0;
    const baseLng = params.startLon ?? known?.lng ?? 77.0;

    items.push({
      id: r.experienceId,
      experienceName: r.name,
      category: r.category,
      location: r.location,
      description: r.reason,
      startTime: startStr,
      endTime: endStr,
      durationMinutes: r.durationMinutes,
      price: r.price,
      distanceKm: 2.5,
      image: r.image,
      isCompleted: false,
      isSelected: true,
      requiresBooking: r.bookingRequired,
      rating: r.rating ?? 4.8,
      iconType: 'experience',
      travelToNextMinutes: i < itemsToUse.length - 1 ? 15 : 0,
      travelToNextDistanceKm: i < itemsToUse.length - 1 ? 2.5 : 0.0,
      latitude: r.latitude ?? baseLat,
      longitude: r.longitude ?? baseLng,
      dwellDurationMinutes: 0,
      arrivedWithinProximity: false,
    });

    totalCost += r.price;
    totalMins += r.durationMinutes + transitMins;
  }

  const destLower = (params.destination || '').trim().toLowerCase();
  const known = KNOWN_CITY_COORDINATES[destLower];
  const destName = params.destination?.trim() || 'Selected Destination';

  return {
    id: `itin-${Date.now()}`,
    destination: destName,
    displayAddress: destName,
    tripDate: params.tripDate,
    startTime: params.startTime,
    endTime: items.length > 0 ? items[items.length - 1].endTime : '05:00 PM',
    startLat: params.startLat ?? known?.lat ?? 20.0,
    startLon: params.startLon ?? known?.lng ?? 77.0,
    totalDurationMinutes: totalMins,
    totalEstimatedCost: totalCost,
    estimatedTransportCost: 120.0,
    budgetExceeded: false,
    items,
    skippedExperiences: [],
    createdAt: new Date().toISOString(),
    hasRideAttached: false,
  };
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${period}`;
}
