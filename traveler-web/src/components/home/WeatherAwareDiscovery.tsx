'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/ThemeContext';
import { useItinerary } from '@/context/ItineraryContext';
import {
  Sun,
  CloudRain,
  Sunset,
  Cloud,
  Compass,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Wind,
  Umbrella,
  Eye,
} from 'lucide-react';

interface WeatherAwareDiscoveryProps {
  onFilterOutdoor: () => void;
  onFilterIndoor: () => void;
}

export function WeatherAwareDiscovery({
  onFilterOutdoor,
  onFilterIndoor,
}: WeatherAwareDiscoveryProps) {
  const { weather, isStormy, toggleStormDemo } = useTheme();
  const { destination } = useItinerary();

  const WeatherIcon =
    weather.iconName === 'CloudRain' || isStormy
      ? CloudRain
      : weather.iconName === 'Sunset'
      ? Sunset
      : weather.iconName === 'Cloud'
      ? Cloud
      : Sun;

  // Weather-specific intelligence advice
  const isRain = isStormy || weather.condition.toLowerCase().includes('rain');
  const isSunny = !isRain && (weather.condition.toLowerCase().includes('sun') || weather.condition.toLowerCase().includes('clear'));

  const adviceTitle = isRain
    ? `Rain Advisory for ${destination}`
    : isSunny
    ? `Perfect Weather for Exploration in ${destination}`
    : `Pleasant Discovery Conditions in ${destination}`;

  const adviceDescription = isRain
    ? 'Expect periodic rainfall. We recommend covered heritage arcades, art cafes, spice thali restaurants, and indoor cultural exhibitions.'
    : isSunny
    ? 'Clear skies with pleasant warmth. Ideal for coastal fortress walks, open-air street bazaars, photography trails, and sunset viewpoints.'
    : 'Comfortable overcast skies. Perfect for nature walks, outdoor food trails, and exploring local neighborhood streets without harsh sun.';

  return (
    <div
      className={`rounded-3xl p-6 sm:p-7 border transition-all duration-300 shadow-soft ${
        isRain
          ? 'bg-gradient-to-r from-sky-950/90 via-slate-900 to-indigo-950 border-sky-500/40 text-white'
          : 'bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-primary/10 border-amber-200/80 dark:border-slate-700 text-[#1A1A1A] dark:text-white'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Weather condition icon & temperature */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-soft ${
              isRain
                ? 'bg-sky-500/20 text-sky-400 border border-sky-400/30'
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-400/30'
            }`}
          >
            <WeatherIcon className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                  isRain
                    ? 'bg-sky-500 text-slate-950'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {isRain ? 'Live Monsoon Active' : 'Live Weather Match'}
              </span>
              <span className="text-xs font-semibold text-ink-secondary dark:text-slate-400">
                {destination}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="font-display font-black text-2xl sm:text-3xl">
                {weather.tempCelsius}
              </span>
              <span className="text-sm font-semibold opacity-80">
                • {isRain ? 'Heavy Monsoon Rains' : weather.condition}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Contextual Travel Advice */}
        <div className="flex-1 max-w-xl">
          <h4 className="font-display font-bold text-sm sm:text-base">
            {adviceTitle}
          </h4>
          <p className="text-xs sm:text-sm mt-1 opacity-80 leading-relaxed">
            {adviceDescription}
          </p>
        </div>

        {/* Right: Quick Adaptive Actions */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-stretch lg:self-auto shrink-0">
          {isRain ? (
            <button
              onClick={onFilterIndoor}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Umbrella className="w-3.5 h-3.5" />
              <span>Show Indoor Spots</span>
            </button>
          ) : (
            <button
              onClick={onFilterOutdoor}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold shadow-soft transition-all active:scale-95 flex items-center justify-center gap-1.5"
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Show Outdoor Trails</span>
            </button>
          )}

          <button
            onClick={toggleStormDemo}
            title="Toggle live weather storm simulation"
            className="px-3.5 py-2.5 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs font-semibold transition-all flex items-center gap-1 text-ink-secondary dark:text-slate-300"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>{isStormy ? 'Reset Weather' : 'Simulate Storm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
