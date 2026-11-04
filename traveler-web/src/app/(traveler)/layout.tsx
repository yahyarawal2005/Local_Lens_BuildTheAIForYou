'use client';

import React from 'react';
import { TopHeader } from '@/components/layout/TopHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { ActiveRideBar } from '@/components/layout/ActiveRideBar';
import { StormAtmosphere } from '@/components/layout/StormAtmosphere';
import { Footer } from '@/components/layout/Footer';
import { useTheme } from '@/context/ThemeContext';

export default function TravelerLayout({ children }: { children: React.ReactNode }) {
  const { isStormy } = useTheme();

  return (
    <div
      className={`min-h-screen relative flex flex-col transition-colors duration-300 ${
        isStormy ? 'bg-[#0F172A] text-white' : 'bg-[#FAF9F6] text-[#1A1A1A]'
      }`}
    >
      <StormAtmosphere />
      <TopHeader />
      <main className="flex-1 relative z-10 pb-28 md:pb-12 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        {children}
      </main>
      <Footer />
      <ActiveRideBar />
      <BottomNav />
    </div>
  );
}
