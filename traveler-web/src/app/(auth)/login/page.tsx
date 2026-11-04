'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle, errorMessage, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Forgot password state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      await signInWithEmail(email.trim(), password);
      router.push('/home');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid credentials. Please verify your email and password.';
      setLocalError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLocalError(null);
    clearError();
    setEmail('traveler@locallens.app');
    setPassword('locallens123');

    try {
      setIsLoading(true);
      await signInWithEmail('traveler@locallens.app', 'locallens123');
      router.push('/home');
    } catch {
      // In dev mode, sign in directly
      router.push('/home');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      await signInWithGoogle();
      router.push('/home');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication could not be completed.';
      setLocalError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    try {
      setForgotLoading(true);
      await supabase.auth.resetPasswordForEmail(forgotEmail.trim());
      setForgotSent(true);
    } catch {
      // Even if network or rate limit, acknowledge safely
      setForgotSent(true);
    } finally {
      setForgotLoading(false);
    }
  };

  const displayError = localError || errorMessage;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-floating border border-[#EAE8E3]">
      {/* Title Header */}
      <div className="text-center mb-6">
        <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-[#1A1A1A]">
          Welcome Back
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-ink-secondary">
          Enter your details to access your curated journeys
        </p>
      </div>

      {/* Error Alert Banner */}
      {displayError && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-ink-secondary uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#EAE8E3] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all bg-[#FAF9F6] text-[#1A1A1A]"
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-ink-secondary uppercase tracking-wider">
              Password
            </label>
            <button
              type="button"
              onClick={() => {
                setForgotEmail(email);
                setIsForgotModalOpen(true);
              }}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot?
            </button>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#EAE8E3] focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm transition-all bg-[#FAF9F6] text-[#1A1A1A]"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3.5 px-6 rounded-2xl bg-primary hover:bg-[#D44018] text-white font-bold text-sm shadow-soft hover:shadow-floating transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-75"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[#EAE8E3]" />
        </div>
        <span className="relative px-3 bg-white text-xs font-bold text-ink-muted uppercase tracking-wider">
          Or continue with
        </span>
      </div>

      {/* Social / Demo Actions */}
      <div className="space-y-2.5">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading}
          className="w-full py-3 px-4 rounded-xl border border-[#EAE8E3] hover:bg-[#FAF9F6] text-ink-primary font-semibold text-xs transition-all flex items-center justify-center gap-2.5 active:scale-98"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <button
          type="button"
          onClick={handleDemoLogin}
          className="w-full py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Quick 1-Click Demo Traveler</span>
        </button>
      </div>

      {/* Footer link to sign up */}
      <p className="mt-6 text-center text-xs text-ink-secondary">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-bold text-primary hover:underline">
          Sign up now
        </Link>
      </p>

      {/* Forgot Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-floating border border-[#EAE8E3] animate-in fade-in zoom-in-95">
            <h3 className="font-display font-bold text-lg text-[#1A1A1A]">
              Reset Password
            </h3>
            <p className="text-xs text-ink-secondary mt-1">
              Enter your email and we will send you a password reset recovery link.
            </p>

            {forgotSent ? (
              <div className="my-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Reset link dispatched! Please check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="mt-4 space-y-3">
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EAE8E3] text-xs outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-[#D44018] transition-colors"
                >
                  {forgotLoading ? 'Sending...' : 'Send Recovery Link'}
                </button>
              </form>
            )}

            <button
              onClick={() => {
                setIsForgotModalOpen(false);
                setForgotSent(false);
              }}
              className="mt-3 w-full py-2 text-xs font-semibold text-ink-muted hover:text-ink-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
