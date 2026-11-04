'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-[#1A1A1A] flex flex-col justify-between">
      {/* Top Header */}
      <header className="max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/welcome" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-soft group-hover:scale-105 transition-transform overflow-hidden">
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
              Traveler Portal
            </span>
          </div>
        </Link>

        <Link
          href="/home"
          className="text-xs font-bold text-ink-secondary hover:text-primary transition-colors"
        >
          Explore without signing in →
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="max-w-6xl w-full mx-auto px-6 py-6 text-center text-xs text-ink-muted">
        <p>© 2026 LocalLens • Handcrafted for Cultured Travelers Across India</p>
      </footer>
    </div>
  );
}
