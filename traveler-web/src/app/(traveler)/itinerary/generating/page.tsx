'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useItinerary } from '@/context/ItineraryContext';
import { Sparkles, CheckCircle2, Loader2, Navigation } from 'lucide-react';

export default function ItineraryGeneratingPage() {
  const router = useRouter();
  const { generateFinalItinerary, destination } = useItinerary();

  const stages = [
    'Analyzing traveler group & budget constraints...',
    `Checking live weather conditions in ${destination}...`,
    'Optimizing transit sequence for minimum travel time...',
    'Synchronizing entry timings and local opening hours...',
    'Synthesizing your personalized itinerary...',
  ];

  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function runGeneration() {
      interval = setInterval(() => {
        setCurrentStage((prev) => {
          if (prev < stages.length - 1) return prev + 1;
          return prev;
        });
      }, 700);

      try {
        const itin = await generateFinalItinerary();
        setTimeout(() => {
          router.push(`/itinerary/${itin.id}`);
        }, 1200);
      } catch {
        setTimeout(() => {
          router.push('/trips');
        }, 1200);
      }
    }

    runGeneration();

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
      {/* Animated Glowing AI Spinner Icon */}
      <div className="relative w-28 h-28 mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-primary to-amber-500 flex items-center justify-center text-white shadow-floating">
          <Sparkles className="w-12 h-12 animate-pulse" />
        </div>
      </div>

      <span className="text-xs font-bold text-primary uppercase tracking-widest block mb-1">
        LocalLens AI Synthesizer
      </span>
      <h2 className="font-display font-extrabold text-2xl text-[#1A1A1A] dark:text-white">
        Crafting Your Perfect Journey
      </h2>
      <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1 max-w-xs">
        Synthesizing stops, pricing in ₹ INR, and optimal transit routes in {destination}...
      </p>

      {/* Progress Stages Checklist */}
      <div className="w-full mt-8 p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft text-left space-y-3.5">
        {stages.map((stage, idx) => {
          const isDone = idx < currentStage;
          const isCurrent = idx === currentStage;

          return (
            <div key={idx} className="flex items-center gap-3">
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : isCurrent ? (
                <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
              ) : (
                <div className="w-5 h-5 rounded-full border border-black/20 dark:border-white/20 shrink-0" />
              )}
              <span
                className={`text-xs font-semibold ${
                  isDone
                    ? 'text-[#1A1A1A] dark:text-white'
                    : isCurrent
                    ? 'text-primary font-bold'
                    : 'text-ink-muted dark:text-slate-400'
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
