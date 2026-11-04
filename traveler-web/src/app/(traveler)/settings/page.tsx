'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  User,
  Bell,
  MapPin,
  History,
  Lock,
  Eye,
  Languages,
  BadgeIndianRupee,
  HelpCircle,
  Palette,
  LogOut,
  ChevronRight,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isStormy, toggleStormDemo } = useTheme();

  // Local settings toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [syncHistory, setSyncHistory] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('INR (₹)');
  const [selectedLanguage, setSelectedLanguage] = useState('English (India)');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.push('/welcome');
    } catch {
      router.push('/welcome');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/profile"
          className="p-2 rounded-xl bg-surface-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-ink-primary dark:text-white" />
        </Link>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
            Preferences & System
          </span>
          <h1 className="font-display font-bold text-xl text-[#1A1A1A] dark:text-white">
            Settings
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Preferences */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary px-1 mb-2.5">
            Traveler Preferences
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#EAE8E3] dark:border-slate-800 shadow-card divide-y divide-[#EAE8E3] dark:divide-slate-800">
            {/* Account Profile */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Account Profile
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    {user?.email || 'traveler@locallens.app'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-muted text-ink-secondary">
                {user?.role || 'Traveler'}
              </span>
            </div>

            {/* Push Notifications Toggle */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Push Notifications
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Real-time weather disruption & ride arrival alerts
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPushEnabled(!pushEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  pushEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    pushEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Location Services */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Location Services
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Accurate destination coordinates & turn-by-turn guidance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLocationEnabled(!locationEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  locationEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    locationEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Travel History Sync */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Cloud Itinerary Sync
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Syncs offline itineraries with Supabase database
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSyncHistory(!syncHistory)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  syncHistory ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    syncHistory ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: System & Customization */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-secondary px-1 mb-2.5">
            System & Atmosphere
          </h3>
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#EAE8E3] dark:border-slate-800 shadow-card divide-y divide-[#EAE8E3] dark:divide-slate-800">
            {/* Design System & Component Library Reference */}
            <Link
              href="/design-system"
              className="p-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white flex items-center gap-1.5">
                    Design System & UI Gallery
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      Stitch Tokens
                    </span>
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Inspect color swatches, typography, chips, and components
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </Link>

            {/* Storm Simulation Mode */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Zomato-Style Storm Mode
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Live monsoon rainfall animation and dark slate lighting
                  </p>
                </div>
              </div>
              <button
                onClick={toggleStormDemo}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${
                  isStormy ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    isStormy ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Currency */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <BadgeIndianRupee className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Currency Display
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Fixed ₹1/km rates & entry fees
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-ink-primary dark:text-white flex items-center gap-1">
                {selectedCurrency}
                <Check className="w-3.5 h-3.5 text-primary" />
              </span>
            </div>

            {/* Language */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Language & Saathi Voice
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Supports English, Hindi, and Hinglish
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-ink-primary dark:text-white">
                {selectedLanguage}
              </span>
            </div>

            {/* Privacy & Permissions */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Privacy Policy & RLS Security
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Zero third-party tracking; encrypted offline storage
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </div>

            {/* Help & Support */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white">
                    Help & Community Feedback
                  </h4>
                  <p className="text-xs text-ink-secondary dark:text-slate-400">
                    Contact local guides and support team
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-ink-muted" />
            </div>
          </div>
        </div>

        {/* Section 3: Logout Action */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 text-sm font-bold flex items-center justify-center gap-2.5 transition-colors disabled:opacity-75"
          >
            {isLoggingOut ? (
              <div className="w-4 h-4 border-2 border-red-700 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Log Out of LocalLens</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
