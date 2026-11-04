'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useItinerary } from '@/context/ItineraryContext';
import { useTheme } from '@/context/ThemeContext';
import { CategoryChips } from '@/components/home/CategoryChips';
import { ExperienceCard } from '@/components/home/ExperienceCard';
import { DestinationSearchAutocomplete } from '@/components/home/DestinationSearchAutocomplete';
import {
  VerifiedExperienceService,
  FetchVerifiedExperiencesResult,
} from '@/lib/verifiedExperienceService';
import { RecommendationModel } from '@/types';
import {
  Search,
  Map as MapIcon,
  Grid,
  Columns,
  SlidersHorizontal,
  MapPin,
  ShieldCheck,
  RotateCw,
  Sun,
  CloudRain,
  Sparkles,
  ArrowUpDown,
  Filter,
  Camera,
  IndianRupee,
  Gem,
  Compass,
} from 'lucide-react';
import { MapMarkerPoint } from '@/components/maps/InteractiveMap';

// Dynamic import Leaflet map to prevent SSR hydration errors
const InteractiveMap = dynamic(
  () => import('@/components/maps/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false, loading: () => <div className="h-96 w-full rounded-3xl bg-black/5 animate-pulse" /> }
);

const PAGE_SIZE = 18;

export default function ExplorePage() {
  const { destination, setDestination, setCanonicalDestination, recommendations: contextRecs, latitude, longitude } =
    useItinerary();
  const { isStormy, weather } = useTheme();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [budgetTier, setBudgetTier] = useState<string>('all'); // 'all' | 'budget' | 'moderate' | 'premium'
  const [experienceType, setExperienceType] = useState<string>('all'); // 'all' | 'indoor' | 'outdoor' | 'hidden_gem'
  const [sortBy, setSortBy] = useState<'rating' | 'price_asc' | 'price_desc'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'split' | 'map'>('grid');

  // Database experiences state
  const [items, setItems] = useState<RecommendationModel[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef<number>(0);

  // Load verified records from Supabase
  const loadRecords = async (targetPage: number = 1, append: boolean = false) => {
    const currentReqId = ++requestIdRef.current;
    if (targetPage === 1) setIsLoading(true);
    else setIsLoadingMore(true);
    setError(null);

    try {
      const result: FetchVerifiedExperiencesResult =
        await VerifiedExperienceService.getVerifiedExperiences({
          page: targetPage,
          pageSize: PAGE_SIZE,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          destination: destination && destination !== 'Select Destination' ? destination : undefined,
          searchQuery: searchQuery.trim() !== '' ? searchQuery.trim() : undefined,
        });

      if (currentReqId !== requestIdRef.current) return;

      if (result.error) {
        setError(result.error);
      } else {
        // If Supabase returned items, use them; if none and context has recommendations, merge fallback
        let combined = result.recommendations;
        if (combined.length === 0 && contextRecs.length > 0 && targetPage === 1) {
          combined = contextRecs;
        }

        if (append) {
          setItems((prev) => [...prev, ...combined]);
        } else {
          setItems(combined);
        }
        setTotalCount(result.totalCount || combined.length);
        setPage(targetPage);
      }
    } catch (err: any) {
      if (currentReqId === requestIdRef.current) {
        setError(err?.message || 'Failed to load verified experiences.');
      }
    } finally {
      if (currentReqId === requestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setPage(1);
    loadRecords(1, false);
  }, [selectedCategory, destination, searchQuery]);

  // Client-side filtering for budget, experience type, and sorting
  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Budget filter
    if (budgetTier === 'budget') {
      result = result.filter((i) => (i.priceInr ?? 0) <= 500);
    } else if (budgetTier === 'moderate') {
      result = result.filter((i) => (i.priceInr ?? 0) > 500 && (i.priceInr ?? 0) <= 1500);
    } else if (budgetTier === 'premium') {
      result = result.filter((i) => (i.priceInr ?? 0) > 1500);
    }

    // Type filter
    if (experienceType === 'indoor') {
      result = result.filter((i) => i.indoorOutdoor?.toLowerCase() === 'indoor');
    } else if (experienceType === 'outdoor') {
      result = result.filter((i) => i.indoorOutdoor?.toLowerCase() === 'outdoor');
    } else if (experienceType === 'hidden_gem') {
      result = result.filter((i) => i.hiddenGem);
    }

    // Sorting
    if (sortBy === 'rating') {
      result.sort((a, b) => (b.rating ?? 4.5) - (a.rating ?? 4.5));
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => (a.priceInr ?? 0) - (b.priceInr ?? 0));
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => (b.priceInr ?? 0) - (a.priceInr ?? 0));
    }

    return result;
  }, [items, budgetTier, experienceType, sortBy]);

  // Map markers
  const mapMarkers: MapMarkerPoint[] = useMemo(() => {
    return filteredAndSortedItems
      .filter((i) => i.latitude && i.longitude)
      .map((i, idx) => ({
        id: i.experienceId,
        name: i.name,
        category: i.category,
        latitude: i.latitude!,
        longitude: i.longitude!,
        orderNumber: idx + 1,
      }));
  }, [filteredAndSortedItems]);

  const mapCenter: [number, number] = useMemo(() => {
    if (mapMarkers.length > 0) {
      return [mapMarkers[0].latitude, mapMarkers[0].longitude];
    }
    return [latitude || 19.076, longitude || 72.8777];
  }, [mapMarkers, latitude, longitude]);

  function handleResetFilters() {
    setSelectedCategory('All');
    setBudgetTier('all');
    setExperienceType('all');
    setSortBy('rating');
    setSearchQuery('');
  }

  const hasSecondaryFilters =
    budgetTier !== 'all' || experienceType !== 'all' || sortBy !== 'rating';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Editorial Header & View Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft dark:bg-primary/20 text-primary mb-2 text-xs font-bold">
            <Compass className="w-3.5 h-3.5" />
            <span>Curated Exploration Engine</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] dark:text-white">
            Explore {destination || 'India'}
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1 max-w-xl">
            Discover verified authentic places, street food legends, hidden nature trails, and architectural wonders.
          </p>
        </div>

        {/* View Switcher Pill (Grid / Split / Map) */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-sm self-start lg:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'grid'
                ? 'bg-primary text-white shadow-soft'
                : 'text-ink-secondary dark:text-slate-400 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid View</span>
          </button>

          <button
            onClick={() => setViewMode('split')}
            className={`hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'split'
                ? 'bg-primary text-white shadow-soft'
                : 'text-ink-secondary dark:text-slate-400 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split Map</span>
          </button>

          <button
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'map'
                ? 'bg-primary text-white shadow-soft'
                : 'text-ink-secondary dark:text-slate-400 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Full Map</span>
          </button>
        </div>
      </div>

      {/* Primary Search & Destination Autocomplete Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Name / Keyword Search */}
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-ink-muted dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search spots, food, activities in ${destination || 'any city'}...`}
            className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white placeholder:text-ink-muted"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-ink-muted hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>

        {/* Dynamic Destination Switcher */}
        <div className="relative">
          <DestinationSearchAutocomplete
            value={destination}
            onSelect={(can) => setCanonicalDestination(can)}
            placeholder="Change destination..."
          />
        </div>
      </div>

      {/* Category Chips Bar */}
      <CategoryChips
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Secondary Filter Pill Strip: Budget, Type, Sort, Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-[#EAE8E3] dark:border-slate-700 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          {/* Budget Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted dark:bg-slate-700 text-xs font-semibold">
            <IndianRupee className="w-3.5 h-3.5 text-primary" />
            <select
              value={budgetTier}
              onChange={(e) => setBudgetTier(e.target.value)}
              className="bg-transparent font-medium focus:outline-none text-[#1A1A1A] dark:text-white cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-800">All Budgets</option>
              <option value="budget" className="dark:bg-slate-800">Under ₹500 (Free & Budget)</option>
              <option value="moderate" className="dark:bg-slate-800">₹500 - ₹1,500 (Moderate)</option>
              <option value="premium" className="dark:bg-slate-800">₹1,500+ (Premium)</option>
            </select>
          </div>

          {/* Experience Type Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted dark:bg-slate-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <select
              value={experienceType}
              onChange={(e) => setExperienceType(e.target.value)}
              className="bg-transparent font-medium focus:outline-none text-[#1A1A1A] dark:text-white cursor-pointer"
            >
              <option value="all" className="dark:bg-slate-800">All Types</option>
              <option value="outdoor" className="dark:bg-slate-800">Outdoor Only</option>
              <option value="indoor" className="dark:bg-slate-800">Indoor Only</option>
              <option value="hidden_gem" className="dark:bg-slate-800">Hidden Gems Only</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-muted dark:bg-slate-700 text-xs font-semibold">
            <ArrowUpDown className="w-3.5 h-3.5 text-ink-secondary dark:text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent font-medium focus:outline-none text-[#1A1A1A] dark:text-white cursor-pointer"
            >
              <option value="rating" className="dark:bg-slate-800">Sort by Highest Rated</option>
              <option value="price_asc" className="dark:bg-slate-800">Price: Low to High</option>
              <option value="price_desc" className="dark:bg-slate-800">Price: High to Low</option>
            </select>
          </div>

          {hasSecondaryFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-bold text-primary hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Count & Refresh */}
        <div className="flex items-center gap-3 text-xs text-ink-secondary dark:text-slate-400 font-semibold">
          <span>{filteredAndSortedItems.length} spots</span>
          <button
            onClick={() => loadRecords(1, false)}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area based on View Mode */}
      {viewMode === 'map' ? (
        /* FULL MAP VIEW */
        <div className="space-y-4">
          <div className="h-[550px] sm:h-[650px] w-full rounded-3xl overflow-hidden border border-[#EAE8E3] dark:border-slate-700 shadow-floating">
            <InteractiveMap
              markers={mapMarkers}
              center={mapCenter}
              zoom={12}
              showPolyline={false}
              className="w-full h-full"
            />
          </div>
          <p className="text-xs text-ink-secondary dark:text-slate-400 text-center">
            Showing {mapMarkers.length} verified pins on map. Click on any marker to inspect name and category.
          </p>
        </div>
      ) : viewMode === 'split' ? (
        /* SPLIT MAP VIEW (Airbnb / Google Travel inspired) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Scrollable Cards Grid (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-72 rounded-3xl bg-black/5 dark:bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredAndSortedItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredAndSortedItems.map((item) => (
                  <ExperienceCard key={item.experienceId} experience={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700">
                <Camera className="w-10 h-10 text-ink-muted dark:text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-base font-bold text-[#1A1A1A] dark:text-white">No experiences found</p>
                <p className="text-xs text-ink-secondary dark:text-slate-400 mt-1">
                  Try adjusting your filters or destination to explore more authentic places.
                </p>
              </div>
            )}
          </div>

          {/* Right: Sticky Synchronized Map (5 cols) */}
          <div className="hidden lg:block lg:col-span-5 sticky top-24">
            <div className="h-[620px] w-full rounded-3xl overflow-hidden border border-[#EAE8E3] dark:border-slate-700 shadow-floating">
              <InteractiveMap
                markers={mapMarkers}
                center={mapCenter}
                zoom={12}
                showPolyline={false}
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      ) : (
        /* FULL GRID VIEW (3 Columns) */
        <div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 rounded-3xl bg-black/5 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {filteredAndSortedItems.map((item) => (
                <ExperienceCard key={item.experienceId} experience={item} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700">
              <Camera className="w-10 h-10 text-ink-muted dark:text-slate-500 mx-auto mb-2 opacity-50" />
              <p className="text-base font-bold text-[#1A1A1A] dark:text-white">No experiences found</p>
              <p className="text-xs text-ink-secondary dark:text-slate-400 mt-1 max-w-md mx-auto">
                No verified records match your current filter combination.
              </p>
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-soft"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {/* Load More Pagination */}
          {items.length < totalCount && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => loadRecords(page + 1, true)}
                disabled={isLoadingMore}
                className="px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 hover:border-primary text-ink dark:text-white font-bold text-xs sm:text-sm shadow-soft hover:shadow-floating transition-all active:scale-95 flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin text-primary" />
                    <span>Loading more places...</span>
                  </>
                ) : (
                  <span>Load More Experiences ({items.length} of {totalCount})</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
