'use client';

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { RecommendationModel, Itinerary, ItineraryItem, CanonicalDestination } from '@/types';
import { ApiService } from '@/lib/api';
import { GeocodingService } from '@/lib/geocoding';
import { StorageService } from '@/lib/storage';
import { useTheme } from '@/context/ThemeContext';

interface ItineraryContextType {
  locationMode: 'destination' | 'exact';
  destination: string;
  displayAddress: string;
  latitude: number;
  longitude: number;
  canonicalDestination: CanonicalDestination | null;
  isDestinationResolved: boolean;
  availableTime: string;
  availableTimeUnit: 'Hours' | 'Days';
  availableTimeMinutes: number;
  totalBudgetInr: number;
  travelerCount: number;
  groupType: 'Solo' | 'Couple' | 'Friends' | 'Family';
  desiredExperienceCount: number;
  interests: string[];
  excludedCategories: string[];
  preferences: string;
  tripDate: string;
  tripStartTime: string;
  recommendations: RecommendationModel[];
  selectedPlaces: RecommendationModel[];
  selectedExperienceIds: string[];
  generatedItinerary: Itinerary | null;
  savedTrips: Itinerary[];
  wishlist: string[];
  isGenerating: boolean;
  activeWeatherCondition: string;

  // Actions
  setLocationMode: (mode: 'destination' | 'exact') => void;
  setDestination: (dest: string) => Promise<void>;
  setCanonicalDestination: (dest: CanonicalDestination) => void;
  setExactLocation: (lat: number, lon: number, address: string) => void;
  setTime: (value: string, unit: 'Hours' | 'Days') => void;
  setBudget: (budget: number) => void;
  setGroup: (group: 'Solo' | 'Couple' | 'Friends' | 'Family', count: number) => void;
  setTravelerCount: (count: number) => void;
  setDesiredExperienceCount: (count: number) => void;
  toggleInterest: (interest: string) => void;
  setInterests: (interests: string[]) => void;
  setPreferences: (pref: string) => void;
  setTripDate: (date: string) => void;
  setTripStartTime: (time: string) => void;
  toggleExperienceSelection: (id: string) => void;
  setSelectedPlaces: (places: RecommendationModel[]) => void;
  selectAllRecommendations: () => void;
  fetchRecommendations: () => Promise<RecommendationModel[]>;
  generateFinalItinerary: (weatherOverride?: string) => Promise<Itinerary>;
  optimizeCurrentItinerary: () => Promise<Itinerary | null>;
  saveCurrentItinerary: () => Promise<boolean>;
  applyOptimizationChanges: (params: {
    removeInterests?: string[];
    addInterests?: string[];
    customNotes?: string | null;
    budget?: number | null;
    durationHours?: number | null;
  }) => void;
  applySmartSearchResult: (parsedIntent: Record<string, any>, recs: RecommendationModel[]) => void;
  updateExperienceExpense: (itemId: string, expense: number) => void;
  completeExperience: (itemId: string, rating?: number, review?: string, expense?: number) => void;
  deleteTrip: (id: string) => void;
  toggleWishlist: (id: string) => void;
  setWeatherCondition: (cond: string) => void;
  resetForNewTrip: () => void;
  setActiveItinerary: (itin: Itinerary) => void;
}

const ItineraryContext = createContext<ItineraryContextType | undefined>(undefined);

