// ==============================================================================
// LocalLens Web - Centralized Geocoding & Destination Service
// Provides canonical destination resolution, forward search & reverse geocoding
// ==============================================================================

import { CanonicalDestination } from '@/types';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export const KNOWN_CITY_COORDINATES: Record<string, { lat: number; lng: number; state?: string; country?: string }> = {
  mumbai: { lat: 19.0760, lng: 72.8777, state: 'Maharashtra', country: 'India' },
  'south mumbai': { lat: 18.9220, lng: 72.8347, state: 'Maharashtra', country: 'India' },
  'navi mumbai': { lat: 19.0330, lng: 73.0297, state: 'Maharashtra', country: 'India' },
  thane: { lat: 19.2183, lng: 72.9781, state: 'Maharashtra', country: 'India' },
  pune: { lat: 18.5204, lng: 73.8567, state: 'Maharashtra', country: 'India' },
  nashik: { lat: 19.9975, lng: 73.7898, state: 'Maharashtra', country: 'India' },
  delhi: { lat: 28.6139, lng: 77.2090, state: 'Delhi', country: 'India' },
  'new delhi': { lat: 28.6139, lng: 77.2090, state: 'Delhi', country: 'India' },
  jaipur: { lat: 26.9124, lng: 75.7873, state: 'Rajasthan', country: 'India' },
  udaipur: { lat: 24.5854, lng: 73.7125, state: 'Rajasthan', country: 'India' },
  jodhpur: { lat: 26.2389, lng: 73.0243, state: 'Rajasthan', country: 'India' },
  jaisalmer: { lat: 26.9157, lng: 70.9083, state: 'Rajasthan', country: 'India' },
  goa: { lat: 15.2993, lng: 74.1240, state: 'Goa', country: 'India' },
  'north goa': { lat: 15.4909, lng: 73.8278, state: 'Goa', country: 'India' },
  'south goa': { lat: 15.2736, lng: 73.9582, state: 'Goa', country: 'India' },
  panaji: { lat: 15.4909, lng: 73.8278, state: 'Goa', country: 'India' },
  calangute: { lat: 15.5439, lng: 73.7553, state: 'Goa', country: 'India' },
  bangalore: { lat: 12.9716, lng: 77.5946, state: 'Karnataka', country: 'India' },
  bengaluru: { lat: 12.9716, lng: 77.5946, state: 'Karnataka', country: 'India' },
  hyderabad: { lat: 17.3850, lng: 78.4867, state: 'Telangana', country: 'India' },
  kolkata: { lat: 22.5726, lng: 88.3639, state: 'West Bengal', country: 'India' },
  chennai: { lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu', country: 'India' },
  ahmedabad: { lat: 23.0225, lng: 72.5714, state: 'Gujarat', country: 'India' },
  agra: { lat: 27.1767, lng: 78.0081, state: 'Uttar Pradesh', country: 'India' },
  varanasi: { lat: 25.3176, lng: 82.9739, state: 'Uttar Pradesh', country: 'India' },
  kochi: { lat: 9.9312, lng: 76.2673, state: 'Kerala', country: 'India' },
  munnar: { lat: 10.0889, lng: 77.0595, state: 'Kerala', country: 'India' },
  alleppey: { lat: 9.4981, lng: 76.3388, state: 'Kerala', country: 'India' },
  shimla: { lat: 31.1048, lng: 77.1734, state: 'Himachal Pradesh', country: 'India' },
  manali: { lat: 32.2432, lng: 77.1892, state: 'Himachal Pradesh', country: 'India' },
  rishikesh: { lat: 30.0869, lng: 78.2676, state: 'Uttarakhand', country: 'India' },
  lonavala: { lat: 18.7557, lng: 73.4091, state: 'Maharashtra', country: 'India' },
  alibaug: { lat: 18.6414, lng: 72.8722, state: 'Maharashtra', country: 'India' },
  panvel: { lat: 18.9894, lng: 73.1175, state: 'Maharashtra', country: 'India' },
};

export const CITY_COORDINATES: Record<string, GeoPoint> = Object.fromEntries(
  Object.entries(KNOWN_CITY_COORDINATES).map(([k, v]) => [k, { latitude: v.lat, longitude: v.lng }])
);

// LRU in-memory query and reverse geocoding caches
const searchCache = new Map<string, CanonicalDestination[]>();
const reverseCache = new Map<string, CanonicalDestination>();

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
}

function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

