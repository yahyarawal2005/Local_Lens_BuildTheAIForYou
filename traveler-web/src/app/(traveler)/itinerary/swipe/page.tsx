'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useItinerary } from '@/context/ItineraryContext';
import { RecommendationModel } from '@/types';
import {
  Heart,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Clock,
  MapPin,
  Check,
} from 'lucide-react';

export default function RecommendationSwipePage() {
  const router = useRouter();
  const {
    recommendations,
    selectedPlaces,
    setSelectedPlaces,
    desiredExperienceCount,
  } = useItinerary();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [history, setHistory] = useState<Array<{ item: RecommendationModel; action: 'kept' | 'skipped' }>>([]);

  const currentItem = recommendations[currentIndex];
  const targetCount = desiredExperienceCount > 0 ? desiredExperienceCount : 4;
  const isTargetReached = selectedPlaces.length >= targetCount;

  function handleKeep() {
    if (!currentItem) return;
    const nextSelected = [...selectedPlaces, currentItem];
    setSelectedPlaces(nextSelected);
    setHistory([...history, { item: currentItem, action: 'kept' }]);
    setCurrentIndex((prev) => prev + 1);
  }

  function handleSkip() {
    if (!currentItem) return;
    setHistory([...history, { item: currentItem, action: 'skipped' }]);
    setCurrentIndex((prev) => prev + 1);
  }

  function handleUndo() {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setCurrentIndex((prev) => Math.max(0, prev - 1));
    if (last.action === 'kept') {
      setSelectedPlaces(selectedPlaces.filter((p) => p.experienceId !== last.item.experienceId));
    }
  }

  function handleProceed() {
    router.push('/itinerary/generating');
  }

  return (
    <div className="max-w-md mx-auto space-y-5 pb-12 animate-in fade-in duration-300">
      {/* Header & Target Progress Counter */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-primary uppercase tracking-wider block">
            Step 2 of 3: Swipe & Choose
          </span>
          <h1 className="font-display font-extrabold text-xl text-[#1A1A1A] dark:text-white">
            Pick Your Favorite Stops
          </h1>
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-soft dark:bg-primary/20 text-primary font-bold text-xs shadow-sm">
          <Check className="w-4 h-4" />
          <span>
            {selectedPlaces.length} / {targetCount} Selected
          </span>
        </div>
      </div>

      {/* Swipe Stack Card */}
      {currentItem ? (
        <div className="relative aspect-[3/4] w-full rounded-3xl overflow-hidden shadow-floating border border-[#EAE8E3] dark:border-slate-700 bg-white dark:bg-slate-800 transition-all">
          <Image
            src={currentItem.image || '/assets/images/destinations/food_trail.png'}
            alt={currentItem.name}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent pointer-events-none" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-bold text-primary shadow-sm">
              {currentItem.category}
            </span>
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full text-white text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" />
              <span>{currentItem.durationHours}h</span>
            </div>
          </div>

          {/* Bottom Card Content */}
          <div className="absolute bottom-5 left-5 right-5 text-white">
            <div className="flex items-center gap-1 text-xs text-white/80 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary-light" />
              <span>{currentItem.location}</span>
            </div>

            <h3 className="font-display font-extrabold text-2xl text-white leading-tight">
              {currentItem.name}
            </h3>

            <p className="text-xs text-white/85 mt-2 line-clamp-2 leading-relaxed">
              {currentItem.reason}
            </p>

            <div className="mt-3 pt-2.5 border-t border-white/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-white/60 uppercase font-bold block">Estimated Cost</span>
                <span className="font-display font-extrabold text-xl text-white">₹{currentItem.price}</span>
              </div>

              <div className="flex items-center gap-1 text-amber-300 font-bold text-sm bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                <span>★</span>
                <span>{currentItem.rating ?? 4.8}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-[3/4] rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-soft dark:bg-primary/20 text-primary flex items-center justify-center mb-3">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="font-display font-bold text-xl text-[#1A1A1A] dark:text-white">
            You've Reviewed All Recommendations!
          </h3>
          <p className="text-xs text-ink-secondary dark:text-slate-400 mt-1 max-w-xs">
            {selectedPlaces.length} great experiences selected. Proceed to synthesize your chronological itinerary!
          </p>
        </div>
      )}

      {/* Swipe Controls Deck */}
      <div className="flex items-center justify-center gap-5 pt-1">
        <button
          onClick={handleUndo}
          disabled={history.length === 0}
          className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-sm flex items-center justify-center text-ink-secondary hover:text-ink disabled:opacity-30 active:scale-90 transition-all"
          title="Undo last swipe"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={handleSkip}
          disabled={!currentItem}
          className="w-16 h-16 rounded-full bg-white dark:bg-slate-800 border border-red-200 dark:border-red-900 shadow-soft flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950 active:scale-90 transition-all disabled:opacity-40"
          title="Skip experience"
        >
          <X className="w-7 h-7" />
        </button>

        <button
          onClick={handleKeep}
          disabled={!currentItem}
          className="w-16 h-16 rounded-full bg-primary text-white shadow-floating flex items-center justify-center hover:bg-primary-dark active:scale-90 transition-all disabled:opacity-40"
          title="Keep experience"
        >
          <Heart className="w-7 h-7 fill-white" />
        </button>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleProceed}
        disabled={selectedPlaces.length === 0}
        className={`w-full h-14 rounded-2xl font-bold text-sm shadow-floating flex items-center justify-center gap-2 active:scale-98 transition-all ${
          isTargetReached
            ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
            : 'bg-primary hover:bg-primary-dark text-white disabled:opacity-40'
        }`}
      >
        <span>Synthesize My Itinerary</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}
