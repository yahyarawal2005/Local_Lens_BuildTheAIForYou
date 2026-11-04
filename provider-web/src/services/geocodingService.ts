/**
 * Geocoding Service for LocalLens
 * Resolves place names and landmarks to precise geographic coordinates (latitude, longitude)
 * Supports Google Geocoder, OpenStreetMap Nominatim, and Instant Hotspot fallbacks.
 */

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName: string;
  source: "google" | "nominatim" | "curated";
}

// Curated landmarks for instant, fail-safe resolution in Mumbai & India
const CURATED_LANDMARKS: Record<string, { lat: number; lng: number; name: string }> = {
  "versova beach": { lat: 19.131102, lng: 72.81541, name: "Versova Beach, Andheri West, Mumbai" },
  "versova": { lat: 19.131102, lng: 72.81541, name: "Versova, Mumbai" },
  "gateway of india": { lat: 18.921984, lng: 72.834654, name: "Gateway of India, Colaba, Mumbai" },
  "colaba causeway": { lat: 18.9189, lng: 72.8277, name: "Colaba Causeway, Mumbai" },
  "marine drive": { lat: 18.9432, lng: 72.823, name: "Marine Drive Promenade, Mumbai" },
  "bandra bandstand": { lat: 19.0494, lng: 72.8197, name: "Bandra Bandstand Promenade, Mumbai" },
  "juhu beach": { lat: 19.0988, lng: 72.8264, name: "Juhu Beach, Mumbai" },
  "powai lake": { lat: 19.1278, lng: 72.9044, name: "Powai Lake, Powai, Mumbai" },
  "elephanta caves": { lat: 18.9633, lng: 72.9315, name: "Elephanta Caves, Gharapuri, Mumbai" },
  "girgaon chowpatty": { lat: 18.9543, lng: 72.8142, name: "Girgaon Chowpatty, Mumbai" },
  "sanjay gandhi national park": { lat: 19.2288, lng: 72.9182, name: "Sanjay Gandhi National Park, Borivali" },
  "crawford market": { lat: 18.9472, lng: 72.8347, name: "Mahatma Jyotiba Phule Mandai (Crawford Market)" },
  "haji ali": { lat: 18.9774, lng: 72.8105, name: "Haji Ali Dargah, Worli, Mumbai" },
  "csmt": { lat: 18.9401, lng: 72.8354, name: "Chhatrapati Shivaji Maharaj Terminus (CSMT)" },
  "victoria terminus": { lat: 18.9401, lng: 72.8354, name: "CSMT Victoria Terminus, Mumbai" },
  "sassoon dock": { lat: 18.9138, lng: 72.8261, name: "Sassoon Docks, Colaba, Mumbai" },
  "chor bazaar": { lat: 18.9602, lng: 72.8291, name: "Chor Bazaar, Kumbharwada, Mumbai" },
  "dadar flower market": { lat: 19.0183, lng: 72.8434, name: "Dadar Flower Market, Mumbai" },
  "kanheri caves": { lat: 19.2057, lng: 72.9068, name: "Kanheri Caves, Borivali, Mumbai" },
  "babulnath": { lat: 18.9568, lng: 72.8099, name: "Babulnath Mandir, Malabar Hill, Mumbai" },
};

/**
 * Searches a place by name, queries geocoding APIs, and returns coordinates
 */
export async function searchPlaceLocation(query: string): Promise<GeocodeResult | null> {
  const clean = query.trim();
  if (!clean || clean.length < 2) return null;

  const lower = clean.toLowerCase();

  // 1. Check curated landmarks for instant 0ms match
  for (const [key, value] of Object.entries(CURATED_LANDMARKS)) {
    if (lower.includes(key) || key.includes(lower)) {
      return {
        lat: Number(value.lat.toFixed(6)),
        lng: Number(value.lng.toFixed(6)),
        displayName: value.name,
        source: "curated",
      };
    }
  }

  // 2. Try Google Maps Geocoder if Google Maps JS is loaded
  if (typeof window !== "undefined" && (window as any).google?.maps?.Geocoder) {
    try {
      const geocoder = new (window as any).google.maps.Geocoder();
      const googleRes = await new Promise<any>((resolve) => {
        geocoder.geocode(
          { address: `${clean}, India` },
          (results: any[], status: string) => {
            if (status === "OK" && results && results[0]) {
              resolve(results[0]);
            } else {
              resolve(null);
            }
          }
        );
      });

      if (googleRes) {
        const lat = Number(googleRes.geometry.location.lat().toFixed(6));
        const lng = Number(googleRes.geometry.location.lng().toFixed(6));
        return {
          lat,
          lng,
          displayName: googleRes.formatted_address || clean,
          source: "google",
        };
      }
    } catch (gErr) {
      console.warn("[LocalLens] Google Geocoder attempt notice:", gErr);
    }
  }

  // 3. Fallback to OpenStreetMap Nominatim Geocoding API
  try {
    const encoded = encodeURIComponent(`${clean}, Mumbai, India`);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "LocalLens-ProviderPortal/1.0",
        },
      }
    );

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        return {
          lat: Number(parseFloat(first.lat).toFixed(6)),
          lng: Number(parseFloat(first.lon).toFixed(6)),
          displayName: first.display_name,
          source: "nominatim",
        };
      }
    }
  } catch (osmErr) {
    console.warn("[LocalLens] Nominatim geocode notice:", osmErr);
  }

  // 4. Secondary fallback: search query without city append
  try {
    const encoded = encodeURIComponent(clean);
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "LocalLens-ProviderPortal/1.0",
        },
      }
    );

    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        return {
          lat: Number(parseFloat(first.lat).toFixed(6)),
          lng: Number(parseFloat(first.lon).toFixed(6)),
          displayName: first.display_name,
          source: "nominatim",
        };
      }
    }
  } catch {}

  return null;
}
