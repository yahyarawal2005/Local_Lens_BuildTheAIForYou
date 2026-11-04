'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Compass, Sparkles, ArrowRight, ShieldCheck, Heart, MapPin } from 'lucide-react';

interface InspirationStory {
  id: string;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  imageUrl: string;
  category: string;
  targetHref: string;
}

const INSPIRATION_STORIES: InspirationStory[] = [
  {
    id: 'inspire-01',
    badge: 'Hidden Gems Worth Exploring',
    title: 'Secret Stepwells & Forgotten Fortresses',
    tagline: 'Centuries of Stonecraft Away from Crowds',
    description:
      'Step beyond the usual tourist trail into serene stepwells, secluded ramparts with panoramic mountain winds, and peaceful archaeological sanctuaries.',
    imageUrl: '/assets/images/destinations/heritage_walk.png',
    category: 'Heritage',
    targetHref: '/explore?cat=Heritage',
  },
  {
    id: 'inspire-02',
    badge: 'Weekend Escapes',
    title: 'Coastal Shacks & Sunset Watersports',
    tagline: 'Golden Sands, Sea Breeze & Konkan Spices',
    description:
      'Recharge your soul along pristine coastlines. Indulge in wood-fired coastal thalis, parasailing over turquoise waters, and stargazing by the waves.',
    imageUrl: '/assets/images/destinations/sunset_coast.png',
    category: 'Beach',
    targetHref: '/explore?cat=Beach',
  },
  {
    id: 'inspire-03',
    badge: 'Explore Local Culture',
    title: 'Artisan Culinary Trails & Street Secrets',
    tagline: 'Taste Decades of Culinary Traditions',
    description:
      'From aromatic clay-pot chai to 100-year-old family mithai shops and sizzling midnight street kebabs, experience the true gastronomic pulse of the city.',
    imageUrl: '/assets/images/destinations/food_trail.png',
    category: 'Food',
    targetHref: '/explore?cat=Food',
  },
];

export function TravelInspiration() {
  return (
    <section className="space-y-6 pt-4">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#EAE8E3] dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Traveler Editorial</span>
            </span>
          </div>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight text-[#1A1A1A] dark:text-white">
            Travel Inspiration & Stories
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1">
            Curated journeys and cultural highlights to inspire your next weekend adventure.
          </p>
        </div>

        <Link
          href="/itinerary/create"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dark transition-colors self-start sm:self-auto"
        >
          <span>Create Custom Journey</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {INSPIRATION_STORIES.map((story) => (
          <div
            key={story.id}
            className="group flex flex-col rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft hover:shadow-floating transition-all duration-300"
          >
            {/* Image Banner */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
              <Image
                src={story.imageUrl}
                alt={story.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[10px] font-extrabold text-primary uppercase tracking-wider shadow-sm">
                  {story.badge}
                </span>
              </div>

              <div className="absolute bottom-3 left-3 right-3 text-white">
                <span className="text-[11px] font-semibold text-amber-300">
                  {story.tagline}
                </span>
                <h3 className="font-display font-extrabold text-lg text-white mt-0.5 leading-snug">
                  {story.title}
                </h3>
              </div>
            </div>

            {/* Description & Link */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
              <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-300 leading-relaxed">
                {story.description}
              </p>

              <Link
                href={story.targetHref}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:text-primary-dark pt-2 border-t border-[#EAE8E3] dark:border-slate-700/60"
              >
                <span>Explore {story.category} Experiences</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
