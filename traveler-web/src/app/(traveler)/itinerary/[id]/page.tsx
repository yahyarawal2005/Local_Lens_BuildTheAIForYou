'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useItinerary } from '@/context/ItineraryContext';
import { useRide } from '@/context/RideContext';
import { GroqService } from '@/lib/groq';
import {
  ArrowLeft,
  Clock,
  MapPin,
  Car,
  Compass,
  Sparkles,
  Send,
  Navigation,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  X,
  Share2,
} from 'lucide-react';
import { MapMarkerPoint } from '@/components/maps/InteractiveMap';

const InteractiveMap = dynamic(
  () => import('@/components/maps/InteractiveMap').then((m) => m.InteractiveMap),
  { ssr: false, loading: () => <div className="h-64 w-full rounded-2xl bg-black/5 animate-pulse" /> }
);

export default function GeneratedItineraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const {
    generatedItinerary,
    savedTrips,
    optimizeCurrentItinerary,
    applyOptimizationChanges,
    completeExperience,
  } = useItinerary();
  const { setLocations } = useRide();

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    {
      role: 'assistant',
      content:
        'Namaste! 🙏 I am LocalLens Saathi. Would you like to adjust this itinerary, swap categories, ask about food nearby, or find the fastest route?',
    },
  ]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Match itinerary from context or savedTrips
  const itinerary =
    generatedItinerary?.id === resolvedParams.id
      ? generatedItinerary
      : savedTrips.find((t) => t.id === resolvedParams.id) || generatedItinerary;

  if (!itinerary) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-bold">Itinerary not found</h2>
        <Link href="/itinerary/create" className="text-primary font-semibold mt-2 inline-block">
          Create New Itinerary
        </Link>
      </div>
    );
  }

  const mapMarkers: MapMarkerPoint[] = itinerary.items
    .filter((item) => item.latitude && item.longitude)
    .map((item, idx) => ({
      id: item.id,
      name: item.experienceName,
      category: item.category,
      latitude: item.latitude!,
      longitude: item.longitude!,
      orderNumber: idx + 1,
    }));

  async function handleSendChatMessage(e: React.FormEvent) {
    e.preventDefault();
    const prompt = chatPrompt.trim();
    if (!prompt || isAiLoading || !itinerary) return;

    setChatMessages((prev) => [...prev, { role: 'user', content: prompt }]);
    setChatPrompt('');
    setIsAiLoading(true);

    try {
      const result = await GroqService.analyzeRequest({
        prompt,
        destination: itinerary.destination,
        currentInterests: itinerary.items.map((i) => i.category),
        budget: itinerary.totalEstimatedCost,
        durationHours: itinerary.totalDurationMinutes / 60,
        currentPlaceNames: itinerary.items.map((i) => i.experienceName),
        placesDetails: itinerary.items.map((i) => ({
          name: i.experienceName,
          category: i.category,
          location: i.location,
          description: i.description,
          price_inr: i.price,
          time_window: `${i.startTime} - ${i.endTime}`,
        })),
      });

      setChatMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);

      if (result.shouldRegenerate || result.hasInterestChanges) {
        applyOptimizationChanges({
          removeInterests: result.removeInterests,
          addInterests: result.addInterests,
          customNotes: result.customNotes,
          budget: result.updatedBudget,
          durationHours: result.updatedDurationHours,
        });
      } else if (result.isRouteReorderOnly) {
        await optimizeCurrentItinerary();
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I have noted your preferences and updated the recommendations for your journey!',
        },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  }

  function handleBookRideForStop(pickup: string, drop: string, lat?: number | null, lng?: number | null) {
    setLocations({
      pickup,
      drop,
      dropLat: lat ?? undefined,
      dropLng: lng ?? undefined,
    });
    router.push('/rides/book');
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 hover:border-primary/40 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-primary text-white uppercase tracking-wider">
                Active Itinerary
              </span>
              <span className="text-xs text-ink-secondary dark:text-slate-400">{itinerary.tripDate}</span>
            </div>
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1A1A1A] dark:text-white mt-0.5">
              {itinerary.destination} Discovery Route
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => optimizeCurrentItinerary()}
            className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:border-primary/40 transition-colors"
            title="Optimize route order for minimum transit"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            <span>Fastest Route</span>
          </button>

          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold flex items-center gap-1.5 hover:bg-primary-dark transition-colors shadow-soft"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Saathi AI Chat</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft">
        <div>
          <span className="text-[11px] font-bold text-ink-secondary dark:text-slate-400 block uppercase">
            Stops
          </span>
          <span className="font-display font-extrabold text-lg text-[#1A1A1A] dark:text-white">
            {itinerary.items.length} Planned
          </span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-ink-secondary dark:text-slate-400 block uppercase">
            Time Window
          </span>
          <span className="font-display font-extrabold text-lg text-[#1A1A1A] dark:text-white">
            {itinerary.startTime} - {itinerary.endTime}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-ink-secondary dark:text-slate-400 block uppercase">
            Total Expense
          </span>
          <span className="font-display font-extrabold text-lg text-primary">
            ₹{itinerary.totalEstimatedCost}
          </span>
        </div>
        <div>
          <span className="text-[11px] font-bold text-ink-secondary dark:text-slate-400 block uppercase">
            Est. Transport
          </span>
          <span className="font-display font-extrabold text-lg text-[#1A1A1A] dark:text-white">
            ₹{itinerary.estimatedTransportCost}
          </span>
        </div>
      </div>

      {/* Budget Warning Banner if Exceeded */}
      {itinerary.budgetExceeded && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-xs font-medium">
            {itinerary.budgetWarning || 'Estimated cost exceeds original budget target. You can adjust stops below.'}
          </p>
        </div>
      )}

      {/* Map Toggle & Interactive Route View */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white">
            Geographic Route Sequence
          </h3>
          <button
            onClick={() => setShowMap(!showMap)}
            className="text-xs font-semibold text-primary flex items-center gap-1"
          >
            <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            {showMap ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showMap && (
          <div className="h-64 sm:h-80 rounded-3xl overflow-hidden border border-[#EAE8E3] dark:border-slate-700 shadow-soft">
            <InteractiveMap
              markers={mapMarkers}
              center={
                mapMarkers.length > 0
                  ? [mapMarkers[0].latitude, mapMarkers[0].longitude]
                  : [itinerary.startLat || 20.5937, itinerary.startLon || 78.9629]
              }
              zoom={13}
              showPolyline={true}
              className="w-full h-full"
            />
          </div>
        )}
      </div>

      {/* Chronological Timeline Stops */}
      <div className="space-y-4">
        <h3 className="font-display font-bold text-lg text-[#1A1A1A] dark:text-white">
          Scheduled Timeline Stops
        </h3>

        <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#EAE8E3] dark:before:bg-slate-700">
          {itinerary.items.map((item, idx) => {
            const isCompleted = item.isCompleted;

            return (
              <div key={item.id} className="relative pl-14 group">
                {/* Node order number circle */}
                <div
                  className={`absolute left-2.5 top-5 -translate-x-1/2 w-8 h-8 rounded-full border-2 flex items-center justify-center font-black text-xs z-10 transition-colors ${
                    isCompleted
                      ? 'bg-emerald-600 border-white text-white'
                      : 'bg-primary border-white text-white shadow-soft'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>

                {/* Card Container */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-800 border border-[#EAE8E3] dark:border-slate-700 shadow-soft hover:shadow-floating transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 shrink-0">
                      <Image
                        src={item.image || '/assets/images/destinations/food_trail.png'}
                        alt={item.experienceName}
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">
                          {item.timeWindow || `${item.startTime} - ${item.endTime}`}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted dark:bg-slate-700 text-ink-secondary dark:text-slate-300">
                          {item.category}
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-base sm:text-lg text-[#1A1A1A] dark:text-white mt-0.5">
                        {item.experienceName}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-ink-secondary dark:text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary" />
                          <span className="truncate max-w-[150px] sm:max-w-xs">{item.location}</span>
                        </span>
                        <span>•</span>
                        <span className="font-extrabold text-[#1A1A1A] dark:text-white">₹{item.price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for this stop */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#EAE8E3] dark:border-slate-700">
                    <button
                      onClick={() =>
                        handleBookRideForStop(
                          idx === 0 ? 'My Location' : itinerary.items[idx - 1].experienceName,
                          item.experienceName,
                          item.latitude,
                          item.longitude
                        )
                      }
                      className="p-2.5 rounded-xl bg-surface-muted dark:bg-slate-700 hover:bg-primary-soft dark:hover:bg-primary/20 text-ink dark:text-white hover:text-primary transition-colors text-xs font-semibold flex items-center gap-1"
                      title="Book ride to this stop"
                    >
                      <Car className="w-4 h-4 text-primary" />
                      <span className="hidden sm:inline">Ride</span>
                    </button>

                    <button
                      onClick={() => completeExperience(item.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white dark:bg-slate-700 border border-[#EAE8E3] dark:border-slate-600 text-ink dark:text-white hover:border-primary/40'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isCompleted ? 'Completed' : 'Check In'}</span>
                    </button>
                  </div>
                </div>

                {/* Transit Time between stops */}
                {idx < itinerary.items.length - 1 && item.travelToNextMinutes > 0 && (
                  <div className="flex items-center gap-2 py-2 text-[11px] text-ink-secondary dark:text-slate-400 font-semibold pl-2">
                    <Car className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {item.travelToNextMinutes} mins transit (~{item.travelToNextDistanceKm} km) to next stop
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-[#EAE8E3] dark:border-slate-800 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-ink-secondary dark:text-slate-400 block">
              Trip Total
            </span>
            <span className="font-display font-extrabold text-xl text-primary">
              ₹{itinerary.totalEstimatedCost}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/trips/live"
              className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-soft active:scale-95 transition-all"
            >
              <Navigation className="w-4 h-4" />
              <span>Start Live Trip Mode</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Saathi AI Chat Sheet Modal */}
      {isChatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-floating border border-[#EAE8E3] dark:border-slate-700 flex flex-col h-[75vh] max-h-[600px] overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 px-5 border-b border-[#EAE8E3] dark:border-slate-700 flex items-center justify-between bg-surface-muted dark:bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center shadow-soft">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-[#1A1A1A] dark:text-white">
                    LocalLens Saathi (साथी)
                  </h4>
                  <p className="text-[11px] text-ink-secondary dark:text-slate-400">
                    Indian Travel Guide & Itinerary Optimizer
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsChatOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5 text-ink-secondary" />
              </button>
            </div>

            {/* Chat Body Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-white rounded-br-none'
                        : 'bg-surface-muted dark:bg-slate-700/70 text-[#1A1A1A] dark:text-white rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-2xl bg-surface-muted dark:bg-slate-700 text-xs text-ink-secondary flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary animate-spin" />
                    <span>Saathi is analyzing your trip...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChatMessage} className="p-3 border-t border-[#EAE8E3] dark:border-slate-700 flex gap-2">
              <input
                type="text"
                value={chatPrompt}
                onChange={(e) => setChatPrompt(e.target.value)}
                placeholder="Ask about places or ask to swap stops..."
                className="flex-1 h-11 px-4 rounded-xl bg-surface-muted dark:bg-slate-700 border-none focus:outline-none focus:ring-2 focus:ring-primary/40 text-xs sm:text-sm text-[#1A1A1A] dark:text-white"
              />
              <button
                type="submit"
                disabled={!chatPrompt.trim() || isAiLoading}
                className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
