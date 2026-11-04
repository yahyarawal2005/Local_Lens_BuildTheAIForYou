'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useItinerary } from '@/context/ItineraryContext';
import { DestinationSearchAutocomplete } from '@/components/home/DestinationSearchAutocomplete';
import {
  Compass,
  Sparkles,
  MapPin,
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface ImmersiveHeroProps {
  onScrollToExperiences: () => void;
}

export function ImmersiveHero({ onScrollToExperiences }: ImmersiveHeroProps) {
  const router = useRouter();
  const {
    destination,
    setCanonicalDestination,
    tripDate,
    setTripDate,
    availableTime,
    setTime,
    travelerCount,
    setTravelerCount,
    groupType,
    setGroup,
    totalBudgetInr,
    setBudget,
  } = useItinerary();

  const [activeTab, setActiveTab] = useState<'plan' | 'search'>('plan');

  const destinationHeroImages: Record<string, string> = {
    mumbai: '/assets/images/destinations/mumbai_gateway_of_india.jpg',
    pune: '/assets/images/destinations/pune_shaniwar_wada.jpg',
    jaipur: '/assets/images/destinations/jaipur_hawa_mahal.jpg',
    delhi: '/assets/images/destinations/delhi_india_gate.jpg',
    alibaug: '/assets/images/destinations/alibaug_kolaba_fort.jpg',
    alibag: '/assets/images/destinations/alibaug_kolaba_fort.jpg',
  };

  const currentHeroImage =
    destinationHeroImages[destination.toLowerCase().trim()] ||
    '/assets/images/destinations/mumbai_gateway_of_india.jpg';

  function handleBuildItinerary() {
    router.push('/itinerary/create');
  }

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-floating border border-black/5 dark:border-white/10 mb-8 sm:mb-12">
      {/* Background Photography with Editorial Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={currentHeroImage}
          alt={destination || 'Gateway of India, Mumbai'}
          fill
          priority
          className="object-cover object-center scale-105 animate-pulse-slow filter brightness-90 transition-all duration-700"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/50" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-black/30" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 px-6 py-12 sm:px-10 sm:py-16 lg:py-20 max-w-5xl">
        {/* Verification Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold mb-4 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Verified Supabase Experience Engine</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>

        {/* Headline */}
        <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.1]">
          Discover More Than <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-[#FA7252] bg-clip-text text-transparent">
            Just Destinations.
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base lg:text-lg text-slate-200/90 max-w-2xl font-normal leading-relaxed">
          AI-curated day trips, authentic local food secrets, and handpicked hidden gems with verified real-world photographs across India.
        </p>

        {/* Multi-Criteria Unified Search & Planner Bar (Airbnb / Google Travel inspired) */}
        <div className="mt-8 p-3 sm:p-4 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-white/40 dark:border-slate-700 shadow-2xl">
          {/* Top Mode Selector */}
          <div className="flex items-center gap-2 mb-3 px-1">
            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'plan'
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-ink-secondary dark:text-slate-400 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Trip Builder</span>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                activeTab === 'search'
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-ink-secondary dark:text-slate-400 hover:text-ink hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Instant Experience Finder</span>
            </button>
          </div>

          {/* Input Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* 1. Destination Autocomplete */}
            <div className="p-2.5 rounded-2xl bg-surface-muted dark:bg-slate-800/80 border border-transparent hover:border-primary/30 transition-all flex flex-col justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-primary" />
                <span>Destination</span>
              </span>
              <div className="mt-1">
                <DestinationSearchAutocomplete
                  value={destination}
                  onSelect={(can) => setCanonicalDestination(can)}
                  placeholder="Where to? (e.g. Pune, Jaipur)..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* 2. Available Duration */}
            <div className="p-2.5 rounded-2xl bg-surface-muted dark:bg-slate-800/80 border border-transparent hover:border-primary/30 transition-all flex flex-col justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>Available Time</span>
              </span>
              <select
                value={availableTime}
                onChange={(e) => setTime(e.target.value, 'Hours')}
                className="mt-1 bg-transparent text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none cursor-pointer w-full"
              >
                <option value="4" className="dark:bg-slate-800">4 Hours (Quick Half-Day)</option>
                <option value="6" className="dark:bg-slate-800">6 Hours (Extended Trail)</option>
                <option value="8" className="dark:bg-slate-800">8 Hours (Full Day Immersion)</option>
                <option value="12" className="dark:bg-slate-800">12 Hours (Sunrise to Sunset)</option>
              </select>
            </div>

            {/* 3. Budget Tier */}
            <div className="p-2.5 rounded-2xl bg-surface-muted dark:bg-slate-800/80 border border-transparent hover:border-primary/30 transition-all flex flex-col justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 flex items-center gap-1">
                <IndianRupee className="w-3 h-3 text-primary" />
                <span>Budget (INR)</span>
              </span>
              <select
                value={totalBudgetInr}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-1 bg-transparent text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none cursor-pointer w-full"
              >
                <option value={800} className="dark:bg-slate-800">Under ₹800 (Street & Free Gems)</option>
                <option value={2000} className="dark:bg-slate-800">₹2,000 (Popular Sights & Dining)</option>
                <option value={4500} className="dark:bg-slate-800">₹4,500 (Premium & Heritage Tours)</option>
                <option value={8000} className="dark:bg-slate-800">₹8,000+ (Luxury Curated Experiences)</option>
              </select>
            </div>

            {/* 4. Group Style & Action */}
            <div className="flex items-center gap-2">
              <div className="flex-1 p-2.5 rounded-2xl bg-surface-muted dark:bg-slate-800/80 border border-transparent hover:border-primary/30 transition-all flex flex-col justify-center">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-primary" />
                  <span>Group</span>
                </span>
                <select
                  value={groupType}
                  onChange={(e) => {
                    const g = e.target.value as 'Solo' | 'Couple' | 'Friends' | 'Family';
                    const counts = { Solo: 1, Couple: 2, Friends: 4, Family: 4 };
                    setGroup(g, counts[g]);
                  }}
                  className="mt-1 bg-transparent text-xs font-bold text-[#1A1A1A] dark:text-white focus:outline-none cursor-pointer w-full"
                >
                  <option value="Solo" className="dark:bg-slate-800">Solo Explorer</option>
                  <option value="Couple" className="dark:bg-slate-800">Couple Retreat</option>
                  <option value="Friends" className="dark:bg-slate-800">Friends Crew</option>
                  <option value="Family" className="dark:bg-slate-800">Family Leisure</option>
                </select>
              </div>

              {/* Action Trigger Button */}
              {activeTab === 'plan' ? (
                <button
                  onClick={handleBuildItinerary}
                  className="h-full px-5 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-floating active:scale-95 transition-all shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  <span className="whitespace-nowrap">Plan Trip</span>
                </button>
              ) : (
                <button
                  onClick={onScrollToExperiences}
                  className="h-full px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-floating active:scale-95 transition-all shrink-0"
                >
                  <Search className="w-4 h-4" />
                  <span className="whitespace-nowrap">Explore</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Feature Badges Strip */}
        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-white/80">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Verified Exact Match Imagery</span>
          </span>
          <span className="text-white/40">•</span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>FastAPI ML Recommendation Engine</span>
          </span>
          <span className="text-white/40">•</span>
          <span className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-400" />
            <span>Real-time Weather Adaptation</span>
          </span>
        </div>
      </div>
    </div>
  );
}
