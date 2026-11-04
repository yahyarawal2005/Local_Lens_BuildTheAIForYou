'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GeocodingService } from '@/lib/geocoding';
import { CanonicalDestination } from '@/types';
import { MapPin, Search, Loader2, X, Check } from 'lucide-react';

interface DestinationSearchAutocompleteProps {
  value?: string;
  placeholder?: string;
  onSelect: (destination: CanonicalDestination) => void;
  className?: string;
  autoFocus?: boolean;
}

export function DestinationSearchAutocomplete({
  value = '',
  placeholder = 'Search destination (e.g. Pune, Jaipur, Goa, Delhi)...',
  onSelect,
  className = '',
  autoFocus = false,
}: DestinationSearchAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<CanonicalDestination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const matches = await GeocodingService.searchDestinations(val);
        setResults(matches);
        setHasSearched(true);
      } catch (err) {
        console.error('Destination search error:', err);
        setResults([]);
        setHasSearched(true);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const handleSelect = (dest: CanonicalDestination) => {
    setQuery(dest.displayName || dest.name);
    setIsOpen(false);
    setResults([]);
    onSelect(dest);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHasSearched(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < results.length) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0 || (query.trim().length >= 2 && !isLoading)) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="w-full h-11 pl-10 pr-9 rounded-xl bg-surface-muted dark:bg-slate-700/80 border border-[#EAE8E3] dark:border-slate-600 focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs sm:text-sm font-semibold text-[#1A1A1A] dark:text-white transition-all placeholder:text-ink-muted dark:placeholder:text-slate-400"
        />

        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
          ) : query.trim() ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-ink-muted dark:text-slate-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Suggestion Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-floating border border-[#EAE8E3] dark:border-slate-700 py-2 z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95">
          {results.length > 0 ? (
            <div>
              <div className="px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted dark:text-slate-400">
                Matching Destinations ({results.length})
              </div>
              {results.map((dest, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={`${dest.city}-${dest.latitude}-${dest.longitude}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(dest)}
                    className={`w-full px-3.5 py-2.5 text-left text-xs transition-colors flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-primary-soft dark:bg-primary/20 text-primary font-semibold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-[#1A1A1A] dark:text-slate-200'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs truncate">
                        {dest.name || dest.city}
                        {dest.state ? `, ${dest.state}` : ''}
                      </div>
                      <div className="text-[11px] text-ink-secondary dark:text-slate-400 truncate">
                        {dest.displayName || `${dest.city}, ${dest.country}`}
                      </div>
                      <div className="text-[10px] text-ink-muted dark:text-slate-500 mt-0.5">
                        Coords: {dest.latitude.toFixed(4)}° N, {dest.longitude.toFixed(4)}° E
                      </div>
                    </div>
                    {query.toLowerCase().trim() === dest.city.toLowerCase().trim() && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : hasSearched && !isLoading ? (
            <div className="px-4 py-3 text-center text-xs text-ink-secondary dark:text-slate-400">
              <Search className="w-4 h-4 mx-auto mb-1 text-ink-muted opacity-50" />
              <span>No verified destinations matching &ldquo;{query}&rdquo;</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
