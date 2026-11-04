// ==============================================================================
// LocalLens Traveler Web - Domain Models & Type Definitions
// Faithfully translated from traveler-app Dart models with strict typing
// ==============================================================================

export type UserRole = 'traveler' | 'provider' | 'rider' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  role: UserRole;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

export interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  errorMessage: string | null;
}

// ------------------------------------------------------------------------------
// Experiences & Recommendations
// ------------------------------------------------------------------------------

export type ExperienceCategoryType =
  | 'Food'
  | 'Culture'
  | 'Adventure'
  | 'Nature'
  | 'Heritage'
  | 'Beach'
  | 'Shopping'
  | 'Nightlife'
  | 'Photography'
  | 'Wellness'
  | 'Hidden Gems'
  | 'Local Experiences';

export interface RecommendationModel {
  experienceId: string;
  name: string;
  imageUrl?: string | null;
  image: string;
  category: string;
  subCategory?: string | null;
  location: string;
  city: string;
  durationMinutes: number;
  durationHours: number;
  price: number;
  priceInr?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  reason: string;
  score: number;
  recommendationScore?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  tags?: string | null;
  bestFor?: string | null;
  distanceKm?: number | null;
  localExperience: boolean;
  hiddenGem: boolean;
  indoorOutdoor: string;
  bookingRequired: boolean;
}

// ------------------------------------------------------------------------------
// Itinerary
// ------------------------------------------------------------------------------

export interface ItineraryItem {
  id: string;
  experienceName: string;
  category: string;
  location: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  price: number;
  distanceKm: number;
  image: string;
  isCompleted: boolean;
  isSelected: boolean;
  requiresBooking: boolean;
  rating: number;
  iconType: string;
  travelToNextMinutes: number;
  travelToNextDistanceKm: number;
  latitude?: number | null;
  longitude?: number | null;
  actualExpense?: number | null;
  travelerRating?: number | null;
  travelerReview?: string | null;
  completedAt?: string | null;
  dwellDurationMinutes: number;
  arrivedWithinProximity: boolean;
  timeWindow?: string;
}

export interface SkippedExperienceItem {
  experienceId: string;
  name: string;
  reason: string;
}

export interface NugenEnhancementData {
  enabled: boolean;
  status: string;
  validation: Record<string, any>;
  issues: Array<Record<string, any>>;
  enhancements: Array<Record<string, any>>;
  personalizedTips: Array<Record<string, any>>;
  finalRecommendations: Array<Record<string, any>>;
  weather?: Record<string, any> | null;
  liveWeather?: Record<string, any> | null;
}

export interface Itinerary {
  id: string;
  destination: string;
  displayAddress: string;
  tripDate: string;
  startTime: string;
  endTime: string;
  startLat?: number | null;
  startLon?: number | null;
  totalDurationMinutes: number;
  totalEstimatedCost: number;
  estimatedTransportCost: number;
  items: ItineraryItem[];
  skippedExperiences: SkippedExperienceItem[];
  budgetExceeded: boolean;
  budgetWarning?: string | null;
  createdAt: string;
  hasRideAttached: boolean;
  attachedRideId?: string | null;
  nugen?: NugenEnhancementData | null;
}

// ------------------------------------------------------------------------------
// Lens Rides & Transportation
// ------------------------------------------------------------------------------

export type RideStatus =
  | 'idle'
  | 'vehicleSelected'
  | 'requesting'
  | 'searching'
  | 'accepted'
  | 'riderArriving'
  | 'arrived'
  | 'started'
  | 'inProgress'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type VehicleTypeId = 'sedan' | 'hatchback' | 'suv' | 'auto' | 'bike';

export interface VehicleOption {
  type: VehicleTypeId;
  name: string;
  estimatedFare: number;
  etaMinutes: number;
  capacity: string;
  perKmRate: number;
}

export interface Rider {
  id: string;
  name: string;
  rating: number;
  vehicleType: string;
  vehicleNumber: string;
  profileImage: string;
  phone: string;
  latitude: number;
  longitude: number;
}

