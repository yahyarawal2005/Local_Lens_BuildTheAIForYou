'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  CloudRain,
  MapPin,
  Car,
  Sparkles,
  CheckCheck,
  ChevronRight,
  Clock,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  category: 'trip' | 'ride' | 'weather' | 'ai';
  title: string;
  message: string;
  timeAgo: string;
  isRead: boolean;
  link?: string;
}

const initialNotifications: NotificationItem[] = [
  {
    id: 'n1',
    category: 'weather',
    title: 'Monsoon Alert in Alibaug Coast',
    message: 'Sudden rain advisory active near Varsoli Beach. LocalLens AI has suggested indoor heritage museum stops.',
    timeAgo: '10m ago',
    isRead: false,
    link: '/explore',
  },
  {
    id: 'n2',
    category: 'ride',
    title: 'Lens Ride Confirmed',
    message: 'Your Eco Rickshaw pilot Rajesh (MH-06-AB-2041) is arriving in 4 mins at Colaba Causeway.',
    timeAgo: '25m ago',
    isRead: false,
    link: '/rides/live',
  },
  {
    id: 'n3',
    category: 'ai',
    title: 'Saathi Companion Insight',
    message: 'The local fish market auction near Kashid jetty opens in 30 minutes! Perfect timing for street photography.',
    timeAgo: '1h ago',
    isRead: true,
    link: '/itinerary/create',
  },
  {
    id: 'n4',
    category: 'trip',
    title: 'Itinerary Optimized: Jaipur Sunrise Walk',
    message: 'Route order updated to avoid peak tourist congestion at Amber Fort between 9:00 AM - 11:30 AM.',
    timeAgo: '3h ago',
    isRead: true,
    link: '/trips',
  },
  {
    id: 'n5',
    category: 'trip',
    title: 'Welcome to LocalLens!',
    message: 'Your intelligent travel assistant is ready. Swipe through recommendations or book rides anytime.',
    timeAgo: '1d ago',
    isRead: true,
    link: '/welcome',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<'all' | 'trip' | 'ride' | 'weather' | 'ai'>('all');

  const filtered = notifications.filter(
    (n) => activeFilter === 'all' || n.category === activeFilter
  );

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getCategoryIcon = (category: NotificationItem['category']) => {
    switch (category) {
      case 'weather':
        return <CloudRain className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'ride':
        return <Car className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'ai':
        return <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'trip':
      default:
        return <MapPin className="w-4 h-4 text-primary" />;
    }
  };

  const getCategoryBg = (category: NotificationItem['category']) => {
    switch (category) {
      case 'weather':
        return 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800';
      case 'ride':
        return 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800';
      case 'ai':
        return 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800';
      case 'trip':
      default:
        return 'bg-primary/10 border-primary/20';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/home"
            className="p-2 rounded-xl bg-surface-muted hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-ink-primary dark:text-white" />
          </Link>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ink-secondary">
              Travel Alert Center
            </span>
            <h1 className="font-display font-bold text-xl text-[#1A1A1A] dark:text-white">
              Notifications
            </h1>
          </div>
        </div>

        <button
          onClick={markAllAsRead}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-muted hover:bg-black/5 dark:hover:bg-white/10 text-xs font-semibold text-ink-secondary dark:text-slate-300 transition-colors"
        >
          <CheckCheck className="w-3.5 h-3.5 text-primary" />
          <span>Mark all read</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-5">
        {[
          { id: 'all', label: 'All Alerts' },
          { id: 'weather', label: 'Weather & Disruption' },
          { id: 'ride', label: 'Lens Rides' },
          { id: 'trip', label: 'Itineraries' },
          { id: 'ai', label: 'Saathi AI' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeFilter === tab.id
                ? 'bg-primary text-white shadow-soft'
                : 'bg-white dark:bg-slate-900 border border-[#EAE8E3] dark:border-slate-800 text-ink-secondary dark:text-slate-300 hover:border-primary/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-[#EAE8E3] dark:border-slate-800">
          <Bell className="w-10 h-10 text-ink-muted mx-auto mb-3 opacity-40" />
          <h3 className="font-display font-bold text-base text-[#1A1A1A] dark:text-white">
            No notifications in this category
          </h3>
          <p className="text-xs text-ink-secondary dark:text-slate-400 mt-1">
            You are all caught up with your latest travel alerts.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border transition-all hover:shadow-card flex items-start gap-3.5 ${
                item.isRead
                  ? 'border-[#EAE8E3] dark:border-slate-800'
                  : 'border-primary/30 shadow-soft bg-gradient-to-r from-primary/[0.02] to-transparent'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${getCategoryBg(
                  item.category
                )}`}
              >
                {getCategoryIcon(item.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-[#1A1A1A] dark:text-white truncate">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Clock className="w-3 h-3 text-ink-muted" />
                    <span className="text-[11px] font-semibold text-ink-muted">
                      {item.timeAgo}
                    </span>
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </div>

                <p className="text-xs text-ink-secondary dark:text-slate-300 mt-1 leading-relaxed">
                  {item.message}
                </p>

                {item.link && (
                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary mt-2.5 hover:underline"
                  >
                    <span>View details</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
