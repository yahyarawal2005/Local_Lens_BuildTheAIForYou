'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, AuthStatus, UserRole } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { StorageService } from '@/lib/storage';

interface AuthContextType {
  status: AuthStatus;
  user: UserProfile | null;
  errorMessage: string | null;
  signInWithEmail: (email: string, pass: string) => Promise<UserProfile>;
  signUpWithEmail: (email: string, pass: string, fullName?: string) => Promise<UserProfile>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      // 1. Check local cached user first for instantaneous UI render
      const cached = StorageService.getCachedUserProfile();
      if (cached) {
        setUser(cached);
        setStatus('authenticated');
      }

      // 2. Check Supabase session if configured
      if (isSupabaseConfigured()) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await resolveProfile(session.user);
            setUser(profile);
            setStatus('authenticated');
            StorageService.setLoggedIn({
              loggedIn: true,
              id: profile.id,
              email: profile.email,
              name: profile.displayName,
              photoUrl: profile.photoUrl,
              role: profile.role,
            });
          } else if (!cached) {
            setStatus('unauthenticated');
          }
        } catch {
          if (!cached) setStatus('unauthenticated');
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            const profile = await resolveProfile(session.user);
            setUser(profile);
            setStatus('authenticated');
            StorageService.setLoggedIn({
              loggedIn: true,
              id: profile.id,
              email: profile.email,
              name: profile.displayName,
              photoUrl: profile.photoUrl,
              role: profile.role,
            });
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setStatus('unauthenticated');
            StorageService.setLoggedIn({ loggedIn: false });
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } else {
        if (!cached) setStatus('unauthenticated');
      }
    }

    initAuth();
  }, []);

  async function resolveProfile(supaUser: any): Promise<UserProfile> {
    const meta = supaUser.user_metadata || {};
    const displayName = meta.full_name || meta.name || supaUser.email?.split('@')[0] || 'Traveler';
    const photoUrl = meta.avatar_url || meta.picture || null;
    const role: UserRole = meta.role === 'provider' ? 'provider' : meta.role === 'rider' ? 'rider' : 'traveler';

    // Attempt to read or write profile in Supabase table
    try {
      const { data } = await supabase.from('profiles').select().eq('id', supaUser.id).maybeSingle();
      if (data) {
        return {
          id: data.id,
          email: data.email || supaUser.email,
          displayName: data.display_name || displayName,
          photoUrl: data.photo_url || photoUrl,
          role: (data.role as UserRole) || role,
        };
      }
    } catch {}

    return {
      id: supaUser.id,
      email: supaUser.email || '',
      displayName,
      photoUrl,
      role,
    };
  }

  async function signInWithEmail(email: string, pass: string): Promise<UserProfile> {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured()) {
      const fallback: UserProfile = {
        id: `local_${Date.now()}`,
        email: cleanEmail,
        displayName: cleanEmail.split('@')[0],
        role: 'traveler',
        photoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIq8x4d16wV9P-b2Wk?s=96-c',
      };
      setUser(fallback);
      setStatus('authenticated');
      StorageService.setLoggedIn({
        loggedIn: true,
        id: fallback.id,
        email: fallback.email,
        name: fallback.displayName,
        photoUrl: fallback.photoUrl,
        role: fallback.role,
      });
      return fallback;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });
      if (error) throw error;
      if (data.user) {
        const profile = await resolveProfile(data.user);
        setUser(profile);
        setStatus('authenticated');
        StorageService.setLoggedIn({
          loggedIn: true,
          id: profile.id,
          email: profile.email,
          name: profile.displayName,
          photoUrl: profile.photoUrl,
          role: profile.role,
        });
        return profile;
      }
      throw new Error('User not found');
    } catch (err: any) {
      const msg = err.message || 'Authentication failed';
      setErrorMessage(msg);
      throw err;
    }
  }

  async function signUpWithEmail(email: string, pass: string, fullName?: string): Promise<UserProfile> {
    setErrorMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    const displayName = fullName?.trim() || cleanEmail.split('@')[0];

    if (!isSupabaseConfigured()) {
      const fallback: UserProfile = {
        id: `local_${Date.now()}`,
        email: cleanEmail,
        displayName,
        role: 'traveler',
        photoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIq8x4d16wV9P-b2Wk?s=96-c',
      };
      setUser(fallback);
      setStatus('authenticated');
      StorageService.setLoggedIn({
        loggedIn: true,
        id: fallback.id,
        email: fallback.email,
        name: fallback.displayName,
        photoUrl: fallback.photoUrl,
        role: fallback.role,
      });
      return fallback;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            full_name: displayName,
            role: 'traveler',
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        const profile = await resolveProfile(data.user);
        setUser(profile);
        setStatus('authenticated');
        StorageService.setLoggedIn({
          loggedIn: true,
          id: profile.id,
          email: profile.email,
          name: profile.displayName,
          photoUrl: profile.photoUrl,
          role: profile.role,
        });
        return profile;
      }
      return await signInWithEmail(cleanEmail, pass);
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      setErrorMessage(msg);
      throw err;
    }
  }

  async function signInWithGoogle(): Promise<void> {
    if (!isSupabaseConfigured()) {
      const mockGoogle: UserProfile = {
        id: `google_${Date.now()}`,
        email: 'traveler.google@locallens.app',
        displayName: 'Google Traveler',
        role: 'traveler',
        photoUrl: 'https://lh3.googleusercontent.com/a/ACg8ocIq8x4d16wV9P-b2Wk?s=96-c',
      };
      setUser(mockGoogle);
      setStatus('authenticated');
      StorageService.setLoggedIn({
        loggedIn: true,
        id: mockGoogle.id,
        email: mockGoogle.email,
        name: mockGoogle.displayName,
        photoUrl: mockGoogle.photoUrl,
        role: mockGoogle.role,
      });
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/home`,
      },
    });
    if (error) throw error;
  }

  async function signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    setStatus('unauthenticated');
    StorageService.setLoggedIn({ loggedIn: false });
  }

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        errorMessage,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        clearError: () => setErrorMessage(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
