'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { StorageService } from '@/lib/storage';

export default function RootPage() {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    // If logged in via cached state or session, send to home, else welcome onboarding
    const cachedUser = StorageService.getCachedUserProfile();
    if (status === 'authenticated' || cachedUser) {
      router.replace('/home');
    } else if (status === 'unauthenticated') {
      router.replace('/welcome');
    }
  }, [status, router]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-24 h-24 mb-6 animate-pulse">
        <Image
          src="/assets/images/logo.png"
          alt="LocalLens Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
      <h1 className="font-display font-black text-3xl sm:text-4xl text-primary tracking-tight">
        LocalLens
      </h1>
      <p className="mt-2 text-sm font-semibold text-ink-secondary tracking-widest uppercase">
        Intelligent Travel Companion
      </p>
      <div className="mt-8 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
        <span className="text-xs font-medium text-ink-muted">Loading your personalized experience...</span>
      </div>
    </div>
  );
}
