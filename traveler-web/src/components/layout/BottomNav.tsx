'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Calendar, Bookmark, User, PlusCircle, Car } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

export function BottomNav() {
  const pathname = usePathname();
  const { isStormy } = useTheme();

  const navItems = [
    { label: 'Explore', href: '/home', icon: Compass },
    { label: 'Trips', href: '/trips', icon: Calendar },
    { label: 'Plan', href: '/itinerary/create', icon: PlusCircle, isPrimary: true },
    { label: 'Rides', href: '/rides/book', icon: Car },
    { label: 'Saved', href: '/saved', icon: Bookmark },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 md:hidden border-t backdrop-blur-xl transition-colors duration-300 ${
        isStormy
          ? 'bg-[#0F172A]/90 border-slate-800 text-white'
          : 'bg-[#FAF9F6]/90 border-[#EAE8E3] text-[#1A1A1A]'
      } pb-safe`}
    >
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href));

          if (item.isPrimary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-white shadow-floating flex items-center justify-center group-active:scale-95 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-semibold text-primary mt-1">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-primary font-bold'
                  : isStormy
                  ? 'text-slate-400 hover:text-white'
                  : 'text-ink-secondary hover:text-ink'
              }`}
            >
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">{item.label}</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
