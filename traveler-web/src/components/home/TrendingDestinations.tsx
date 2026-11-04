'use client';

import React from 'react';
import Image from 'next/image';
import { useItinerary } from '@/context/ItineraryContext';
import { MapPin, Compass, ArrowRight, Sparkles } from 'lucide-react';

interface DestinationCard {
  name: string;
  landmark: string;
  tagline: string;
  state: string;
  imageUrl: string;
  highlights: string;
  badge?: string;
}

const TRENDING_HUBS: DestinationCard[] = [
  {
    name: 'Mumbai',
    landmark: 'Gateway of India',
    tagline: 'Colonial Majesty & Gateway of India Waterfront',
    state: 'Maharashtra',
    imageUrl: '/assets/images/destinations/mumbai_gateway_of_india.jpg',
    highlights: 'Gateway of India, Marine Drive, Colaba Causeway',
    badge: 'Gateway of India',
  },
  {
    name: 'Pune',
    landmark: 'Shaniwar Wada',
    tagline: 'Historic 1732 Peshwa Fortification & Maratha Glory',
    state: 'Maharashtra',
    imageUrl: '/assets/images/destinations/pune_shaniwar_wada.jpg',
    highlights: 'Shaniwar Wada, Sinhagad Fort, Camp Bakeries',
    badge: 'Shaniwar Wada',
  },
  {
    name: 'Jaipur',
    landmark: 'Hawa Mahal',
    tagline: 'Palace of Winds & 953 Jharokha Honeycomb Facade',
    state: 'Rajasthan',
    imageUrl: '/assets/images/destinations/jaipur_hawa_mahal.jpg',
    highlights: 'Hawa Mahal, Amer Fort, Johari Pink Bazaar',
    badge: 'Hawa Mahal',
  },
  {
    name: 'Delhi',
    landmark: 'India Gate',
    tagline: 'Iconic 42-meter National War Memorial Arch & Lawns',
    state: 'NCR',
    imageUrl: '/assets/images/destinations/delhi_india_gate.jpg',
    highlights: 'India Gate, Kartavya Path, Red Fort, Chandni Chowk',
    badge: 'India Gate',
  },
  {
    name: 'Alibaug',
    landmark: 'Kolaba Sea Fort',
    tagline: '17th Century Shivaji Maharaj Marine Fort in the Waves',
    state: 'Maharashtra',
    imageUrl: '/assets/images/destinations/alibaug_kolaba_fort.jpg',
    highlights: 'Kolaba Fort, Kashid White Sands, Konkan Seafood',
    badge: 'Kolaba Fort',
  },
  {
    name: 'Goa',
    landmark: 'Anjuna Coast',
    tagline: 'Sun-drenched Coastlines & Portuguese Heritage Mansions',
    state: 'Goa',
    imageUrl: '/assets/images/destinations/beach_cafe.png',
    highlights: 'Anjuna Beach, Chapora Fort, Beach Shacks',
    badge: 'Coastal Hub',
  },
];

interface TrendingDestinationsProps {
  onSelectDestination: (destName: string) => void;
}

export function TrendingDestinations({ onSelectDestination }: TrendingDestinationsProps) {
  const { destination, setDestination } = useItinerary();

  function handleSelect(name: string) {
    setDestination(name);
    onSelectDestination(name);
  }

  return (
    <section className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-[#EAE8E3] dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary-soft dark:bg-primary/20 text-primary text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Iconic Hubs</span>
            </span>
          </div>
          <h2 className="font-display font-extrabold text-xl sm:text-2xl lg:text-3xl tracking-tight text-[#1A1A1A] dark:text-white">
            Trending Travel Destinations
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1">
            Curated travel destinations with rich collections of verified experiences and scenic routes.
          </p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {TRENDING_HUBS.map((hub) => {
          const isCurrent = destination.toLowerCase() === hub.name.toLowerCase();

          return (
            <div
              key={hub.name}
              onClick={() => handleSelect(hub.name)}
              className={`group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 border ${
                isCurrent
                  ? 'ring-2 ring-primary border-primary shadow-floating scale-[1.01]'
                  : 'border-[#EAE8E3] dark:border-slate-800 shadow-soft hover:shadow-floating hover:border-primary/40'
              } bg-white dark:bg-slate-800`}
            >
              {/* Photo */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                <Image
                  src={hub.imageUrl}
                  alt={hub.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />

                {/* Badge */}
                {hub.badge && (
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider">
                      {hub.badge}
                    </span>
                  </div>
                )}

                {/* Active Indicator */}
                {isCurrent && (
                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-primary text-white text-[10px] font-extrabold shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    <span>Selected Hub</span>
                  </div>
                )}

                {/* Bottom text overlay */}
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-semibold mb-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{hub.state}</span>
                  </div>
                  <h3 className="font-display font-extrabold text-xl text-white">
                    {hub.name}
                  </h3>
                  <p className="text-xs text-slate-200/90 line-clamp-1 mt-0.5 font-medium">
                    {hub.tagline}
                  </p>
                </div>
              </div>

              {/* Highlights bar */}
              <div className="p-3.5 flex items-center justify-between text-xs text-ink-secondary dark:text-slate-300">
                <span className="line-clamp-1 font-medium text-[11px]">
                  ✨ {hub.highlights}
                </span>
                <span className="text-primary font-bold flex items-center gap-1 shrink-0 ml-2 group-hover:translate-x-1 transition-transform">
                  <span>Explore</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
