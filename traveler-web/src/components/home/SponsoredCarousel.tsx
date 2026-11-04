'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { SponsoredExperience } from '@/types';
import { Star, ShieldCheck, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const SPONSORED_DATA: SponsoredExperience[] = [
  {
    id: 'spon-01',
    campaignId: 'camp-kashid-01',
    title: 'Kashid Watersports & Parasailing Adventure',
    category: 'Adventure',
    tagline: 'Flat 20% off on Jet Ski & Banana Rides today',
    description: 'Certified PADI instructors with state-of-the-art life safety gear along pristine white sands.',
    imageUrl: '/assets/images/destinations/beach_cafe.png',
    rating: 4.9,
    priceInr: 650,
    originalPriceInr: 850,
    badgeText: 'Featured Partner',
    location: 'Kashid Coastal Strip, Alibaug',
    ctaText: 'View Package',
    deeplink: '/experience/EXP-BEACH-001',
  },
  {
    id: 'spon-02',
    campaignId: 'camp-food-01',
    title: 'Heritage Royal Seafood Thali Tasting',
    category: 'Food',
    tagline: 'Authentic 12-course regional feast with local chef',
    description: 'Fresh catch cooked in cold-pressed coconut oil, stone-ground Konkan masalas, and freshly made bhakri.',
    imageUrl: '/assets/images/destinations/food_trail.png',
    rating: 4.8,
    priceInr: 550,
    originalPriceInr: 700,
    badgeText: 'Top Rated Culinary',
    location: 'Old Port Quarter, Mumbai',
    ctaText: 'Reserve Table',
    deeplink: '/experience/EXP-FOOD-002',
  },
  {
    id: 'spon-03',
    campaignId: 'camp-hike-01',
    title: 'Kharghar Valley Sunset Trek & Tea Ceremony',
    category: 'Nature',
    tagline: 'Secret cliffside viewpoints & artisan herbal chai',
    description: 'Guided gentle hike through lush hills with panoramic valley sunset viewpoints and acoustic sitar.',
    imageUrl: '/assets/images/destinations/waterfall.png',
    rating: 4.9,
    priceInr: 350,
    originalPriceInr: 450,
    badgeText: 'Verified Experience',
    location: 'Kharghar Hills, Navi Mumbai',
    ctaText: 'Join Trek',
    deeplink: '/experience/EXP-NAT-001',
  },
];

export function SponsoredCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SPONSORED_DATA.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const current = SPONSORED_DATA[currentIndex];

  return (
    <div className="relative w-full rounded-3xl overflow-hidden shadow-soft border border-[#EAE8E3] dark:border-slate-800 bg-white dark:bg-slate-800/80">
      <div className="relative aspect-[16/8] sm:aspect-[21/9] md:aspect-[24/9] w-full overflow-hidden">
        <Image
          src={current.imageUrl}
          alt={current.title}
          fill
          className="object-cover transition-transform duration-700 hover:scale-105"
          sizes="(max-width: 768px) 100vw, 1200px"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />

        {/* Sponsor Badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[11px] font-bold text-primary flex items-center gap-1 shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            {current.badgeText}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-semibold text-white">
            Sponsored
          </span>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-4 left-4 right-4 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>{current.rating}</span>
            <span className="text-white/60">•</span>
            <span className="text-white/80">{current.location}</span>
          </div>

          <h3 className="font-display text-lg sm:text-2xl font-bold mt-1 text-white leading-tight">
            {current.title}
          </h3>
          <p className="text-xs sm:text-sm text-white/80 mt-1 line-clamp-1 max-w-xl">
            {current.tagline}
          </p>

          <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/20">
            <div className="flex items-baseline gap-2">
              <span className="text-lg sm:text-xl font-black text-white">₹{current.priceInr}</span>
              {current.originalPriceInr && (
                <span className="text-xs text-white/50 line-through">₹{current.originalPriceInr}</span>
              )}
              <span className="text-[11px] text-white/70">/ person</span>
            </div>

            <Link
              href={current.deeplink}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
            >
              <span>{current.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Carousel Dots */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
          {SPONSORED_DATA.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                currentIndex === i ? 'w-5 bg-primary' : 'w-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
