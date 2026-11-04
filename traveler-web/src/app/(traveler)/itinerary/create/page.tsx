'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useItinerary } from '@/context/ItineraryContext';
import { CATEGORIES } from '@/components/home/CategoryChips';
import { DestinationSearchAutocomplete } from '@/components/home/DestinationSearchAutocomplete';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Users,
  IndianRupee,
  Sparkles,
  ArrowRight,
  Check,
  Plus,
  Minus,
} from 'lucide-react';

export default function CreateItineraryPage() {
  const router = useRouter();
  const {
    destination,
    setDestination,
    setCanonicalDestination,
    isDestinationResolved,
    latitude,
    longitude,
    tripDate,
    setTripDate,
    tripStartTime,
    setTripStartTime,
    travelerCount,
    setTravelerCount,
    groupType,
    setGroup,
    availableTime,
    availableTimeUnit,
    setTime,
    totalBudgetInr,
    setBudget,
    desiredExperienceCount,
    setDesiredExperienceCount,
    interests,
    toggleInterest,
    preferences,
    setPreferences,
    fetchRecommendations,
  } = useItinerary();

  const [isLoading, setIsLoading] = useState(false);

  const groups: Array<'Solo' | 'Couple' | 'Friends' | 'Family'> = [
    'Solo',
    'Couple',
    'Friends',
    'Family',
  ];

  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleProceed() {
    if (!destination || !isDestinationResolved || latitude === 0) {
      setValidationError('Please select a destination from the search suggestions before proceeding.');
      return;
    }
    setValidationError(null);
    setIsLoading(true);
    try {
      await fetchRecommendations();
      router.push('/itinerary/swipe');
    } catch {
      router.push('/itinerary/swipe');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Editorial Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft dark:bg-primary/20 text-primary mb-2 text-xs font-bold">
          <Compass className="w-3.5 h-3.5" />
          <span>Step 1 of 3: Plan Your Journey</span>
        </div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] dark:text-white">
          Where & How Are You Traveling?
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1">
          Customize your time, budget, group, and travel vibe.
        </p>
      </div>

      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft space-y-6">
        {/* Destination City Autocomplete */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
            Destination City
          </label>
          <DestinationSearchAutocomplete
            value={destination}
            onSelect={(selected) => {
              setCanonicalDestination(selected);
              setValidationError(null);
            }}
            placeholder="Search destination (e.g. Pune, Jaipur, Goa, Delhi, Bengaluru)..."
          />
          {validationError && (
            <p className="text-xs text-rose-500 font-medium mt-1.5">{validationError}</p>
          )}
        </div>

        {/* Date & Start Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
              Trip Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-ink-secondary dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={tripDate}
                onChange={(e) => setTripDate(e.target.value)}
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-muted dark:bg-slate-700 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:outline-none text-sm font-semibold text-[#1A1A1A] dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
              Start Time
            </label>
            <div className="relative">
              <Clock className="w-4 h-4 text-ink-secondary dark:text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tripStartTime}
                onChange={(e) => setTripStartTime(e.target.value)}
                placeholder="10:30 AM"
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-muted dark:bg-slate-700 border border-transparent focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:outline-none text-sm font-semibold text-[#1A1A1A] dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Travel Group Type */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
            Who Are You Traveling With?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {groups.map((g) => {
              const active = groupType === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g, g === 'Solo' ? 1 : g === 'Couple' ? 2 : g === 'Friends' ? 4 : 5)}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition-all active:scale-95 flex flex-col items-center gap-1 ${
                    active
                      ? 'border-primary bg-primary text-white shadow-soft'
                      : 'border-[#EAE8E3] dark:border-slate-700 bg-surface-muted dark:bg-slate-700 text-[#1A1A1A] dark:text-white hover:border-primary/40'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>{g}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Traveler Count Stepper */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-muted dark:bg-slate-700/60">
          <div>
            <span className="text-sm font-bold text-[#1A1A1A] dark:text-white block">Travelers Count</span>
            <span className="text-xs text-ink-secondary dark:text-slate-400">Total passengers / seats</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTravelerCount(Math.max(1, travelerCount - 1))}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-600 flex items-center justify-center text-ink active:scale-90"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-base font-extrabold w-6 text-center">{travelerCount}</span>
            <button
              type="button"
              onClick={() => setTravelerCount(travelerCount + 1)}
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-600 flex items-center justify-center text-ink active:scale-90"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Available Time & Budget */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
              Available Duration
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="24"
                value={availableTime}
                onChange={(e) => setTime(e.target.value, availableTimeUnit)}
                className="w-24 h-12 px-3 rounded-xl bg-surface-muted dark:bg-slate-700 border border-transparent focus:border-primary text-sm font-semibold text-center"
              />
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-muted dark:bg-slate-700 border border-transparent">
                {(['Hours', 'Days'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setTime(availableTime, u)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      availableTimeUnit === u
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-ink-secondary dark:text-slate-400'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
              Total Budget (₹ INR)
            </label>
            <div className="relative">
              <IndianRupee className="w-4 h-4 text-primary absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="500"
                min="500"
                value={totalBudgetInr}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-muted dark:bg-slate-700 border border-transparent focus:border-primary text-sm font-semibold text-[#1A1A1A] dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Desired Experience Stops */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
            Target Experience Stops in Itinerary
          </label>
          <div className="flex items-center gap-2">
            {[3, 4, 5, 6].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setDesiredExperienceCount(num)}
                className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all active:scale-95 ${
                  desiredExperienceCount === num
                    ? 'border-primary bg-primary text-white shadow-soft'
                    : 'border-[#EAE8E3] dark:border-slate-700 bg-surface-muted dark:bg-slate-700 text-[#1A1A1A] dark:text-white hover:border-primary/40'
                }`}
              >
                {num} Stops
              </button>
            ))}
          </div>
        </div>

        {/* Interests Selection */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
            Choose What You Love
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
              const active = interests.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleInterest(cat.id)}
                  className={`px-3.5 py-2 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    active
                      ? 'border-primary bg-primary text-white shadow-sm'
                      : 'border-[#EAE8E3] dark:border-slate-700 bg-surface-muted dark:bg-slate-700 text-ink-secondary dark:text-slate-300 hover:border-primary/40'
                  }`}
                >
                  {active && <Check className="w-3.5 h-3.5" />}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional Notes */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
            Special Notes / Preferences
          </label>
          <input
            type="text"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="e.g. Vegetarian only, avoid heavy walking, love spicy street chai"
            className="w-full h-12 px-4 rounded-xl bg-surface-muted dark:bg-slate-700 border border-transparent focus:border-primary text-sm font-semibold text-[#1A1A1A] dark:text-white"
          />
        </div>
      </div>

      {/* Next Step CTA */}
      <button
        onClick={handleProceed}
        disabled={isLoading}
        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-base shadow-floating flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-50"
      >
        <span>Discover & Pick Recommendations</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
