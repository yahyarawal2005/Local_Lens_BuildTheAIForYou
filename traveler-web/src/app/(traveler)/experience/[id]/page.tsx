'use client';

import React, { use, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useItinerary } from '@/context/ItineraryContext';
import { useRide } from '@/context/RideContext';
import { useTheme } from '@/context/ThemeContext';
import {
  VerifiedExperienceService,
  VerifiedExperienceRecord,
} from '@/lib/verifiedExperienceService';
import { RecommendationModel } from '@/types';
import {
  ArrowLeft,
  Heart,
  Star,
  Clock,
  MapPin,
  Car,
  Plus,
  Check,
  ShieldCheck,
  Share2,
  Calendar,
  Sparkles,
  Users,
  Compass,
  AlertCircle,
  RotateCw,
  ExternalLink,
  Sun,
  CloudRain,
  Tag,
  CheckCircle2,
} from 'lucide-react';

const InteractiveMap = dynamic(
  () => import('@/components/maps/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false, loading: () => <div className="h-64 w-full rounded-2xl bg-black/5 animate-pulse" /> }
);

export default function ExperienceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { recommendations, wishlist, toggleWishlist, selectedExperienceIds, toggleExperienceSelection } =
    useItinerary();
  const { setLocations } = useRide();
  const { weather, isStormy } = useTheme();

  const id = resolvedParams.id;

  // Search memory first
  const memoryExperience =
    recommendations.find((r) => r.experienceId === id || r.experienceId.includes(id)) || null;

  const [experience, setExperience] = useState<RecommendationModel | null>(memoryExperience);
  const [dbRecord, setDbRecord] = useState<VerifiedExperienceRecord | null>(null);
  const [nearbyExperiences, setNearbyExperiences] = useState<RecommendationModel[]>([]);
  const [isLoading, setIsLoading] = useState(!memoryExperience);
  const [copiedShare, setCopiedShare] = useState(false);

  // If not found in context, fetch directly from Supabase
  useEffect(() => {
    async function loadFromDb() {
      if (!id) return;
      setIsLoading(true);
      try {
        const { record, recommendation } = await VerifiedExperienceService.getExperienceById(id);
        if (recommendation) {
          setExperience(recommendation);
        }
        if (record) {
          setDbRecord(record);
          // Also fetch nearby experiences in the same city or category
          const nearbyRes = await VerifiedExperienceService.getVerifiedExperiences({
            pageSize: 3,
            destination: record.city || undefined,
            category: record.category !== 'General' ? record.category : undefined,
          });
          const filtered = nearbyRes.recommendations.filter((r) => r.experienceId !== id);
          setNearbyExperiences(filtered.slice(0, 3));
        }
      } catch (err) {
        console.error('Failed to load experience details:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadFromDb();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-24 text-center space-y-4">
        <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-sm font-semibold text-ink-secondary dark:text-slate-400">
          Loading verified experience details...
        </p>
      </div>
    );
  }

  if (!experience) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-ink-muted mx-auto" />
        <h2 className="text-xl font-bold text-[#1A1A1A] dark:text-white">Experience not found</h2>
        <p className="text-xs text-ink-secondary dark:text-slate-400">
          The requested experience could not be located in the database.
        </p>
        <Link
          href="/explore"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft"
        >
          <Compass className="w-4 h-4" />
          <span>Browse All Experiences</span>
        </Link>
      </div>
    );
  }

  const isSaved = wishlist.includes(experience.experienceId);
  const isSelected = selectedExperienceIds.includes(experience.experienceId);

  const fallbackImages: Record<string, string> = {
    Beach: '/assets/images/destinations/beach_cafe.png',
    Food: '/assets/images/destinations/food_trail.png',
    Adventure: '/assets/images/destinations/waterfall.png',
    Heritage: '/assets/images/destinations/heritage_walk.png',
    Nature: '/assets/images/destinations/waterfall.png',
    Culture: '/assets/images/destinations/heritage_walk.png',
  };

  const rawImage = experience.imageUrl || experience.image || '';
  const isExternal = rawImage.startsWith('http://') || rawImage.startsWith('https://');
  const imageSrc =
    rawImage ||
    fallbackImages[experience.category] ||
    '/assets/images/destinations/food_trail.png';

  function handleBookRide() {
    if (!experience) return;
    setLocations({
      pickup: 'My Current Location',
      drop: `${experience.name}, ${experience.location}`,
      dropLat: experience.latitude ?? undefined,
      dropLng: experience.longitude ?? undefined,
    });
    router.push('/rides/book');
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: experience?.name,
        text: `Check out ${experience?.name} on LocalLens Traveler!`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  }

  // Parse tags safely if available
  const parsedTags = (dbRecord?.tags || experience.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28 animate-in fade-in duration-300">
      {/* Top Navigation & Actions Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 text-xs font-semibold hover:border-primary/40 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleWishlist(experience.experienceId)}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 flex items-center justify-center text-ink-secondary hover:text-red-500 transition-colors shadow-sm active:scale-90"
            title={isSaved ? 'Remove from Wishlist' : 'Save to Wishlist'}
          >
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
          </button>

          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 flex items-center justify-center text-ink-secondary hover:text-primary transition-colors shadow-sm active:scale-90 relative"
            title="Share Experience"
          >
            <Share2 className="w-4 h-4" />
            {copiedShare && (
              <span className="absolute -top-8 right-0 px-2 py-0.5 rounded-md bg-black text-white text-[10px] font-bold whitespace-nowrap">
                Link copied!
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Hero Editorial Photography Card */}
      <div className="relative aspect-[16/9] w-full rounded-3xl overflow-hidden shadow-floating bg-slate-100 dark:bg-slate-900 border border-black/5 dark:border-white/10">
        <Image
          src={imageSrc}
          alt={experience.name}
          fill
          unoptimized={isExternal}
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 900px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-bold text-primary shadow-sm">
            {experience.category}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-sm">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Photograph</span>
          </span>
          {experience.hiddenGem && (
            <span className="px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-sm">
              Hidden Gem
            </span>
          )}
        </div>

        {/* Bottom Hero Overlay */}
        <div className="absolute bottom-5 left-5 right-5 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300 mb-1">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-bold">{experience.rating ?? 4.8}</span>
            <span className="text-white/70">
              ({experience.reviewCount ?? 120} verified traveler reviews)
            </span>
          </div>

          <h1 className="font-display font-black text-2xl sm:text-4xl text-white leading-tight">
            {experience.name}
          </h1>

          <div className="flex items-center gap-1.5 text-xs text-white/90 mt-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary-light" />
            <span>{experience.location}</span>
          </div>
        </div>
      </div>

      {/* Key Attributes Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft text-center">
        <div>
          <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 block uppercase tracking-wider">
            Duration
          </span>
          <span className="font-display font-extrabold text-base sm:text-lg text-[#1A1A1A] dark:text-white flex items-center justify-center gap-1 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            {experience.durationHours} Hours
          </span>
        </div>

        <div>
          <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 block uppercase tracking-wider">
            Estimated Cost
          </span>
          <span className="font-display font-extrabold text-base sm:text-lg text-primary mt-0.5 block">
            ₹{experience.price}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 block uppercase tracking-wider">
            Setting
          </span>
          <span className="font-display font-extrabold text-base sm:text-lg text-[#1A1A1A] dark:text-white mt-0.5 block">
            {experience.indoorOutdoor || 'Outdoor'}
          </span>
        </div>

        <div>
          <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 block uppercase tracking-wider">
            Booking
          </span>
          <span className="font-display font-extrabold text-base sm:text-lg text-[#1A1A1A] dark:text-white mt-0.5 block">
            {experience.bookingRequired ? 'Required' : 'Direct Walk-in'}
          </span>
        </div>
      </div>

      {/* Live Weather Advisory for this spot */}
      <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 dark:bg-slate-800/80 border border-amber-200/80 dark:border-slate-700 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            {isStormy ? <CloudRain className="w-5 h-5 text-sky-400" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Weather Match
              </span>
              <span className="text-xs font-semibold">{weather.tempCelsius}</span>
            </div>
            <p className="text-xs text-ink-secondary dark:text-slate-300 mt-0.5">
              {isStormy
                ? 'Monsoon rain in progress. Covered transport recommended.'
                : 'Favorable travel conditions. Ideal timing for photography & walks.'}
            </p>
          </div>
        </div>
      </div>

      {/* Experience Overview & Genuine Database Fields */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft space-y-6">
        <div>
          <h2 className="font-display font-extrabold text-xl text-[#1A1A1A] dark:text-white">
            Overview & Experience Details
          </h2>
          <p className="text-sm leading-relaxed text-ink-secondary dark:text-slate-300 mt-2">
            {experience.reason || dbRecord?.description || 'Authentic curated experience.'}
          </p>
        </div>

        {/* Database-backed details grid if available */}
        {(dbRecord?.best_for || dbRecord?.best_time || dbRecord?.season || experience.bestFor) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#EAE8E3] dark:border-slate-700/60">
            {(dbRecord?.best_for || experience.bestFor) && (
              <div className="p-3.5 rounded-2xl bg-surface-muted dark:bg-slate-700/50">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-1">
                  Best Suited For
                </span>
                <p className="text-xs font-semibold text-[#1A1A1A] dark:text-white">
                  {dbRecord?.best_for || experience.bestFor}
                </p>
              </div>
            )}

            {(dbRecord?.best_time || dbRecord?.season) && (
              <div className="p-3.5 rounded-2xl bg-surface-muted dark:bg-slate-700/50">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-1">
                  Ideal Season & Timing
                </span>
                <p className="text-xs font-semibold text-[#1A1A1A] dark:text-white">
                  {dbRecord?.best_time || dbRecord?.season}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {parsedTags.length > 0 && (
          <div className="pt-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
              Experience Tags
            </span>
            <div className="flex flex-wrap gap-1.5">
              {parsedTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-full bg-surface-muted dark:bg-slate-700 text-xs text-ink-secondary dark:text-slate-300 font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* LocalLens Guidance Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-primary-soft dark:bg-primary/10 border border-primary/20 space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>LocalLens Cultured Explorer Note</span>
          </div>
          <p className="text-xs text-ink-secondary dark:text-slate-300 leading-relaxed">
            Verified with authentic on-ground imagery. Please respect local cultural guidelines and support regional artisans and street vendors.
          </p>
        </div>
      </div>

      {/* Interactive Location Map */}
      {experience.latitude && experience.longitude && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-bold text-lg text-[#1A1A1A] dark:text-white">
              Location & Access
            </h3>
            <span className="text-xs text-ink-secondary dark:text-slate-400">
              {experience.location}
            </span>
          </div>

          <div className="h-72 rounded-3xl overflow-hidden border border-[#EAE8E3] dark:border-slate-700 shadow-soft">
            <InteractiveMap
              markers={[
                {
                  id: experience.experienceId,
                  name: experience.name,
                  category: experience.category,
                  latitude: experience.latitude,
                  longitude: experience.longitude,
                  orderNumber: 1,
                },
              ]}
              center={[experience.latitude, experience.longitude]}
              zoom={14}
              showPolyline={false}
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Nearby Authentic Experiences */}
      {nearbyExperiences.length > 0 && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-extrabold text-xl text-[#1A1A1A] dark:text-white">
              Nearby in {dbRecord?.city || experience.city || 'the Area'}
            </h3>
            <Link
              href="/explore"
              className="text-xs font-bold text-primary hover:underline"
            >
              See all
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {nearbyExperiences.map((nearby) => (
              <Link
                key={nearby.experienceId}
                href={`/experience/${nearby.experienceId}`}
                className="group block rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft hover:shadow-floating transition-all"
              >
                <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-900">
                  {nearby.imageUrl ? (
                    <Image
                      src={nearby.imageUrl}
                      alt={nearby.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                      {nearby.category}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-display font-bold text-xs text-[#1A1A1A] dark:text-white line-clamp-1 group-hover:text-primary transition-colors">
                    {nearby.name}
                  </h4>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-ink-secondary dark:text-slate-400">
                    <span>{nearby.category}</span>
                    <span className="font-bold text-primary">₹{nearby.price}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Deck */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-[#EAE8E3] dark:border-slate-800 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-secondary dark:text-slate-400 block">
              Experience Cost
            </span>
            <span className="font-display font-extrabold text-2xl text-primary">
              ₹{experience.price}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleBookRide}
              className="px-4 py-3 rounded-2xl bg-surface-muted dark:bg-slate-800 hover:bg-black/5 dark:hover:bg-white/10 text-ink dark:text-white font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
            >
              <Car className="w-4 h-4 text-primary" />
              <span>Book Ride</span>
            </button>

            <button
              onClick={() => toggleExperienceSelection(experience.experienceId)}
              className={`px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 active:scale-95 transition-all shadow-md ${
                isSelected
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to Trip Plan</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Add to Trip Plan</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
