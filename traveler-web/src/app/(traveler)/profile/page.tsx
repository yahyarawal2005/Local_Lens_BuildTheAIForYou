'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useItinerary } from '@/context/ItineraryContext';
import {
  User,
  Sparkles,
  MapPin,
  Calendar,
  Bookmark,
  Bell,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Zap,
  Check,
  IndianRupee,
  Users,
  Compass,
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isStormy, toggleStormDemo } = useTheme();
  const {
    savedTrips,
    wishlist,
    interests,
    toggleInterest,
    totalBudgetInr,
    setBudget,
    groupType,
    setGroup,
  } = useItinerary();

  const [isSavedAlert, setIsSavedAlert] = useState(false);

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  const completedTripsCount = savedTrips.filter(
    (t) => t.items.length > 0 && t.items.every((i) => i.isCompleted)
  ).length;

  const popularInterests = [
    'Food & Culinary',
    'Heritage & Forts',
    'Nature & Treks',
    'Beaches & Coastal',
    'Culture & Temples',
    'Local Bazaars',
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 animate-in fade-in duration-300">
      {/* Profile Header Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft flex items-center gap-4 sm:gap-5">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-primary text-white flex items-center justify-center font-black text-2xl shrink-0 shadow-soft">
          {user?.photoUrl ? (
            <Image
              src={user.photoUrl}
              alt={user.displayName}
              fill
              className="object-cover"
            />
          ) : (
            <span>{user?.displayName ? user.displayName[0].toUpperCase() : 'T'}</span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-[#1A1A1A] dark:text-white">
              {user?.displayName || 'Traveler'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              Verified Explorer
            </span>
          </div>
          <p className="text-xs text-ink-secondary dark:text-slate-400 mt-0.5">
            {user?.email || 'traveler@locallens.app'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[11px] text-ink-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Authenticated Session</span>
          </div>
        </div>
      </div>

      {/* Travel Stats Strip */}
      <div className="grid grid-cols-3 gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft text-center">
        <div>
          <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 block uppercase tracking-wider">
            Trips Planned
          </span>
          <span className="font-display font-black text-xl sm:text-2xl text-primary mt-0.5 block">
            {savedTrips.length}
          </span>
        </div>
        <div className="border-x border-[#EAE8E3] dark:border-slate-700">
          <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 block uppercase tracking-wider">
            Completed
          </span>
          <span className="font-display font-black text-xl sm:text-2xl text-[#1A1A1A] dark:text-white mt-0.5 block">
            {completedTripsCount}
          </span>
        </div>
        <div>
          <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 block uppercase tracking-wider">
            Saved Places
          </span>
          <span className="font-display font-black text-xl sm:text-2xl text-[#1A1A1A] dark:text-white mt-0.5 block">
            {wishlist.length}
          </span>
        </div>
      </div>

      {/* Travel Personality Archetype Banner */}
      <Link
        href="/profile/personality"
        className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500 via-orange-500 to-primary text-white shadow-soft flex items-center justify-between group active:scale-98 transition-all"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
              Travel Personality Archetype
            </span>
            <h3 className="font-display font-black text-lg sm:text-xl text-white">
              Cultured Heritage Wanderer
            </h3>
            <p className="text-xs text-white/90 mt-0.5">
              Prefers authentic culinary spots, ancient forts, and slow-paced exploration.
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
      </Link>

      {/* Travel Style & Interest Preferences */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft space-y-5">
        <div>
          <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white">
            Travel Style & Default Preferences
          </h3>
          <p className="text-xs text-ink-secondary dark:text-slate-400 mt-0.5">
            These preferences tailor your personalized AI recommendations and search suggestions.
          </p>
        </div>

        {/* Favorite Categories */}
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
            Favorite Themes
          </span>
          <div className="flex flex-wrap gap-2">
            {popularInterests.map((theme) => {
              const active = interests.some((i) => theme.toLowerCase().includes(i.toLowerCase()));
              return (
                <button
                  key={theme}
                  type="button"
                  onClick={() => toggleInterest(theme.split(' ')[0])}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                    active
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-muted dark:bg-slate-700 text-ink-secondary dark:text-slate-300 hover:border-primary/40'
                  }`}
                >
                  {active && <Check className="w-3 h-3" />}
                  <span>{theme}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Budget Level */}
        <div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink-secondary dark:text-slate-400 block mb-2">
            Default Daily Budget
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Budget', val: 800, sub: '< ₹1k' },
              { label: 'Moderate', val: 2000, sub: '₹2k - ₹3k' },
              { label: 'Comfort', val: 4500, sub: '₹4k - ₹5k' },
              { label: 'Curated', val: 8000, sub: '₹8k+' },
            ].map((tier) => (
              <button
                key={tier.label}
                type="button"
                onClick={() => setBudget(tier.val)}
                className={`p-3 rounded-2xl border text-center transition-all ${
                  totalBudgetInr === tier.val
                    ? 'border-primary bg-primary-soft/40 dark:bg-primary/20 text-primary font-bold'
                    : 'border-[#EAE8E3] dark:border-slate-700 bg-surface-muted dark:bg-slate-700/50 text-[#1A1A1A] dark:text-white'
                }`}
              >
                <span className="text-xs font-extrabold block">{tier.label}</span>
                <span className="text-[10px] text-ink-secondary dark:text-slate-400 block mt-0.5">
                  {tier.sub}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Settings & Atmosphere Demo */}
      <div className="p-2 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft divide-y divide-[#EAE8E3] dark:divide-slate-700">
        <button
          onClick={toggleStormDemo}
          className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-2xl text-left"
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-amber-500" />
            <div>
              <span className="text-sm font-bold text-[#1A1A1A] dark:text-white block">
                Atmosphere Mode Simulation
              </span>
              <span className="text-xs text-ink-secondary dark:text-slate-400">
                {isStormy ? 'Monsoon Thunderstorm & Live Raindrops' : 'Warm Daylight Editorial'}
              </span>
            </div>
          </div>
          <span className="text-xs font-bold text-primary">Toggle</span>
        </button>

        <Link
          href="/notifications"
          className="w-full p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors rounded-2xl"
        >
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <span className="text-sm font-bold text-[#1A1A1A] dark:text-white block">
                Notifications & Weather Alerts
              </span>
              <span className="text-xs text-ink-secondary dark:text-slate-400">
                Real-time trip advisories & disruption warnings
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-ink-secondary" />
        </Link>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleSignOut}
        className="w-full h-12 rounded-2xl bg-red-500/10 hover:bg-red-500/20 text-red-600 font-bold text-xs flex items-center justify-center gap-2 transition-colors active:scale-98"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out of LocalLens Traveler</span>
      </button>
    </div>
  );
}