export interface RideRequest {
  id: string;
  travelerId: string;
  pickup: string;
  drop: string;
  vehicle: VehicleOption;
  estimatedFare: number;
  status: RideStatus;
  rider?: Rider | null;
  createdAt: string;
}

export interface RideState {
  status: RideStatus;
  otp: string;
  selectedVehicle: VehicleOption;
  currentRequest: RideRequest | null;
  activeRider: Rider | null;
  routeProgress: number; // 0.0 to 1.0
  etaMinutes: number;
  etaText: string;
  pickupLocation: string;
  dropLocation: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  riderLat: number;
  riderLng: number;
  errorMessage?: string | null;
}

// ------------------------------------------------------------------------------
// Sponsored Experiences & Ads
// ------------------------------------------------------------------------------

export interface SponsoredExperience {
  id: string;
  campaignId: string;
  title: string;
  category: string;
  tagline: string;
  description: string;
  imageUrl: string;
  rating: number;
  priceInr: number;
  originalPriceInr?: number | null;
  badgeText: string;
  location: string;
  ctaText: string;
  deeplink: string;
}

// ------------------------------------------------------------------------------
// Groq Saathi AI Optimization
// ------------------------------------------------------------------------------

export interface GroqOptimizationResult {
  reply: string;
  isInfoQuery: boolean;
  removeInterests: string[];
  addInterests: string[];
  customNotes?: string | null;
  updatedBudget?: number | null;
  updatedDurationHours?: number | null;
  shouldRegenerate: boolean;
  isRouteReorderOnly: boolean;
  hasInterestChanges?: boolean;
}

// ------------------------------------------------------------------------------
// V1 Architecture Types & Discovery Canvas
// ------------------------------------------------------------------------------

export interface DestinationSearchResult {
  name: string;
  normalized_name?: string;
  display_name?: string;
  city: string;
  state?: string | null;
  country: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  confidence: number;
  source: string;
}

export interface CanonicalDestination {
  name: string;
  normalizedName: string;
  displayName: string;
  city: string;
  state?: string | null;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source?: string;
  confidence?: number;
}

export interface WeatherForecastModel {
  destination: string;
  coordinates: { lat: number; lng: number };
  status: string;
  forecastAvailable: boolean;
  timezone: string;
  daily: Array<{
    date: string;
    condition: string;
    tempMinC: number;
    tempMaxC: number;
    averageTempC: number;
    precipitationSumMm: number;
    rainProbabilityPct: number;
    windSpeedKmh: number;
    uvIndex?: number | null;
    suitabilityScore: number;
    suitabilityReason: string;
  }>;
}

export interface WeatherTripSummaryModel {
  destination: string;
  coordinates: { lat: number; lng: number };
  startDate: string;
  daysCount: number;
  overallCondition: string;
  averageTempC: number;
  outdoorSuitability: string;
  forecastAvailable: boolean;
  weatherAdvice: string;
  dailySummaries: any[];
}

export interface DiscoveryPlaceItem {
  placeId: string;
  name: string;
  category: string;
  subCategory?: string | null;
  description?: string | null;
  coordinates: { lat: number; lng: number };
  address?: string | null;
  city?: string | null;
  openingHours?: string | null;
  estimatedVisitDurationMinutes: number;
  priceInr: number;
  rating?: number | null;
  reviewCount?: number | null;
  imageUrl?: string | null;
  weatherSuitability: string;
  weatherRationale?: string | null;
  recommendationScore: number;
  matchReasons: string[];
  isIndoor: boolean;
  isHiddenGem: boolean;
}

export interface DiscoveryCategorySection {
  categoryId: string;
  title: string;
  places: DiscoveryPlaceItem[];
}

export interface DiscoveryCanvasResponse {
  success: boolean;
  destination: string;
  coordinates: { lat: number; lng: number };
  weatherContext: Record<string, any>;
  totalCandidates: number;
  categories: DiscoveryCategorySection[];
  allPlaces: DiscoveryPlaceItem[];
}

export interface SavedPlaceRecord {
  id: string;
  userId: string;
  placeId: string;
  placeData: Record<string, any>;
  notes?: string | null;
  createdAt?: string | null;
}

