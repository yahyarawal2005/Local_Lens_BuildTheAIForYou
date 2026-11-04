'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Mail, Compass, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface Slide {
  location: string;
  tag: string;
  title: string;
  image: string;
  badgeColor: string;
}

const slides: Slide[] = [
  {
    location: 'JAIPUR, INDIA',
    tag: 'Day 2 Discovery',
    title: 'Amber Fort Sunrise Walk',
    image: '/assets/images/destinations/jaipur.png',
    badgeColor: 'bg-primary',
  },
  {
    location: 'PANVEL, MAHARASHTRA',
    tag: 'Local Curated',
    title: 'Local Food & Heritage Trail',
    image: '/assets/images/destinations/food_trail.png',
    badgeColor: 'bg-emerald-600',
  },
  {
    location: 'ALIBAG, COASTAL',
    tag: 'Scenic Route',
    title: 'Kashid Sunset Beach Trail',
    image: '/assets/images/destinations/hawa_mahal.png',
    badgeColor: 'bg-amber-600',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  // Auto-advance slides every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await signInWithGoogle();
      router.push('/home');
    } catch {
      // In web dev without Google client id configured, fallback to demo/home
      router.push('/home');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleDemoSignIn = async () => {
    try {
      setIsDemoLoading(true);
      await signInWithEmail('traveler@locallens.app', 'locallens123');
      router.push('/home');
    } catch {
      router.push('/home');
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] flex flex-col justify-between selection:bg-primary-soft">
      {/* Top Navigation & Identity Bar */}
      <header className="max-w-6xl w-full mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-soft overflow-hidden">
            <Image
              src="/assets/images/logo.png"
              alt="LocalLens"
              width={28}
              height={28}
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-display font-extrabold text-xl tracking-tight text-primary block leading-none">
              LocalLens
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-ink-secondary">
              Traveler
            </span>
          </div>
        </div>

        <Link
          href="/home"
          className="px-4 py-1.5 rounded-full bg-surface-muted hover:bg-black/5 text-xs font-bold text-ink-primary transition-all flex items-center gap-1"
        >
          Skip to Explore
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Content Container */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12">
        {/* Left/Top: Hero Carousel Visual Stack */}
        <div className="w-full lg:w-1/2 flex flex-col items-center">
          <div className="relative w-full max-w-md h-[340px] sm:h-[400px] rounded-3xl overflow-hidden shadow-floating border-4 border-white">
            {slides.map((slide, index) => (
              <div
                key={slide.title}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  index === activeSlide ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 pointer-events-none scale-105'
                }`}
              >
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  priority={index === 0}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                {/* Top Location Badge */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-bold text-ink-primary shadow-sm tracking-wider uppercase">
                    <span className={`w-2 h-2 rounded-full ${slide.badgeColor}`} />
                    {slide.location}
                  </span>
                </div>

                {/* Bottom Story Text */}
                <div className="absolute bottom-5 left-5 right-5 z-20 text-white">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-primary-soft">
                    {slide.tag}
                  </span>
                  <h3 className="font-display font-bold text-2xl mt-1 leading-tight drop-shadow-sm">
                    {slide.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2 mt-4">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeSlide === idx ? 'w-8 bg-primary' : 'w-2 bg-[#D4A373]/40 hover:bg-[#D4A373]'
                }`}
                aria-label={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right/Bottom: Narrative Section & Actions */}
        <div className="w-full lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
          {/* Companion Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Your Intelligent Travel Companion
          </div>

          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-[#1A1A1A] leading-[1.15] tracking-tight">
            Travel like a cultured local, not a tourist.
          </h2>

          <p className="mt-3 text-base text-ink-secondary max-w-lg leading-relaxed">
            AI-curated day-by-day itineraries, swipe-to-discover hidden gems, real-time weather disruption rerouting, and seamless local transit across India.
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-2.5 justify-center lg:justify-start my-6">
            <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#EAE8E3] text-xs font-semibold shadow-card text-[#1A1A1A] flex items-center gap-1.5">
              <span>✨</span> Smart AI Itineraries
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#EAE8E3] text-xs font-semibold shadow-card text-[#1A1A1A] flex items-center gap-1.5">
              <span>🗺️</span> Offline Interactive Maps
            </span>
            <span className="px-3.5 py-1.5 rounded-full bg-white border border-[#EAE8E3] text-xs font-semibold shadow-card text-[#1A1A1A] flex items-center gap-1.5">
              <span>🛺</span> Instant Local Rides
            </span>
          </div>

          {/* Action Deck */}
          <div className="w-full max-w-md space-y-3">
            <button
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-[#D44018] text-white font-bold text-sm shadow-soft hover:shadow-floating transition-all flex items-center justify-center gap-3 active:scale-98 disabled:opacity-75"
            >
              {isGoogleLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Get Started with Google</span>
                </>
              )}
            </button>

            <Link
              href="/login"
              className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-[#FAF9F6] border-2 border-[#EAE8E3] text-[#1A1A1A] font-bold text-sm shadow-card hover:shadow-soft transition-all flex items-center justify-center gap-2.5 active:scale-98"
            >
              <Mail className="w-4 h-4 text-ink-secondary" />
              <span>Continue with Email</span>
            </Link>

            <button
              onClick={handleDemoSignIn}
              disabled={isDemoLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-ink-secondary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Instant Guest Mode (Demo Traveler)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer / Terms */}
      <footer className="max-w-6xl w-full mx-auto px-6 py-6 text-center text-[11px] text-ink-muted">
        <p className="flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          By continuing, you agree to LocalLens Terms of Service and Privacy Policy. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
}