export const GeocodingService = {
  /**
   * Search for destinations matching user input string.
   * Leverages backend /api/v1/destinations/search first, then OpenStreetMap Nominatim.
   * Returns empty array if no valid results found. Never substitutes a default city.
   */
  async searchDestinations(query: string): Promise<CanonicalDestination[]> {
    const clean = query.trim();
    if (!clean || clean.length < 2) return [];

    const cacheKey = clean.toLowerCase();
    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey)!;
    }

    const results: CanonicalDestination[] = [];
    const seenCoordKeys = new Set<string>();

    // 1. Try Backend API endpoint
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/destinations/search?q=${encodeURIComponent(clean)}`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.results) && data.results.length > 0) {
          for (const item of data.results) {
            const lat = Number(item.coordinates?.lat);
            const lng = Number(item.coordinates?.lng);
            if (isValidCoordinate(lat, lng)) {
              const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
              if (!seenCoordKeys.has(coordKey)) {
                seenCoordKeys.add(coordKey);
                results.push({
                  name: item.name || clean,
                  normalizedName: item.normalized_name || clean,
                  displayName: item.display_name || item.name || clean,
                  city: item.city || clean,
                  state: item.state || null,
                  country: item.country || 'India',
                  latitude: lat,
                  longitude: lng,
                  timezone: item.timezone || 'Asia/Kolkata',
                  source: 'backend_geocoder',
                  confidence: item.confidence || 0.9,
                });
              }
            }
          }
        }
      }
    } catch {
      // Backend request failed or offline; continue to fallback providers
    }

    // 2. Exact or partial match from known canonical destinations dictionary
    for (const [key, data] of Object.entries(KNOWN_CITY_COORDINATES)) {
      if (key === cacheKey || key.includes(cacheKey) || cacheKey.includes(key)) {
        const cityName = key.charAt(0).toUpperCase() + key.slice(1);
        const coordKey = `${data.lat.toFixed(3)},${data.lng.toFixed(3)}`;
        if (!seenCoordKeys.has(coordKey)) {
          seenCoordKeys.add(coordKey);
          results.push({
            name: cityName,
            normalizedName: cityName,
            displayName: `${cityName}, ${data.state ? data.state + ', ' : ''}${data.country || 'India'}`,
            city: cityName,
            state: data.state || null,
            country: data.country || 'India',
            latitude: data.lat,
            longitude: data.lng,
            timezone: 'Asia/Kolkata',
            source: 'canonical_index',
            confidence: 0.98,
          });
        }
      }
    }

    // 3. Fallback directly to OpenStreetMap Nominatim
    if (results.length === 0) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(clean)}&format=json&addressdetails=1&limit=5`,
          { headers: { 'User-Agent': 'LocalLensWeb/1.0 (contact@locallens.app)' } }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            for (const item of data) {
              const lat = parseFloat(item.lat);
              const lng = parseFloat(item.lon);
              if (isValidCoordinate(lat, lng)) {
                const coordKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
                if (!seenCoordKeys.has(coordKey)) {
                  seenCoordKeys.add(coordKey);
                  const addr = item.address || {};
                  const city =
                    addr.city || addr.town || addr.village || addr.municipality || addr.state_district || clean;
                  results.push({
                    name: item.name || city,
                    normalizedName: city,
                    displayName: item.display_name,
                    city,
                    state: addr.state || null,
                    country: addr.country || 'India',
                    latitude: lat,
                    longitude: lng,
                    timezone: 'Asia/Kolkata',
                    source: 'nominatim',
                    confidence: parseFloat(item.importance) || 0.8,
                  });
                }
              }
            }
          }
        }
      } catch {
        // Network error
      }
    }

    searchCache.set(cacheKey, results);
    return results;
  },

  /**
   * Synchronously resolve coordinates from known dictionary if available.
   * Returns null if unmapped, rather than defaulting to Mumbai.
   */
  resolveCoordinatesForCity(cityName: string): GeoPoint | null {
    const clean = cityName.trim().toLowerCase();
    if (!clean) return null;

    if (KNOWN_CITY_COORDINATES[clean]) {
      const match = KNOWN_CITY_COORDINATES[clean];
      return { latitude: match.lat, longitude: match.lng };
    }

    for (const [key, value] of Object.entries(KNOWN_CITY_COORDINATES)) {
      if (clean === key || clean.startsWith(key + ' ') || clean.includes(key) || key.includes(clean)) {
        return { latitude: value.lat, longitude: value.lng };
      }
    }

    return null;
  },

  /**
   * Asynchronously resolve a canonical destination object for a city string.
   */
  async resolveDestination(destinationName: string): Promise<CanonicalDestination | null> {
    const results = await this.searchDestinations(destinationName);
    return results.length > 0 ? results[0] : null;
  },

  /**
   * Reverse geocodes coordinates to a canonical destination.
   */
  async reverseGeocode(lat: number, lon: number): Promise<CanonicalDestination | null> {
    if (!isValidCoordinate(lat, lon)) return null;

    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (reverseCache.has(key)) return reverseCache.get(key)!;

    // Fast check for known city proximity (< 15 km)
    for (const [cityKey, val] of Object.entries(KNOWN_CITY_COORDINATES)) {
      const dLat = Math.abs(val.lat - lat);
      const dLon = Math.abs(val.lng - lon);
      if (dLat < 0.15 && dLon < 0.15) {
        const cityName = cityKey.charAt(0).toUpperCase() + cityKey.slice(1);
        const canon: CanonicalDestination = {
          name: cityName,
          normalizedName: cityName,
          displayName: `${cityName}, ${val.state ? val.state + ', ' : ''}${val.country || 'India'}`,
          city: cityName,
          state: val.state || null,
          country: val.country || 'India',
          latitude: lat,
          longitude: lon,
          timezone: 'Asia/Kolkata',
          source: 'canonical_index',
        };
        reverseCache.set(key, canon);
        return canon;
      }
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
        { headers: { 'User-Agent': 'LocalLensWeb/1.0 (contact@locallens.app)' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const city = addr.city || addr.town || addr.village || addr.county || 'Local Area';
        const area = addr.suburb || addr.neighbourhood || addr.quarter;
        const name = area ? `${area}, ${city}` : city;
        const canon: CanonicalDestination = {
          name,
          normalizedName: city,
          displayName: data.display_name || name,
          city,
          state: addr.state || null,
          country: addr.country || 'India',
          latitude: lat,
          longitude: lon,
          timezone: 'Asia/Kolkata',
          source: 'nominatim',
        };
        reverseCache.set(key, canon);
        return canon;
      }
    } catch {}

    return null;
  },

  /**
   * Backwards compatible getLocationName helper.
   */
  async getLocationName(lat: number, lon: number, fallback = 'Local Area'): Promise<string> {
    const canon = await this.reverseGeocode(lat, lon);
    return canon?.name || fallback;
  },
};
