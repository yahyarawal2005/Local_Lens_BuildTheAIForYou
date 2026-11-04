'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Sparkles,
  MapPin,
  Utensils,
  Compass,
  Sunset,
  Camera,
  Car,
  Heart,
  Star,
  CheckCircle2,
} from 'lucide-react';

export default function DesignSystemPage() {
  const [selectedChip, setSelectedChip] = useState('Food');
  const [buttonLoading, setButtonLoading] = useState(false);

  const colors = [
    { name: 'Primary Terracotta', hex: '#E85028', bgClass: 'bg-[#E85028]', textClass: 'text-white', desc: 'Brand accent, primary CTAs & alerts' },
    { name: 'Coastal Sage', hex: '#5A7363', bgClass: 'bg-[#5A7363]', textClass: 'text-white', desc: 'Heritage, nature & cultural balance' },
    { name: 'Desert Sand', hex: '#D4A373', bgClass: 'bg-[#D4A373]', textClass: 'text-[#1A1A1A]', desc: 'Warm accents & timeline polylines' },
    { name: 'Daylight Cream', hex: '#FAF9F6', bgClass: 'bg-[#FAF9F6] border border-[#EAE8E3]', textClass: 'text-[#1A1A1A]', desc: 'Base surface and warm background' },
    { name: 'Slate Navy / Ink', hex: '#1A1A1A', bgClass: 'bg-[#1A1A1A]', textClass: 'text-white', desc: 'Typography and deep contrast' },
    { name: 'Monsoon Sky', hex: '#0F172A', bgClass: 'bg-[#0F172A]', textClass: 'text-white', desc: 'Storm atmosphere & dark simulation' },
  ];

  const chips = [
    { label: 'All', icon: Sparkles },
    { label: 'Food', icon: Utensils },
    { label: 'Hidden Gems', icon: Compass },
    { label: 'Sunsets', icon: Sunset },
    { label: 'Heritage', icon: Camera },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="p-2 rounded-xl bg-surface-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-ink-primary dark:text-white" />
        </Link>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
            UI Token & Component Gallery
          </span>
          <h1 className="font-display font-bold text-xl text-[#1A1A1A] dark:text-white">
            LocalLens Design System
          </h1>
        </div>
      </div>

      <div className="space-y-8">
        {/* Brand Identity Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-card border border-[#EAE8E3] dark:border-slate-800 relative overflow-hidden">
          <div className="absolute right-4 top-4 text-7xl font-display font-black text-black/[0.03] dark:text-white/[0.03] select-none pointer-events-none">
            अतिथि
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary text-white flex items-center justify-center shadow-soft overflow-hidden">
              <Image
                src="/assets/images/logo.png"
                alt="LocalLens Logo"
                width={48}
                height={48}
                className="object-contain"
              />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-primary tracking-tight">
                LocalLens Warm Editorial
              </h2>
              <p className="text-xs font-semibold text-ink-secondary dark:text-slate-400 uppercase tracking-widest mt-0.5">
                Stitch Reference & Component Tokens
              </p>
              <p className="text-xs text-ink-muted mt-1">
                Watermark: &ldquo;अतिथि देवो भव&rdquo; (Guest is God)
              </p>
            </div>
          </div>
        </div>

        {/* Color Palette Tokens */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-card border border-[#EAE8E3] dark:border-slate-800">
          <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white mb-4">
            Color Palette Tokens
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {colors.map((c) => (
              <div
                key={c.name}
                className={`p-4 rounded-2xl ${c.bgClass} ${c.textClass} shadow-card flex flex-col justify-between h-28`}
              >
                <div>
                  <span className="text-xs font-bold block">{c.name}</span>
                  <span className="text-[10px] opacity-80 font-mono">{c.hex}</span>
                </div>
                <span className="text-[10px] opacity-90 line-clamp-1">{c.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Gallery */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-card border border-[#EAE8E3] dark:border-slate-800">
          <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white mb-4">
            Interactive Buttons
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setButtonLoading(true);
                setTimeout(() => setButtonLoading(false), 1200);
              }}
              className="py-3 px-5 rounded-2xl bg-primary hover:bg-[#D44018] text-white font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              {buttonLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Primary CTA (Terracotta)</span>
                </>
              )}
            </button>

            <button className="py-3 px-5 rounded-2xl bg-[#5A7363] hover:bg-[#4d6355] text-white font-bold text-xs shadow-soft transition-all flex items-center justify-center gap-2 active:scale-98">
              <Compass className="w-4 h-4" />
              <span>Secondary Action (Coastal Sage)</span>
            </button>

            <button className="py-3 px-5 rounded-2xl bg-white dark:bg-slate-800 border-2 border-[#EAE8E3] dark:border-slate-700 hover:border-primary text-ink-primary dark:text-white font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-98">
              <MapPin className="w-4 h-4 text-primary" />
              <span>Outlined Neutral</span>
            </button>

            <button className="py-3 px-5 rounded-2xl bg-surface-muted hover:bg-black/5 dark:hover:bg-white/10 text-ink-secondary dark:text-slate-300 font-bold text-xs transition-all flex items-center justify-center gap-2 active:scale-98">
              <span>Ghost Pill Button</span>
            </button>
          </div>
        </div>

        {/* Category Chips & Match Badges */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-card border border-[#EAE8E3] dark:border-slate-800">
          <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white mb-3">
            Filter Chips & Match Badges
          </h3>
          <div className="flex flex-wrap items-center gap-2.5 mb-6">
            {chips.map((chip) => {
              const Icon = chip.icon;
              const isSelected = selectedChip === chip.label;
              return (
                <button
                  key={chip.label}
                  onClick={() => setSelectedChip(chip.label)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary text-white shadow-soft scale-105'
                      : 'bg-surface-muted dark:bg-slate-800 text-ink-secondary dark:text-slate-300 hover:bg-black/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>

          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-secondary mb-2.5">
            Badges & Status Indicators
          </h4>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              98% AI Match
            </span>
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-primary" />
              Top Rated 4.9
            </span>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-500/20">
              ₹1/km Lens Ride
            </span>
            <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 font-bold text-xs border border-sky-500/20">
              Monsoon Reroute Active
            </span>
          </div>
        </div>

        {/* Card Component Preview */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-card border border-[#EAE8E3] dark:border-slate-800">
          <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white mb-4">
            Destination Card Architecture
          </h3>
          <div className="max-w-sm mx-auto bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-floating border border-[#EAE8E3] dark:border-slate-700">
            <div className="relative h-44 w-full">
              <Image
                src="/assets/images/destinations/jaipur.png"
                alt="Jaipur Amber Fort"
                fill
                className="object-cover"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[10px] font-bold text-ink-primary shadow-sm uppercase tracking-wider">
                Historical Walk
              </div>
              <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center shadow-sm text-primary">
                <Heart className="w-4 h-4 fill-primary" />
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between text-xs text-ink-secondary dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  Jaipur, Rajasthan
                </span>
                <span className="font-bold text-amber-600 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  4.9 (1,240)
                </span>
              </div>
              <h4 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white mt-1.5">
                Amber Fort & Panna Meena Ka Kund
              </h4>
              <p className="text-xs text-ink-secondary dark:text-slate-300 mt-1 line-clamp-2">
                Ancient ramparts, artistic Hindu elements, and symmetrical geometric stepwell.
              </p>
              <div className="mt-4 pt-3 border-t border-[#EAE8E3] dark:border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-ink-muted block uppercase font-bold">Estimated</span>
                  <span className="text-sm font-extrabold text-primary">₹250 / person</span>
                </div>
                <button className="px-3.5 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft">
                  Book Ride
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
