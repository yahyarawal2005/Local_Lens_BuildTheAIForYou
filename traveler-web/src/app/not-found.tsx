import React from 'react';
import Link from 'next/link';
import { Compass, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-slate-950 flex items-center justify-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-black/5 dark:border-white/10 rounded-3xl p-8 shadow-floating space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Error 404</span>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink dark:text-white">
            Destination Not Found
          </h1>
          <p className="text-sm text-ink-secondary dark:text-slate-400">
            It looks like this trail leads nowhere or the place you are seeking has moved. Let's get you back on track.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/home"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-soft transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-surface-muted dark:bg-slate-800 hover:bg-black/5 dark:hover:bg-white/5 text-ink dark:text-slate-200 font-bold text-sm transition-all"
          >
            <Compass className="w-4 h-4" />
            <span>Explore All</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
