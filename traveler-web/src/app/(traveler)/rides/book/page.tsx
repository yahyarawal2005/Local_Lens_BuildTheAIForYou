'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRide, VEHICLE_OPTIONS } from '@/context/RideContext';
import { VehicleOption } from '@/types';
import {
  Car,
  MapPin,
  Clock,
  Navigation,
  ShieldCheck,
  Check,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';

export default function LensRideBookingPage() {
  const router = useRouter();
  const { state, selectVehicle, setLocations, requestRide, cancelRide } = useRide();

  const [pickupInput, setPickupInput] = useState(state.pickupLocation);
  const [dropInput, setDropInput] = useState(state.dropLocation);

  const isSearching = state.status === 'searching';

  async function handleBook() {
    setLocations({ pickup: pickupInput, drop: dropInput });
    await requestRide(pickupInput, dropInput);
  }

  // If driver assigned, navigate to live tracking
  React.useEffect(() => {
    if (state.status === 'accepted' || state.status === 'inProgress' || state.status === 'started') {
      router.push('/rides/live');
    }
  }, [state.status, router]);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft dark:bg-primary/20 text-primary text-xs font-bold mb-1">
          <Car className="w-3.5 h-3.5" />
          <span>LocalLens Mobility</span>
        </div>
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] dark:text-white">
          Book a Lens Ride
        </h1>
        <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-0.5">
          Verified local drivers, zero surge pricing, and direct doorstep pickup.
        </p>
      </div>

      {/* Pickup & Destination Inputs Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft space-y-3">
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500" />
          <input
            type="text"
            value={pickupInput}
            onChange={(e) => setPickupInput(e.target.value)}
            placeholder="Enter Pickup Location"
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-muted dark:bg-slate-700 border-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold text-[#1A1A1A] dark:text-white"
          />
        </div>

        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary" />
          <input
            type="text"
            value={dropInput}
            onChange={(e) => setDropInput(e.target.value)}
            placeholder="Enter Destination"
            className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-muted dark:bg-slate-700 border-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-sm font-semibold text-[#1A1A1A] dark:text-white"
          />
        </div>
      </div>

      {/* Vehicle Options Grid */}
      <div className="space-y-3">
        <h3 className="font-display font-bold text-sm text-[#1A1A1A] dark:text-white">
          Choose Your Vehicle Type
        </h3>

        <div className="space-y-2.5">
          {VEHICLE_OPTIONS.map((opt) => {
            const isSelected = state.selectedVehicle.type === opt.type;

            return (
              <button
                key={opt.type}
                type="button"
                onClick={() => selectVehicle(opt)}
                className={`w-full p-4 rounded-2xl border flex items-center justify-between text-left transition-all active:scale-98 ${
                  isSelected
                    ? 'border-primary bg-primary-soft/60 dark:bg-primary/10 shadow-sm'
                    : 'border-[#EAE8E3] dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-primary text-white'
                        : 'bg-surface-muted dark:bg-slate-700 text-ink dark:text-white'
                    }`}
                  >
                    <Car className="w-6 h-6" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#1A1A1A] dark:text-white">
                        {opt.name}
                      </span>
                      <span className="text-[11px] font-semibold text-ink-secondary dark:text-slate-400">
                        {opt.capacity}
                      </span>
                    </div>
                    <span className="text-xs text-ink-secondary dark:text-slate-400 block mt-0.5">
                      {opt.etaMinutes} min away • Nearest driver
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-display font-extrabold text-lg text-primary block">
                    ₹{opt.estimatedFare}
                  </span>
                  <span className="text-[10px] text-ink-muted dark:text-slate-400 font-bold block">
                    Fixed Fare
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Security & Local Driver Guarantee Badge */}
      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 text-emerald-800 dark:text-emerald-300">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="text-xs font-medium">
          All Lens Ride drivers are locally verified and background checked. Includes live GPS tracking & emergency SOS.
        </p>
      </div>

      {/* Booking CTA Button */}
      {!isSearching ? (
        <button
          onClick={handleBook}
          disabled={!pickupInput.trim() || !dropInput.trim()}
          className="w-full h-14 rounded-2xl bg-primary hover:bg-primary-dark text-white font-bold text-base shadow-floating flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-40"
        >
          <span>Confirm {state.selectedVehicle.name} (₹{state.selectedVehicle.estimatedFare})</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      ) : (
        /* Radar Searching State */
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-floating text-center space-y-4">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-primary/40 pulse-ring" />
            <div className="absolute inset-4 rounded-full border-2 border-primary/60 pulse-ring" />
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-soft">
              <Car className="w-6 h-6 animate-pulse" />
            </div>
          </div>

          <div>
            <h4 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white">
              Connecting with nearby drivers...
            </h4>
            <p className="text-xs text-ink-secondary dark:text-slate-400 mt-0.5">
              Finding the closest verified {state.selectedVehicle.name} in {pickupInput}
            </p>
          </div>

          <button
            onClick={cancelRide}
            className="px-5 py-2.5 rounded-xl bg-surface-muted dark:bg-slate-700 text-xs font-semibold text-ink-secondary dark:text-slate-300 hover:text-red-500 transition-colors"
          >
            Cancel Request
          </button>
        </div>
      )}
    </div>
  );
}
