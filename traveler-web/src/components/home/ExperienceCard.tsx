'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RecommendationModel } from '@/types';
import { useItinerary } from '@/context/ItineraryContext';
import { useRide } from '@/context/RideContext';
import { Star, Clock, MapPin, Heart, Car, Plus, Check, ShieldCheck, Image as ImageIcon } from 'lucide-react';

interface ExperienceCardProps {
  experience: RecommendationModel;
}

export function ExperienceCard({ experience }: ExperienceCardProps) {
  const router = useRouter();
  const { wishlist, toggleWishlist, selectedExperienceIds, toggleExperienceSelection } = useItinerary();
  const { setLocations } = useRide();
  const [imgError, setImgError] = useState(false);

  const isSaved = wishlist.includes(experience.experienceId);
  const isSelectedForTrip = selectedExperienceIds.includes(experience.experienceId);

  // Determine actual image source
  const rawImage = experience.imageUrl || experience.image || '';
  const isExternal = rawImage.startsWith('http://') || rawImage.startsWith('https://');
  const hasValidImage = Boolean(rawImage && rawImage.trim().length > 0 && !imgError);

  function handleBookRide(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setLocations({
      pickup: 'My Current Location',
      drop: `${experience.name}, ${experience.location}`,
      dropLat: experience.latitude ?? undefined,
      dropLng: experience.longitude ?? undefined,
    });
    router.push('/rides/book');
  }

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-[#EAE8E3] dark:border-slate-700 shadow-soft hover:shadow-floating transition-all duration-300">
      {/* Top Image & Visual Badges */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
        <Link href={`/experience/${experience.experienceId}`} className="block w-full h-full relative">
          {hasValidImage ? (
            <Image
              src={rawImage}
              alt={experience.name}
              fill
              unoptimized={isExternal}
              onError={() => setImgError(true)}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-400 p-4 text-center">
              <ImageIcon className="w-10 h-10 mb-2 opacity-40 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{experience.name}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Authentic Experience</span>
            </div>
          )}
        </Link>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Category & Verification Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-[11px] font-bold text-primary shadow-sm">
            {experience.category}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/95 text-white backdrop-blur-md text-[10px] font-bold shadow-sm">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified Photo</span>
          </span>
          {experience.hiddenGem && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/90 text-white backdrop-blur-md text-[10px] font-bold shadow-sm">
              Hidden Gem
            </span>
          )}
        </div>

        {/* Wishlist Bookmark Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(experience.experienceId);
          }}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/85 dark:bg-slate-900/85 backdrop-blur-md flex items-center justify-center text-ink hover:text-red-500 transition-all active:scale-90 shadow-sm"
          title={isSaved ? 'Remove from Saved' : 'Save to Wishlist'}
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-ink-secondary'}`} />
        </button>

        {/* Bottom metrics on image */}
        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white text-xs font-semibold pointer-events-none">
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{experience.rating ?? 4.8}</span>
            <span className="text-white/60">({experience.reviewCount ?? 120})</span>
          </div>

          <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3 text-white/80" />
            <span>{experience.durationHours}h</span>
          </div>
        </div>
      </div>

      {/* Body Information */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1 text-xs text-ink-secondary dark:text-slate-400 mb-1">
            <MapPin className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate">{experience.location}</span>
          </div>

          <Link href={`/experience/${experience.experienceId}`} className="block group-hover:text-primary transition-colors">
            <h4 className="font-display font-bold text-base sm:text-lg leading-snug line-clamp-1">
              {experience.name}
            </h4>
          </Link>

          <p className="text-xs text-ink-secondary dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {experience.reason}
          </p>
        </div>

        {/* Pricing & Actions Deck */}
        <div className="mt-4 pt-3 border-t border-[#EAE8E3] dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-muted dark:text-slate-400 block">
              Starting from
            </span>
            <span className="font-display font-extrabold text-lg sm:text-xl text-[#1A1A1A] dark:text-white">
              ₹{experience.price}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleBookRide}
              className="p-2.5 rounded-xl bg-surface-muted dark:bg-slate-700 hover:bg-primary-soft dark:hover:bg-primary/20 text-ink dark:text-white hover:text-primary transition-all active:scale-95"
              title="Book Lens Ride to this place"
            >
              <Car className="w-4 h-4" />
            </button>

            <button
              onClick={(e) => {
                e.preventDefault();
                toggleExperienceSelection(experience.experienceId);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all active:scale-95 ${
                isSelectedForTrip
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary text-white hover:bg-primary-dark shadow-sm'
              }`}
            >
              {isSelectedForTrip ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Trip</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
