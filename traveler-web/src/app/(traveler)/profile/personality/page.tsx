'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Compass, Utensils, Landmark, Sparkles, CheckCircle2, ChevronRight } from 'lucide-react';

export default function TravelPersonalityPage() {
  const styleCards = [
    {
      title: 'Offbeat Gems',
      image: '/assets/images/characters/brand_characters.png',
      subtitle: 'Secret forts & coastal ruins',
    },
    {
      title: 'Local Food',
      image: '/assets/images/destinations/food_trail.png',
      subtitle: 'Misal, chai & authentic stalls',
    },
    {
      title: 'Culture Walks',
      image: '/assets/images/destinations/sunset_coast.png',
      subtitle: 'Stories, artisans & heritage alleys',
    },
  ];

  const traits = [
    { label: 'Local Food Enthusiast', icon: Utensils },
    { label: 'Hidden Gems Seeker', icon: Compass },
    { label: 'Cultural Historian', icon: Landmark },
  ];

  const travelPrinciples = [
    {
      title: 'Heritage Over Hyper-Tourism',
      desc: 'You prefer winding village alleys, authentic dhabas, and forgotten stepwells over commercial gift shops and overcrowded viewpoints.',
    },
    {
      title: 'Culinary Authenticity',
      desc: 'Your journey revolves around where the locals eat breakfast, savor regional spice blends, and drink slow-simmered filter coffee.',
    },
    {
      title: 'Empathetic Footprint',
      desc: 'You believe in fair compensation for local rickshaw pilots, artisan weavers, and family-run heritage home-stays.',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Top Back Navigation */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profile"
          className="p-2 rounded-xl bg-surface-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-ink-primary dark:text-white" />
        </Link>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
            Archetype Analysis
          </span>
          <h1 className="font-display font-bold text-xl text-[#1A1A1A] dark:text-white">
            Travel Personality
          </h1>
        </div>
      </div>

      {/* Main Archetype Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-card border border-[#EAE8E3] dark:border-slate-800 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          Your Curated Travel Style
        </span>

        <h2 className="font-display font-extrabold text-3xl sm:text-4xl text-[#5A7363] dark:text-emerald-400 tracking-tight">
          THE CURIOUS EXPLORER
        </h2>

        <p className="mt-2 text-sm sm:text-base text-ink-secondary dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          You thrive on discovering real places, authentic regional food, and untold local folklore rather than commercial tourist itineraries.
        </p>

        {/* 3 Illustrated Style Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {styleCards.map((card) => (
            <div
              key={card.title}
              className="relative h-44 rounded-2xl overflow-hidden group shadow-card border border-[#EAE8E3] dark:border-slate-700"
            >
              <Image
                src={card.image}
                alt={card.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 text-left text-white">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary-soft block">
                  Signature Style
                </span>
                <h4 className="font-display font-bold text-base leading-tight">
                  {card.title}
                </h4>
                <p className="text-[11px] text-white/80 line-clamp-1 mt-0.5">
                  {card.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Trait Pills */}
        <div className="flex flex-wrap gap-2.5 justify-center mt-6">
          {traits.map((trait) => {
            const Icon = trait.icon;
            return (
              <span
                key={trait.label}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#5A7363]/10 dark:bg-emerald-950/40 text-[#5A7363] dark:text-emerald-300 text-xs font-bold border border-[#5A7363]/20"
              >
                <Icon className="w-3.5 h-3.5" />
                {trait.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Deep-Dive Principles Section */}
      <div className="mt-8 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-card border border-[#EAE8E3] dark:border-slate-800">
        <h3 className="font-display font-bold text-lg text-[#1A1A1A] dark:text-white mb-4">
          How LocalLens Adapts To Your Style
        </h3>

        <div className="space-y-4">
          {travelPrinciples.map((item, idx) => (
            <div
              key={item.title}
              className="p-4 rounded-2xl bg-[#FAF9F6] dark:bg-slate-800/60 border border-[#EAE8E3] dark:border-slate-700 flex items-start gap-3.5"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                  {idx + 1}. {item.title}
                </h4>
                <p className="text-xs text-ink-secondary dark:text-slate-300 mt-1 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/itinerary/create"
            className="flex-1 py-3.5 px-6 rounded-2xl bg-primary hover:bg-[#D44018] text-white font-bold text-sm text-center shadow-soft transition-all flex items-center justify-center gap-2"
          >
            <span>Plan Itinerary Matching My Style</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
          <Link
            href="/profile"
            className="py-3.5 px-6 rounded-2xl bg-surface-muted hover:bg-black/5 dark:hover:bg-white/10 text-ink-primary dark:text-white font-bold text-sm text-center transition-all"
          >
            Back to Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
