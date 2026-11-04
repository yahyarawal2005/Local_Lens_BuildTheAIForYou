'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useItinerary } from '@/context/ItineraryContext';
import { Sparkles, Trophy, CheckCircle2, ArrowRight, Share2, Home } from 'lucide-react';

export default function AdventureCompletePage() {
  const { generatedItinerary } = useItinerary();

  useEffect(() => {
    // Fire festive celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#E85028', '#5A7363', '#D4A373', '#FFD700'],
      });
    } catch {}
  }, []);

  const totalSpent = generatedItinerary
    ? generatedItinerary.items.reduce((acc, i) => acc + (i.actualExpense ?? i.price), 0)
    : 1850;

  const totalStops = generatedItinerary?.items.length || 4;

  return (
    <div className="max-w-md mx-auto text-center space-y-6 pb-20 pt-4 animate-in zoom-in-95 duration-500">
      {/* Celebration Trophy & Illustration */}
      <div className="relative w-44 h-44 mx-auto">
        <Image
          src="/assets/images/illustrations/adventure_complete.png"
          alt="Adventure Complete Illustration"
          fill
          className="object-contain"
          priority
        />
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-extrabold text-xs mb-2">
          <Trophy className="w-4 h-4 text-emerald-500" />
          <span>Adventure Complete!</span>
        </div>
        <h1 className="font-display font-black text-2xl sm:text-3xl text-[#1A1A1A] dark:text-white">
          Journey Well Traveled 🎉
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1 max-w-xs mx-auto">
          You experienced the true soul of {generatedItinerary?.destination || 'Mumbai'} like an authentic local!
        </p>
      </div>

      {/* Recap Stats Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-floating grid grid-cols-2 gap-4 text-left">
        <div>
          <span className="text-[11px] font-bold text-ink-secondary dark:text-slate-400 block uppercase">
            Places Explored
          </span>
          <span className="font-display font-extrabold text-2xl text-[#1A1A1A] dark:text-white mt-0.5 block">
            {totalStops} Stops
          </span>
        </div>

        <div>
          <span className="text-[11px] font-bold text-ink-secondary dark:text-slate-400 block uppercase">
            Total Spent
          </span>
          <span className="font-display font-extrabold text-2xl text-primary mt-0.5 block">
            ₹{totalSpent}
          </span>
        </div>

        <div className="col-span-2 pt-3 border-t border-[#EAE8E3] dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <span className="text-xs font-bold text-[#1A1A1A] dark:text-white block">
                Badge Unlocked: Cultured Wanderer 🏅
              </span>
              <span className="text-[11px] text-ink-secondary dark:text-slate-400">
                Completed {totalStops} curated cultural & local stops.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Link
          href="/home"
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-soft flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: 'LocalLens Adventure Complete',
                text: `I just finished exploring ${totalStops} stops in ${
                  generatedItinerary?.destination || 'Mumbai'
                } with LocalLens!`,
                url: window.location.origin,
              });
            }
          }}
          className="w-full h-12 rounded-2xl bg-surface-muted dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 text-[#1A1A1A] dark:text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <Share2 className="w-4 h-4" />
          <span>Share Adventure Recap</span>
        </button>
      </div>
    </div>
  );
}
