'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useItinerary } from '@/context/ItineraryContext';
import { useRide } from '@/context/RideContext';
import {
  ArrowLeft,
  Navigation,
  CheckCircle2,
  Clock,
  MapPin,
  Car,
  Star,
  IndianRupee,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

export default function LiveTripPage() {
  const router = useRouter();
  const { generatedItinerary, completeExperience, updateExperienceExpense } = useItinerary();
  const { setLocations } = useRide();

  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [expenseInput, setExpenseInput] = useState('');
  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewNote, setReviewNote] = useState('');

  if (!generatedItinerary || generatedItinerary.items.length === 0) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold">No active itinerary in progress</h2>
        <Link href="/itinerary/create" className="text-primary font-semibold mt-2 inline-block">
          Plan an Itinerary First
        </Link>
      </div>
    );
  }

  const stops = generatedItinerary.items;
  const currentStop = stops[activeStopIndex] || stops[0];
  const isLastStop = activeStopIndex === stops.length - 1;

  function handleCheckIn() {
    const expense = expenseInput ? parseFloat(expenseInput) : currentStop.price;
    completeExperience(currentStop.id, selectedRating, reviewNote, expense);

    if (isLastStop) {
      router.push('/trips/complete');
    } else {
      setActiveStopIndex((prev) => prev + 1);
      setExpenseInput('');
      setReviewNote('');
    }
  }

  function handleBookRideToCurrent() {
    setLocations({
      pickup: 'Current Location',
      drop: `${currentStop.experienceName}, ${currentStop.location}`,
      dropLat: currentStop.latitude ?? undefined,
      dropLng: currentStop.longitude ?? undefined,
    });
    router.push('/rides/book');
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Live Mode</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Live Trip Mode Active
          </span>
        </div>
      </div>

      {/* Current Stop Hero Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-floating space-y-5">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-extrabold">
            Stop {activeStopIndex + 1} of {stops.length}
          </span>
          <span className="text-xs font-bold text-ink-secondary dark:text-slate-400">
            {currentStop.timeWindow || `${currentStop.startTime} - ${currentStop.endTime}`}
          </span>
        </div>

        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-soft">
          <Image
            src={currentStop.image || '/assets/images/destinations/food_trail.png'}
            alt={currentStop.experienceName}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent pointer-events-none" />

          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
              {currentStop.category}
            </span>
            <h2 className="font-display font-extrabold text-xl sm:text-2xl mt-1 leading-tight">
              {currentStop.experienceName}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-white/80 mt-1">
              <MapPin className="w-3.5 h-3.5 text-primary-light" />
              <span>{currentStop.location}</span>
            </div>
          </div>
        </div>

        {/* Guidance & Quick Ride Action */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted dark:bg-slate-700/60">
          <div>
            <span className="text-xs font-bold text-[#1A1A1A] dark:text-white block">
              Estimated Transit: ~{currentStop.distanceKm} km
            </span>
            <span className="text-[11px] text-ink-secondary dark:text-slate-400">
              Need transport from current spot?
            </span>
          </div>
          <button
            onClick={handleBookRideToCurrent}
            className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <Car className="w-4 h-4" />
            <span>Book Lens Ride</span>
          </button>
        </div>

        {/* Check-In & Expense Logging Box */}
        <div className="pt-3 border-t border-[#EAE8E3] dark:border-slate-700 space-y-4">
          <h4 className="font-display font-bold text-sm text-[#1A1A1A] dark:text-white">
            Arrival Check-In & Expense Tracking
          </h4>

          {/* Actual Expense Field */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary dark:text-slate-400 block mb-1.5">
              Actual Amount Spent (₹ INR)
            </label>
            <div className="relative">
              <IndianRupee className="w-4 h-4 text-primary absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                value={expenseInput}
                onChange={(e) => setExpenseInput(e.target.value)}
                placeholder={`Planned: ₹${currentStop.price}`}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-muted dark:bg-slate-700 border-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold text-[#1A1A1A] dark:text-white"
              />
            </div>
          </div>

          {/* Quick Rating Stars */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary dark:text-slate-400 block mb-1.5">
              Rate Your Experience
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  className="p-1 text-2xl transition-transform active:scale-125"
                >
                  <Star
                    className={`w-6 h-6 ${
                      star <= selectedRating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300 dark:text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Review Note */}
          <div>
            <label className="text-xs font-semibold text-ink-secondary dark:text-slate-400 block mb-1.5">
              Traveler Notes & Memories
            </label>
            <input
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="e.g. Incredible spicy misal! Best cutting chai nearby."
              className="w-full h-11 px-4 rounded-xl bg-surface-muted dark:bg-slate-700 border-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs sm:text-sm font-medium text-[#1A1A1A] dark:text-white"
            />
          </div>

          {/* Check-In CTA Button */}
          <button
            onClick={handleCheckIn}
            className="w-full h-13 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-floating flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isLastStop ? 'Complete Adventure 🎉' : 'Check In & Next Stop'}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Up Next Stops Preview List */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary dark:text-slate-400">
          Upcoming Stops on This Journey
        </h4>
        <div className="space-y-2">
          {stops.map((stop, i) => {
            const isDone = stop.isCompleted;
            const isCurrent = i === activeStopIndex;

            return (
              <div
                key={stop.id}
                onClick={() => setActiveStopIndex(i)}
                className={`p-3 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary-soft dark:bg-primary/10 shadow-sm'
                    : isDone
                    ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-500/5'
                    : 'border-[#EAE8E3] dark:border-slate-700 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      isDone
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-primary text-white'
                        : 'bg-black/10 dark:bg-white/10 text-ink-secondary'
                    }`}
                  >
                    {isDone ? '✓' : i + 1}
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-white">
                      {stop.experienceName}
                    </h5>
                    <span className="text-[11px] text-ink-secondary dark:text-slate-400">
                      {stop.timeWindow || `${stop.startTime} - ${stop.endTime}`} • ₹{stop.price}
                    </span>
                  </div>
                </div>

                {isCurrent && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary text-white">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
