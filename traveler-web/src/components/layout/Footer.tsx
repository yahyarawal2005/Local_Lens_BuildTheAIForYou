'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/context/ThemeContext';
import { useItinerary } from '@/context/ItineraryContext';
import {
  Compass,
  ShieldCheck,
  Sparkles,
  MapPin,
  Heart,
  Send,
  ArrowRight,
  Sun,
  CloudRain,
  ExternalLink,
} from 'lucide-react';

export function Footer() {
  const { isStormy } = useTheme();
  const { setDestination } = useItinerary();

  const destinations = [
    'Mumbai',
    'Pune',
    'Jaipur',
    'Goa',
    'Delhi',
    'Bengaluru',
    'Hyderabad',
    'Udaipur',
  ];

  const categories = [
    { label: 'Food & Culinary Trails', href: '/explore?cat=Food' },
    { label: 'Heritage & Ancient Forts', href: '/explore?cat=Heritage' },
    { label: 'Beaches & Coastal Walks', href: '/explore?cat=Beach' },
    { label: 'Nature & Waterfall Treks', href: '/explore?cat=Nature' },
    { label: 'Culture & Sacred Temples', href: '/explore?cat=Culture' },
    { label: 'Hidden Gems & Local Bazaars', href: '/explore?cat=Shopping' },
  ];

  const tools = [
    { label: 'AI Day Planner', href: '/itinerary/create' },
    { label: 'Explore Verified Spots', href: '/explore' },
    { label: 'Lens Rides & Transit', href: '/rides/book' },
    { label: 'My Saved Places', href: '/saved' },
    { label: 'Traveler Profile', href: '/profile' },
  ];

  return (
    <footer
      className={`border-t transition-colors duration-300 mt-16 ${
        isStormy
          ? 'bg-[#0B1120] border-slate-800 text-slate-300'
          : 'bg-[#F4F2EC] border-[#E5E2D9] text-[#2C2B2A]'
      }`}
    >
      {/* Top Inspiration Banner */}
      <div className="border-b border-black/5 dark:border-white/5 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-soft shrink-0">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg sm:text-xl text-[#1A1A1A] dark:text-white">
                Discover More Than Just Destinations
              </h3>
              <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-0.5">
                Every place has a soul. Discover hidden chai addas, coastal fortresses, and local stories.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Link
              href="/itinerary/create"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-xs sm:text-sm shadow-soft flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Build My Itinerary</span>
            </Link>
            <Link
              href="/explore"
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 hover:border-primary text-ink dark:text-white font-bold text-xs sm:text-sm shadow-soft flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span>Explore Places</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand & Story */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/home" className="flex items-center gap-2.5 group inline-flex">
              <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shadow-soft overflow-hidden">
                <Image
                  src="/assets/images/logo.png"
                  alt="LocalLens Logo"
                  width={28}
                  height={28}
                  className="object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-xl tracking-tight text-primary">
                  LocalLens
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-ink-secondary dark:text-slate-400">
                  Traveler Platform
                </span>
              </div>
            </Link>

            <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 leading-relaxed max-w-sm">
              Your intelligent travel companion for authentic discovery. Powered by genuine verified photographs,
              local intelligence, weather-aware itinerary optimization, and seamless regional transit.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>100% Verified Real Photographs Guarantee</span>
            </div>
          </div>

          {/* Popular Hubs */}
          <div className="space-y-3">
            <h4 className="font-display font-extrabold text-sm uppercase tracking-wider text-[#1A1A1A] dark:text-white">
              Trending Hubs
            </h4>
            <ul className="space-y-2">
              {destinations.map((city) => (
                <li key={city}>
                  <button
                    onClick={() => {
                      setDestination(city);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-xs text-ink-secondary dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors flex items-center gap-1.5"
                  >
                    <MapPin className="w-3 h-3 text-primary/70" />
                    <span>{city}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Discovery Themes */}
          <div className="space-y-3">
            <h4 className="font-display font-extrabold text-sm uppercase tracking-wider text-[#1A1A1A] dark:text-white">
              Categories
            </h4>
            <ul className="space-y-2">
              {categories.map((cat) => (
                <li key={cat.label}>
                  <Link
                    href={cat.href}
                    className="text-xs text-ink-secondary dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Travel Tools */}
          <div className="space-y-3">
            <h4 className="font-display font-extrabold text-sm uppercase tracking-wider text-[#1A1A1A] dark:text-white">
              Intelligent Tools
            </h4>
            <ul className="space-y-2">
              {tools.map((tool) => (
                <li key={tool.label}>
                  <Link
                    href={tool.href}
                    className="text-xs text-ink-secondary dark:text-slate-400 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    {tool.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Sub-bar */}
        <div className="mt-12 pt-8 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-muted dark:text-slate-500">
          <p>© {new Date().getFullYear()} LocalLens Traveler. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-ink-secondary dark:text-slate-400">
              Made with <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" /> for passionate explorers
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
