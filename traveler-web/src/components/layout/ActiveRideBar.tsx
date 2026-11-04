'use client';

import React from 'react';
import Link from 'next/link';
import { useRide } from '@/context/RideContext';
import { Car, ChevronRight } from 'lucide-react';

export function ActiveRideBar() {
  const { state } = useRide();

  if (state.status === 'idle' || state.status === 'cancelled' || state.status === 'completed') {
    return null;
  }

  const isAccepted = state.status === 'accepted';
  const isInProgress = state.status === 'inProgress' || state.status === 'started';

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-lg mx-auto">
      <Link
        href="/rides/live"
        className="flex items-center justify-between p-3.5 px-4 bg-[#1A1A1A] text-white rounded-2xl shadow-floating border border-white/10 backdrop-blur-md active:scale-[0.99] transition-all hover:bg-black group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shrink-0 animate-pulse">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary-light uppercase tracking-wider">
                {isAccepted ? 'Driver En Route' : isInProgress ? 'Trip in Progress' : 'Finding Driver'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-sm font-semibold truncate max-w-[200px] sm:max-w-[280px]">
              {state.activeRider ? `${state.activeRider.name} • ${state.activeRider.vehicleNumber}` : state.dropLocation}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-right">
          <div>
            <p className="text-xs text-white/60">ETA</p>
            <p className="text-sm font-bold text-white">{state.etaText}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/40 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </Link>
    </div>
  );
}
