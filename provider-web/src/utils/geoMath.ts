/**
 * Maps GPS Coordinates (latitude, longitude) centered around Mumbai / MMR
 * to 3D world coordinates [x, y, z] for our low-poly spatial terrain.
 */

// Anchor center: Gateway / South Mumbai - Navi Mumbai zone
const CENTER_LAT = 18.96;
const CENTER_LNG = 72.85;

// Scale factors for visual dispersion on the 3D terrain canvas (range ~ -8 to +8 units)
const SCALE_X = 55; // Longitude east-west
const SCALE_Z = 55; // Latitude north-south

export function coordsTo3D(lat: number, lng: number, terrainHeight = 0.4): [number, number, number] {
  const x = (lng - CENTER_LNG) * SCALE_X;
  const z = -(lat - CENTER_LAT) * SCALE_Z; // In Three.js, -Z is "North"
  return [x, terrainHeight, z];
}

export function threeDToCoords(x: number, z: number): { lat: number; lng: number } {
  const lng = Number((CENTER_LNG + x / SCALE_X).toFixed(6));
  const lat = Number((CENTER_LAT - z / SCALE_Z).toFixed(6));
  return { lat, lng };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates geographic distance (in kilometers) between two coordinates
 * using the Haversine formula.
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Panvel reference coordinates (MMR hub)
export const PANVEL_COORDS = { lat: 18.9894, lng: 73.1175 };

/**
 * Calculates distance in kilometers from given coordinate to Panvel reference point.
 */
export function calculatePanvelDistanceKm(lat: number, lng: number): number | null {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
  return calculateDistanceKm(lat, lng, PANVEL_COORDS.lat, PANVEL_COORDS.lng);
}

