'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useItinerary } from '@/context/ItineraryContext';
import { ExperienceCard } from '@/components/home/ExperienceCard';
import { CategoryChips } from '@/components/home/CategoryChips';
import { VerifiedExperienceService } from '@/lib/verifiedExperienceService';
import { RecommendationModel } from '@/types';
import { Bookmark, Compass, Search, Sparkles, PlusCircle, RotateCw } from 'lucide-react';

export default function SavedPage() {
  const router = useRouter();
  const { wishlist, recommendations: contextRecs, setSelectedPlaces } = useItinerary();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [savedItems, setSavedItems] = useState<RecommendationModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load experiences for wishlist items
  useEffect(() => {
    async function loadWishlistItems() {
      if (wishlist.length === 0) {
        setSavedItems([]);
        return;
      }

      setIsLoading(true);
      try {
        const results: RecommendationModel[] = [];
        const missingIds: string[] = [];

        // Check context memory first
        for (const id of wishlist) {
          const found = contextRecs.find((r) => r.experienceId === id);
          if (found) {
            results.push(found);
          } else {
            missingIds.push(id);
          }
        }

        // Fetch any missing IDs from Supabase
        if (missingIds.length > 0) {
          const fetchPromises = missingIds.map((id) =>
            VerifiedExperienceService.getExperienceById(id)
          );
          const fetchedResults = await Promise.all(fetchPromises);
          for (const res of fetchedResults) {
            if (res.recommendation) {
              results.push(res.recommendation);
            }
          }
        }

        setSavedItems(results);
      } catch (err) {
        console.error('Failed to load wishlist items:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadWishlistItems();
  }, [wishlist, contextRecs]);

  const filtered = useMemo(() => {
    return savedItems.filter((item) => {
      const matchCat =
        selectedCategory === 'All' ||
        item.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchQuery =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [savedItems, selectedCategory, searchQuery]);

  function handleCreateTripFromSaved() {
    if (savedItems.length === 0) return;
    setSelectedPlaces(savedItems);
    router.push('/itinerary/create');
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft dark:bg-primary/20 text-primary mb-2 text-xs font-bold">
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Collection</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] dark:text-white">
            Saved Places & Wishlist
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-0.5">
            Your bookmarked hidden gems, street food spots, and nature trails.
          </p>
        </div>

        {savedItems.length > 0 && (
          <button
            onClick={handleCreateTripFromSaved}
            className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-soft flex items-center gap-2 self-start sm:self-auto active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Plan Trip with Saved Places</span>
          </button>
        )}
      </div>

      {/* Search Bar within Saved */}
      {savedItems.length > 0 && (
        <div className="relative">
          <Search className="w-4 h-4 text-ink-muted dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within your saved places..."
            className="w-full h-11 pl-11 pr-4 rounded-xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {/* Category Chips */}
      <CategoryChips
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Grid of Saved Cards */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-ink-secondary dark:text-slate-400 font-semibold">
            Retrieving saved places from database...
          </p>
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filtered.map((item) => (
            <ExperienceCard key={item.experienceId} experience={item} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 px-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 space-y-3">
          <Bookmark className="w-12 h-12 text-ink-muted dark:text-slate-600 mx-auto" />
          <h3 className="font-display font-bold text-lg text-[#1A1A1A] dark:text-white">
            {wishlist.length === 0 ? 'Your Wishlist is Empty' : 'No matching saved places found'}
          </h3>
          <p className="text-xs text-ink-secondary dark:text-slate-400 max-w-xs mx-auto">
            {wishlist.length === 0
              ? 'Tap the heart icon on any experience while exploring to save it for your upcoming journey!'
              : 'Try clearing your category or search filter.'}
          </p>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft"
          >
            <Compass className="w-4 h-4" />
            <span>Discover Authentic Places</span>
          </Link>
        </div>
      )}
    </div>
  );
}
