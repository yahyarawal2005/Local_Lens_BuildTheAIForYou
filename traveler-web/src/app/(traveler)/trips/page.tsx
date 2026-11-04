'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useItinerary } from '@/context/ItineraryContext';
import {
  Calendar,
  MapPin,
  Clock,
  ArrowRight,
  PlusCircle,
  CheckCircle2,
  Trash2,
  Sparkles,
  IndianRupee,
  Compass,
} from 'lucide-react';

export default function TripsPage() {
  const { savedTrips, generatedItinerary, deleteTrip } = useItinerary();
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  const allTrips = savedTrips.length > 0 ? savedTrips : generatedItinerary ? [generatedItinerary] : [];

  const filteredTrips = allTrips.filter((t) => {
    const isDone = t.items.length > 0 && t.items.every((i) => i.isCompleted);
    if (filter === 'completed') return isDone;
    if (filter === 'active') return !isDone;
    return true;
  });

  const totalStops = allTrips.reduce((acc, t) => acc + t.items.length, 0);
  const totalCompleted = allTrips.reduce(
    (acc, t) => acc + t.items.filter((i) => i.isCompleted).length,
    0
  );

  function confirmDelete(id: string) {
    deleteTrip(id);
    setTripToDelete(null);
  }

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-soft dark:bg-primary/20 text-primary mb-2 text-xs font-bold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Personalized Journey Hub</span>
          </div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#1A1A1A] dark:text-white">
            My Itineraries & Journeys
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary dark:text-slate-400 mt-0.5">
            View, resume, and manage your synthesized travel routes.
          </p>
        </div>

        <Link
          href="/itinerary/create"
          className="px-5 py-3 rounded-2xl bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold shadow-soft flex items-center gap-2 self-start sm:self-auto active:scale-95 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Itinerary</span>
        </Link>
      </div>

      {/* Travel Summary Metrics */}
      {allTrips.length > 0 && (
        <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft text-center">
          <div>
            <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 uppercase tracking-wider block">
              Planned Trips
            </span>
            <span className="font-display font-black text-xl sm:text-2xl text-primary mt-0.5 block">
              {allTrips.length}
            </span>
          </div>
          <div className="border-x border-[#EAE8E3] dark:border-slate-700">
            <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 uppercase tracking-wider block">
              Total Stops
            </span>
            <span className="font-display font-black text-xl sm:text-2xl text-[#1A1A1A] dark:text-white mt-0.5 block">
              {totalStops}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-extrabold text-ink-secondary dark:text-slate-400 uppercase tracking-wider block">
              Visited Spots
            </span>
            <span className="font-display font-black text-xl sm:text-2xl text-emerald-600 mt-0.5 block">
              {totalCompleted}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAE8E3] dark:border-slate-800 pb-2">
        {[
          { id: 'all', label: 'All Trips' },
          { id: 'active', label: 'In Progress / Upcoming' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === tab.id
                ? 'bg-[#1A1A1A] text-white dark:bg-primary shadow-sm'
                : 'text-ink-secondary dark:text-slate-400 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Trips Cards List */}
      {filteredTrips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredTrips.map((trip) => {
            const completedCount = trip.items.filter((i) => i.isCompleted).length;
            const progress = trip.items.length > 0 ? (completedCount / trip.items.length) * 100 : 0;
            const isCompleted = trip.items.length > 0 && completedCount === trip.items.length;
            const coverImage = trip.items[0]?.image || '/assets/images/destinations/heritage_walk.png';

            return (
              <div
                key={trip.id}
                className="group rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft hover:shadow-floating transition-all duration-300 flex flex-col justify-between"
              >
                {/* Destination Cover Banner */}
                <div className="relative aspect-[21/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                  <Image
                    src={coverImage}
                    alt={trip.destination}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-xs font-bold text-primary shadow-sm">
                      {trip.destination}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-[10px] font-semibold text-white">
                      {trip.tripDate}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <h3 className="font-display font-extrabold text-lg text-white">
                      {trip.destination} Day Itinerary
                    </h3>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between text-xs text-ink-secondary dark:text-slate-400">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {trip.items.length} Stops ({trip.startTime} - {trip.endTime})
                    </span>
                    <span className="font-extrabold text-[#1A1A1A] dark:text-white">
                      ₹{trip.totalEstimatedCost}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold mb-1 text-ink-secondary dark:text-slate-400">
                      <span>Trip Progress</span>
                      <span>
                        {completedCount} of {trip.items.length} spots visited
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-muted dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#EAE8E3] dark:border-slate-700/60 flex items-center justify-between">
                    <button
                      onClick={() => setTripToDelete(trip.id)}
                      className="text-xs text-ink-muted hover:text-red-500 transition-colors flex items-center gap-1 p-1"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Remove</span>
                    </button>

                    <Link
                      href={`/itinerary/${trip.id}`}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
                    >
                      <span>Open Timeline</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 space-y-3">
          <Calendar className="w-12 h-12 text-ink-muted dark:text-slate-600 mx-auto" />
          <h3 className="font-display font-bold text-lg text-[#1A1A1A] dark:text-white">
            No Itineraries Found
          </h3>
          <p className="text-xs text-ink-secondary dark:text-slate-400 max-w-xs mx-auto">
            Plan your first custom journey with our intelligent AI itinerary generator!
          </p>
          <Link
            href="/itinerary/create"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Itinerary</span>
          </Link>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-800 p-6 border border-[#EAE8E3] dark:border-slate-700 shadow-floating space-y-4">
            <h3 className="font-display font-bold text-lg text-[#1A1A1A] dark:text-white">
              Delete Itinerary?
            </h3>
            <p className="text-xs text-ink-secondary dark:text-slate-400">
              Are you sure you want to remove this trip? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 rounded-xl bg-surface-muted dark:bg-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDelete(tripToDelete)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-bold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
