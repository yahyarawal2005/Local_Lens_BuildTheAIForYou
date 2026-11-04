'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useItinerary } from '@/context/ItineraryContext';
import { ApiService } from '@/lib/api';
import { Search, Sparkles, Loader2, ArrowRight } from 'lucide-react';

export function SmartSearchBar() {
  const router = useRouter();
  const { latitude, longitude, destination, applySmartSearchResult } = useItinerary();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = query.trim();
    if (!clean || isLoading) return;

    setIsLoading(true);
    try {
      const res = await ApiService.smartSearch({
        query: clean,
        userLat: latitude,
        userLon: longitude,
        city: destination,
      });

      if (res.recommendations && res.recommendations.length > 0) {
        applySmartSearchResult(res.parsedIntent, res.recommendations);
        router.push('/itinerary/swipe');
      } else {
        router.push(`/explore?q=${encodeURIComponent(clean)}`);
      }
    } catch {
      router.push(`/explore?q=${encodeURIComponent(clean)}`);
    } finally {
      setIsLoading(false);
    }
  }

  const promptSuggestions = [
    'Trek in Kharghar under ₹1500 for couple',
    'Authentic coastal seafood lunch in Alibaug',
    'Heritage fortress sunset walk with chai',
  ];

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-primary">
          <Sparkles className="w-5 h-5 animate-pulse" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything in English or Hindi (e.g. 'Beach sunset walk & street food')"
          className="w-full h-14 pl-12 pr-28 rounded-2xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary text-sm sm:text-base font-medium transition-all text-[#1A1A1A] dark:text-white placeholder:text-ink-muted dark:placeholder:text-slate-400"
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="h-10 px-4 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-primary-dark disabled:opacity-40 disabled:hover:bg-primary active:scale-95 transition-all shadow-sm"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Search</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Suggestion Pills */}
      <div className="flex items-center gap-2 mt-2.5 overflow-x-auto no-scrollbar py-1">
        <span className="text-[11px] font-bold text-ink-muted dark:text-slate-400 uppercase tracking-wider shrink-0">
          Try:
        </span>
        {promptSuggestions.map((prompt) => (
          <button
            key={prompt}
            onClick={() => {
              setQuery(prompt);
            }}
            className="px-3 py-1 rounded-full bg-white dark:bg-slate-800/80 border border-[#EAE8E3] dark:border-slate-700 text-xs text-ink-secondary dark:text-slate-300 hover:text-primary hover:border-primary/40 shrink-0 transition-colors"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
