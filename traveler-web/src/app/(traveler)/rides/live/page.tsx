'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useRide, DEFAULT_RIDER } from '@/context/RideContext';
import {
  ArrowLeft,
  Phone,
  ShieldCheck,
  MapPin,
  Car,
  Clock,
  CheckCircle2,
  X,
  Play,
} from 'lucide-react';
import { MapMarkerPoint } from '@/components/maps/InteractiveMap';

const InteractiveMap = dynamic(
  () => import('@/components/maps/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false, loading: () => <div className="h-72 w-full rounded-2xl bg-black/5 animate-pulse" /> }
);

export default function LiveRideTrackingPage() {
  const router = useRouter();
  const { state, cancelRide, startTrip, completeTrip, resetRide } = useRide();

  const rider = state.activeRider || DEFAULT_RIDER;
  const isAccepted = state.status === 'accepted';
  const isInProgress = state.status === 'inProgress' || state.status === 'started';
  const isCompleted = state.status === 'completed';

  const mapMarkers: MapMarkerPoint[] = [
    {
      id: 'pickup',
      name: `Pickup: ${state.pickupLocation}`,
      latitude: state.pickupLat,
      longitude: state.pickupLng,
      isPickup: true,
    },
    {
      id: 'driver',
      name: `Driver: ${rider.name} (${rider.vehicleNumber})`,
      latitude: state.riderLat,
      longitude: state.riderLng,
      isDriver: true,
    },
    {
      id: 'drop',
      name: `Destination: ${state.dropLocation}`,
      latitude: state.dropLat,
      longitude: state.dropLng,
      isDrop: true,
    },
  ];

  if (isCompleted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 py-12 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h2 className="font-display font-extrabold text-2xl text-[#1A1A1A] dark:text-white">
            You Have Arrived!
          </h2>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-1">
            Safe arrival at {state.dropLocation}.
          </p>
        </div>

        {/* Receipt Box */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft text-left space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-secondary dark:text-slate-400">Total Fare</span>
            <span className="font-display font-black text-xl text-primary">
              ₹{state.selectedVehicle.estimatedFare}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-ink-secondary dark:text-slate-400">
            <span>Vehicle</span>
            <span className="font-bold text-[#1A1A1A] dark:text-white">{state.selectedVehicle.name}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-ink-secondary dark:text-slate-400">
            <span>Driver</span>
            <span className="font-bold text-[#1A1A1A] dark:text-white">{rider.name}</span>
          </div>
        </div>

        <button
          onClick={() => {
            resetRide();
            router.push('/home');
          }}
          className="w-full h-14 rounded-2xl bg-primary text-white font-bold text-sm shadow-soft"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-20 animate-in fade-in duration-300">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-full bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600">
          {isInProgress ? 'Trip in Progress' : 'Driver Arriving'}
        </span>
      </div>

      {/* Live Route Map */}
      <div className="h-64 sm:h-72 w-full rounded-3xl overflow-hidden border border-[#EAE8E3] dark:border-slate-700 shadow-soft">
        <InteractiveMap
          markers={mapMarkers}
          center={[state.riderLat, state.riderLng]}
          zoom={13}
          showPolyline={true}
          className="w-full h-full"
        />
      </div>

      {/* Driver & OTP Card */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-floating space-y-4">
        {/* Top: Driver Info & Profile Photo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
              <Image
                src={rider.profileImage}
                alt={rider.name}
                fill
                className="object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white">
                  {rider.name}
                </h3>
                <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                  ★ {rider.rating}
                </span>
              </div>
              <span className="text-xs font-semibold text-ink-secondary dark:text-slate-400 block">
                {rider.vehicleType}
              </span>
              <span className="text-xs font-black tracking-wider text-primary">
                {rider.vehicleNumber}
              </span>
            </div>
          </div>

          <a
            href={`tel:${rider.phone}`}
            className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-soft active:scale-95 transition-all"
            title="Call Driver"
          >
            <Phone className="w-5 h-5" />
          </a>
        </div>

        {/* OTP Verification Pill */}
        <div className="p-3.5 rounded-2xl bg-primary-soft dark:bg-primary/10 border border-primary/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              Share OTP with Driver
            </span>
            <span className="text-xs text-ink-secondary dark:text-slate-300">
              Only share upon getting into the vehicle
            </span>
          </div>

          <div className="px-4 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-primary/30 font-mono font-black text-xl text-primary tracking-widest shadow-sm">
            {state.otp}
          </div>
        </div>

        {/* Route Progress Metric Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold mb-1.5 text-ink-secondary dark:text-slate-400">
            <span>{isInProgress ? 'Heading to Destination' : 'Driver Arriving'}</span>
            <span className="text-primary">{state.etaText}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-muted dark:bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${isInProgress ? Math.max(30, state.routeProgress * 100) : 15}%` }}
            />
          </div>
        </div>

        {/* Ride Locations */}
        <div className="space-y-2 text-xs pt-1">
          <div className="flex items-center gap-2 text-ink-secondary dark:text-slate-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">{state.pickupLocation}</span>
          </div>
          <div className="flex items-center gap-2 text-[#1A1A1A] dark:text-white font-semibold">
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
            <span className="truncate">{state.dropLocation}</span>
          </div>
        </div>

        {/* Simulation / Verification Controls */}
        <div className="pt-2 border-t border-[#EAE8E3] dark:border-slate-700 flex gap-2">
          {isAccepted ? (
            <button
              onClick={startTrip}
              className="flex-1 h-11 rounded-xl bg-primary text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Trip</span>
            </button>
          ) : (
            <button
              onClick={completeTrip}
              className="flex-1 h-11 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Complete Trip</span>
            </button>
          )}

          <button
            onClick={cancelRide}
            className="px-4 h-11 rounded-xl bg-surface-muted dark:bg-slate-700 text-ink-secondary text-xs font-semibold hover:text-red-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