export function ItineraryProvider({ children }: { children: ReactNode }) {
  const { updateWeatherForLocation } = useTheme();

  const [locationMode, setLocationMode] = useState<'destination' | 'exact'>('destination');
  const [destination, setDestinationState] = useState('');
  const [displayAddress, setDisplayAddress] = useState('');
  const [latitude, setLatitude] = useState(0);
  const [longitude, setLongitude] = useState(0);
  const [canonicalDestination, setCanonicalDestinationState] = useState<CanonicalDestination | null>(null);
  const [isDestinationResolved, setIsDestinationResolved] = useState(false);

  const [availableTime, setAvailableTime] = useState('6');
  const [availableTimeUnit, setAvailableTimeUnit] = useState<'Hours' | 'Days'>('Hours');
  const [availableTimeMinutes, setAvailableTimeMinutes] = useState(360);
  const [totalBudgetInr, setBudgetState] = useState(3000);
  const [travelerCount, setTravelerCountState] = useState(2);
  const [groupType, setGroupType] = useState<'Solo' | 'Couple' | 'Friends' | 'Family'>('Couple');
  const [desiredExperienceCount, setDesiredExperienceCount] = useState(4);

  const [interests, setInterests] = useState<string[]>(['Food', 'Culture', 'Local Experiences']);
  const [excludedCategories, setExcludedCategories] = useState<string[]>([]);
  const [preferences, setPreferences] = useState('');

  const [tripDate, setTripDateState] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [tripStartTime, setTripStartTime] = useState('10:30 AM');

  const [recommendations, setRecommendations] = useState<RecommendationModel[]>([]);
  // Keep a ref in sync so callbacks always read the latest recommendations
  // without stale-closure bugs (critical for toggleExperienceSelection and generation).
  const recommendationsRef = useRef<RecommendationModel[]>([]);
  const [selectedPlaces, setSelectedPlacesState] = useState<RecommendationModel[]>([]);
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<string[]>([]);

  const [generatedItinerary, setGeneratedItinerary] = useState<Itinerary | null>(null);
  const [savedTrips, setSavedTrips] = useState<Itinerary[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeWeatherCondition, setActiveWeatherCondition] = useState('Live');

  useEffect(() => {
    const trips = StorageService.getSavedTrips();
    setSavedTrips(trips);
    if (trips.length > 0 && !generatedItinerary) {
      const lastTrip = trips[0];
      setGeneratedItinerary(lastTrip);
      if (lastTrip.destination) {
        setDestinationState(lastTrip.destination);
        setDisplayAddress(lastTrip.displayAddress || lastTrip.destination);
        if (lastTrip.startLat && lastTrip.startLon) {
          setLatitude(lastTrip.startLat);
          setLongitude(lastTrip.startLon);
          setIsDestinationResolved(true);
          updateWeatherForLocation(lastTrip.startLat, lastTrip.startLon, lastTrip.destination);
        }
      }
    }
    const wish = StorageService.getSavedWishlist();
    setWishlist(wish);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setCanonicalDestination(dest: CanonicalDestination) {
    // Invalidate destination-dependent cached data
    updateRecommendations([]);
    setSelectedPlacesState([]);
    setSelectedExperienceIds([]);
    setGeneratedItinerary(null);

    setCanonicalDestinationState(dest);
    setDestinationState(dest.name);
    setDisplayAddress(dest.displayName || dest.name);
    setLatitude(dest.latitude);
    setLongitude(dest.longitude);
    setLocationMode('destination');
    setIsDestinationResolved(true);

    // Sync live weather for this destination
    updateWeatherForLocation(dest.latitude, dest.longitude, dest.name);
  }

  async function setDestination(dest: string) {
    const clean = dest.trim();
    if (!clean) {
      setDestinationState('');
      setDisplayAddress('');
      setLatitude(0);
      setLongitude(0);
      setCanonicalDestinationState(null);
      setIsDestinationResolved(false);
      updateRecommendations([]);
      setSelectedPlacesState([]);
      setSelectedExperienceIds([]);
      setGeneratedItinerary(null);
      return;
    }

    setDestinationState(clean);
    setDisplayAddress(clean);
    setLocationMode('destination');

    // Invalidate destination-dependent data
    updateRecommendations([]);
    setSelectedPlacesState([]);
    setSelectedExperienceIds([]);
    setGeneratedItinerary(null);

    try {
      const canonical = await GeocodingService.resolveDestination(clean);
      if (canonical) {
        setCanonicalDestinationState(canonical);
        setLatitude(canonical.latitude);
        setLongitude(canonical.longitude);
        setDisplayAddress(canonical.displayName || canonical.name);
        setIsDestinationResolved(true);
        updateWeatherForLocation(canonical.latitude, canonical.longitude, canonical.name);
        return;
      }
    } catch {}

    const coords = GeocodingService.resolveCoordinatesForCity(clean);
    if (coords) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      setIsDestinationResolved(true);
      updateWeatherForLocation(coords.latitude, coords.longitude, clean);
    } else {
      setIsDestinationResolved(false);
    }
  }

  function setExactLocation(lat: number, lon: number, addr: string) {
    setLatitude(lat);
    setLongitude(lon);
    setDisplayAddress(addr);
    setLocationMode('exact');
    setIsDestinationResolved(true);
    updateRecommendations([]);
    setSelectedPlacesState([]);
    setSelectedExperienceIds([]);
    setGeneratedItinerary(null);
    updateWeatherForLocation(lat, lon, addr);
  }

  function setTripDate(date: string) {
    setTripDateState(date);
    if (latitude && longitude) {
      updateWeatherForLocation(latitude, longitude, destination);
    }
  }

  function setTime(value: string, unit: 'Hours' | 'Days') {
    const parsed = parseInt(value, 10) || 6;
    const mins = unit === 'Days' ? parsed * 1440 : parsed * 60;
    setAvailableTime(value);
    setAvailableTimeUnit(unit);
    setAvailableTimeMinutes(mins);
  }

  function setBudget(b: number) {
    setBudgetState(Math.max(100, b));
  }

  function setGroup(g: 'Solo' | 'Couple' | 'Friends' | 'Family', count: number) {
    setGroupType(g);
    setTravelerCountState(count);
  }

  function setTravelerCount(count: number) {
    const clamped = Math.max(1, Math.min(20, count));
    let detected: 'Solo' | 'Couple' | 'Friends' | 'Family' = groupType;
    if (clamped === 1) detected = 'Solo';
    else if (clamped === 2) detected = 'Couple';
    else if (clamped <= 5) detected = 'Friends';
    else detected = 'Family';

    setTravelerCountState(clamped);
    setGroupType(detected);
  }

  function toggleInterest(intr: string) {
    setInterests((prev) =>
      prev.includes(intr) ? prev.filter((i) => i !== intr) : [...prev, intr]
    );
  }

  /** Always update the ref alongside state so callbacks never see a stale pool. */
  function updateRecommendations(recs: RecommendationModel[]) {
    recommendationsRef.current = recs;
    setRecommendations(recs);
  }

  function toggleExperienceSelection(id: string) {
    setSelectedExperienceIds((prev) => {
      const isSelected = prev.includes(id);
      const next = isSelected ? prev.filter((x) => x !== id) : [...prev, id];
      // Use the ref so we always filter from the current recommendations pool,
      // not from a stale closure captured when this function was last re-created.
      setSelectedPlacesState(recommendationsRef.current.filter((r) => next.includes(r.experienceId)));
      return next;
    });
  }

  function setSelectedPlaces(places: RecommendationModel[]) {
    setSelectedPlacesState(places);
    setSelectedExperienceIds(places.map((p) => p.experienceId));
  }

  function selectAllRecommendations() {
    const current = recommendationsRef.current;
    setSelectedPlacesState(current);
    setSelectedExperienceIds(current.map((r) => r.experienceId));
  }

  async function fetchRecommendations(): Promise<RecommendationModel[]> {
    const dest = locationMode === 'exact' ? displayAddress : destination;
    if (!dest || !isDestinationResolved) {
      return [];
    }
    const durationHours = availableTimeMinutes / 60;

    const recs = await ApiService.fetchRecommendations({
      destination: dest,
      startLocation: displayAddress,
      startLat: latitude,
      startLon: longitude,
      budget: totalBudgetInr,
      durationHours,
      travelerCount,
      travelerType: groupType,
      interests,
      preferences,
      tripDate,
      excludedCategories,
      topN: 50,
    });

    updateRecommendations(recs);
    setSelectedPlacesState([]);
    setSelectedExperienceIds([]);
    return recs;
  }

  async function generateFinalItinerary(weatherOverride?: string): Promise<Itinerary> {
    const dest = locationMode === 'exact' ? displayAddress : destination;
    if (!dest || !isDestinationResolved) {
      throw new Error("Please select a recognized destination with valid coordinates before generating an itinerary.");
    }

    setIsGenerating(true);
    try {
      const durationHours = availableTimeMinutes / 60;

      const targetCount = desiredExperienceCount > 0 ? desiredExperienceCount : 4;
      const currentRecs = recommendationsRef.current;

      // Derive a consistent selected list from the ref — avoids the case where
      // selectedExperienceIds and selectedPlaces state diverge across renders.
      const selectedList =
        selectedExperienceIds.length > 0
          ? selectedExperienceIds
          : currentRecs.slice(0, targetCount).map((r) => r.experienceId);

      // Always re-derive selectedPlacesModels from the ref to stay in sync with
      // selectedList — this prevents passing stale/wrong places when the user
      // has picked experiences from multiple recommendation fetches.
      const derivedSelectedPlaces =
        selectedList.length > 0
          ? currentRecs.filter((r) => selectedList.includes(r.experienceId))
          : selectedPlaces;

      const itin = await ApiService.generateItinerary({
        destination: dest,
        tripDate,
        startTime: tripStartTime,
        durationHours,
        budget: totalBudgetInr,
        startLocation: displayAddress,
        startLat: latitude,
        startLon: longitude,
        selectedExperienceIds: selectedList,
        selectedPlacesModels: derivedSelectedPlaces,
        travelerCount,
        travelerType: groupType,
        weatherCondition: weatherOverride || activeWeatherCondition,
      });

      setGeneratedItinerary(itin);
      const updatedTrips = [itin, ...savedTrips.filter((t) => t.id !== itin.id)];
      setSavedTrips(updatedTrips);
      StorageService.saveTrips(updatedTrips);
      ApiService.saveItineraryToDatabase(itin);
      return itin;
    } finally {
      setIsGenerating(false);
    }
  }

  async function optimizeCurrentItinerary(): Promise<Itinerary | null> {
    if (!generatedItinerary) return null;
    const optimized = await ApiService.optimizeItinerary(generatedItinerary);
    setGeneratedItinerary(optimized);
    const updatedTrips = savedTrips.map((t) => (t.id === optimized.id ? optimized : t));
    setSavedTrips(updatedTrips);
    StorageService.saveTrips(updatedTrips);
    ApiService.saveItineraryToDatabase(optimized);
    return optimized;
  }

  async function saveCurrentItinerary(): Promise<boolean> {
    if (!generatedItinerary) return false;
    const updatedTrips = [generatedItinerary, ...savedTrips.filter((t) => t.id !== generatedItinerary.id)];
    setSavedTrips(updatedTrips);
    StorageService.saveTrips(updatedTrips);
    return await ApiService.saveItineraryToDatabase(generatedItinerary);
  }

  function applyOptimizationChanges(params: {
    removeInterests?: string[];
    addInterests?: string[];
    customNotes?: string | null;
    budget?: number | null;
    durationHours?: number | null;
  }) {
    let currentInterests = [...interests];
    let currentExcluded = [...excludedCategories];

    if (params.removeInterests) {
      for (const r of params.removeInterests) {
        currentInterests = currentInterests.filter((i) => i.toLowerCase() !== r.toLowerCase());
        if (!currentExcluded.some((e) => e.toLowerCase() === r.toLowerCase())) {
          currentExcluded.push(r);
        }
      }
    }
    if (params.addInterests) {
      for (const a of params.addInterests) {
        currentExcluded = currentExcluded.filter((e) => e.toLowerCase() !== a.toLowerCase());
        if (!currentInterests.some((i) => i.toLowerCase() === a.toLowerCase())) {
          currentInterests.push(a);
        }
      }
    }

    setInterests(currentInterests);
    setExcludedCategories(currentExcluded);
    if (params.budget) setBudgetState(params.budget);
    if (params.durationHours) setAvailableTimeMinutes(Math.round(params.durationHours * 60));
    if (params.customNotes) setPreferences((prev) => (prev ? `${prev}; ${params.customNotes}` : params.customNotes!));

    // Filter current recommendations
    const filtered = recommendations.filter((rec) => {
      const combined = `${rec.category} ${rec.subCategory || ''} ${rec.name} ${rec.tags || ''}`.toLowerCase();
      return !currentExcluded.some((ex) => combined.includes(ex.toLowerCase()));
    });
    updateRecommendations(filtered);
    setSelectedPlacesState([]);
    setSelectedExperienceIds([]);
  }

  function applySmartSearchResult(parsedIntent: Record<string, any>, recs: RecommendationModel[]) {
    const timeHours = Number(parsedIntent.available_time_hours ?? 4.0);
    const budget = Number(parsedIntent.budget_inr ?? 2500.0);
    const count = Number(parsedIntent.traveler_count ?? 1);
    const group = (parsedIntent.group_type as any) || 'Solo';
    const dest = parsedIntent.destination ? String(parsedIntent.destination) : destination;
    const desired = Number(parsedIntent.desired_experience_count ?? 3);
    const intrList = Array.isArray(parsedIntent.interests) ? parsedIntent.interests.map(String) : interests;

    setDestination(dest);
    setTime(timeHours.toString(), 'Hours');
    setBudget(budget);
    setGroup(group, count);
    setDesiredExperienceCount(desired);
    if (intrList.length > 0) setInterests(intrList);

    updateRecommendations(recs);
    setSelectedPlacesState([]);
    setSelectedExperienceIds([]);
  }

  function updateExperienceExpense(itemId: string, expense: number) {
    if (!generatedItinerary) return;
    const updatedItems = generatedItinerary.items.map((i) => (i.id === itemId ? { ...i, actualExpense: expense } : i));
    const updated = { ...generatedItinerary, items: updatedItems };
    setGeneratedItinerary(updated);
    const updatedTrips = savedTrips.map((t) => (t.id === updated.id ? updated : t));
    setSavedTrips(updatedTrips);
    StorageService.saveTrips(updatedTrips);
    ApiService.saveItineraryToDatabase(updated);
  }

  function completeExperience(itemId: string, rating = 5.0, review?: string, expense?: number) {
    if (!generatedItinerary) return;
    const updatedItems = generatedItinerary.items.map((i) =>
      i.id === itemId
        ? {
            ...i,
            isCompleted: true,
            completedAt: new Date().toISOString(),
            travelerRating: rating,
            travelerReview: review,
            actualExpense: expense ?? i.price,
            arrivedWithinProximity: true,
            dwellDurationMinutes: 10,
          }
        : i
    );
    const updated = { ...generatedItinerary, items: updatedItems };
    setGeneratedItinerary(updated);
    const updatedTrips = savedTrips.map((t) => (t.id === updated.id ? updated : t));
    setSavedTrips(updatedTrips);
    StorageService.saveTrips(updatedTrips);
    ApiService.saveItineraryToDatabase(updated);
  }

  function deleteTrip(id: string) {
    const updated = savedTrips.filter((t) => t.id !== id);
    setSavedTrips(updated);
    StorageService.saveTrips(updated);
    if (generatedItinerary?.id === id) {
      setGeneratedItinerary(updated[0] || null);
    }
  }

  function toggleWishlist(id: string) {
    const updated = StorageService.toggleWishlist(id);
    setWishlist(updated);
  }

  function resetForNewTrip() {
    setSelectedPlacesState([]);
    setSelectedExperienceIds([]);
    setGeneratedItinerary(null);
  }

  return (
    <ItineraryContext.Provider
      value={{
        locationMode,
        destination,
        displayAddress,
        latitude,
        longitude,
        canonicalDestination,
        isDestinationResolved,
        availableTime,
        availableTimeUnit,
        availableTimeMinutes,
        totalBudgetInr,
        travelerCount,
        groupType,
        desiredExperienceCount,
        interests,
        excludedCategories,
        preferences,
        tripDate,
        tripStartTime,
        recommendations,
        selectedPlaces,
        selectedExperienceIds,
        generatedItinerary,
        savedTrips,
        wishlist,
        isGenerating,
        activeWeatherCondition,
        setLocationMode,
        setDestination,
        setCanonicalDestination,
        setExactLocation,
        setTime,
        setBudget,
        setGroup,
        setTravelerCount,
        setDesiredExperienceCount,
        toggleInterest,
        setInterests,
        setPreferences,
        setTripDate,
        setTripStartTime,
        toggleExperienceSelection,
        setSelectedPlaces,
        selectAllRecommendations,
        fetchRecommendations,
        generateFinalItinerary,
        optimizeCurrentItinerary,
        saveCurrentItinerary,
        applyOptimizationChanges,
        applySmartSearchResult,
        updateExperienceExpense,
        completeExperience,
        deleteTrip,
        toggleWishlist,
        setWeatherCondition: setActiveWeatherCondition,
        resetForNewTrip,
        setActiveItinerary: setGeneratedItinerary,
      }}
    >
      {children}
    </ItineraryContext.Provider>
  );
}

export function useItinerary() {
  const context = useContext(ItineraryContext);
  if (!context) throw new Error('useItinerary must be used within an ItineraryProvider');
  return context;
}
