// ==============================================================================
// LocalLens Web - Client-side Storage Utility
// Matches SharedPreferences behavior from traveler-app
// ==============================================================================

import { UserProfile, Itinerary } from '@/types';

const KEYS = {
  LOGGED_IN: 'locallens_is_logged_in',
  USER_ID: 'locallens_user_id',
  USER_EMAIL: 'locallens_user_email',
  USER_NAME: 'locallens_user_name',
  USER_ROLE: 'locallens_user_role',
  USER_PHOTO: 'locallens_user_photo',
  SAVED_TRIPS: 'locallens_saved_trips',
  SAVED_WISHLIST: 'locallens_saved_wishlist',
  WEATHER_OVERRIDE: 'locallens_weather_override',
  ACTIVE_RIDE: 'locallens_active_ride',
};

export const StorageService = {
  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(KEYS.LOGGED_IN) === 'true';
  },

  getCachedUserProfile(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const isLoggedIn = this.isLoggedIn();
    if (!isLoggedIn) return null;

    const id = localStorage.getItem(KEYS.USER_ID) || 'local_user';
    const email = localStorage.getItem(KEYS.USER_EMAIL) || 'traveler@locallens.app';
    const displayName = localStorage.getItem(KEYS.USER_NAME) || 'Traveler';
    const role = (localStorage.getItem(KEYS.USER_ROLE) as any) || 'traveler';
    const photoUrl = localStorage.getItem(KEYS.USER_PHOTO) || null;

    return {
      id,
      email,
      displayName,
      role,
      photoUrl,
    };
  },

  setLoggedIn(params: {
    loggedIn: boolean;
    id?: string;
    email?: string;
    name?: string;
    photoUrl?: string | null;
    role?: string;
  }): void {
    if (typeof window === 'undefined') return;

    if (params.loggedIn) {
      localStorage.setItem(KEYS.LOGGED_IN, 'true');
      if (params.id) localStorage.setItem(KEYS.USER_ID, params.id);
      if (params.email) localStorage.setItem(KEYS.USER_EMAIL, params.email);
      if (params.name) localStorage.setItem(KEYS.USER_NAME, params.name);
      if (params.role) localStorage.setItem(KEYS.USER_ROLE, params.role);
      if (params.photoUrl) localStorage.setItem(KEYS.USER_PHOTO, params.photoUrl);
    } else {
      localStorage.removeItem(KEYS.LOGGED_IN);
      localStorage.removeItem(KEYS.USER_ID);
      localStorage.removeItem(KEYS.USER_EMAIL);
      localStorage.removeItem(KEYS.USER_NAME);
      localStorage.removeItem(KEYS.USER_ROLE);
      localStorage.removeItem(KEYS.USER_PHOTO);
    }
  },

  getSavedTrips(): Itinerary[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(KEYS.SAVED_TRIPS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveTrips(trips: Itinerary[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(KEYS.SAVED_TRIPS, JSON.stringify(trips));
    } catch {}
  },

  getSavedWishlist(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(KEYS.SAVED_WISHLIST);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  toggleWishlist(experienceId: string): string[] {
    const current = this.getSavedWishlist();
    let updated: string[];
    if (current.includes(experienceId)) {
      updated = current.filter((id) => id !== experienceId);
    } else {
      updated = [...current, experienceId];
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEYS.SAVED_WISHLIST, JSON.stringify(updated));
    }
    return updated;
  },
};
