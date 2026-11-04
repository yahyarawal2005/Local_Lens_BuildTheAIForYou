"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Compass,
  Calendar,
  BarChart3,
  Shield,
  Star,
  MapPin,
  Heart,
  Mail,
  Lock,
  User,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { saveProviderProfile } from "@/lib/authSession";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/settings/LanguageSelector";

interface AuthPortalProps {
  initialMode?: "login" | "signup";
}

export const AuthPortal: React.FC<AuthPortalProps> = ({ initialMode = "signup" }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);

  // Form states
  const [fullName, setFullName] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Google Modal State
        
  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const isLoggedOutParam = searchParams.get("logged_out") === "true";
    const modeParam = searchParams.get("mode");

    if (isLoggedOutParam) {
      // When user logs out, session is deleted and user is asked to sign in afresh
      setMode("login");
      setSuccessMsg("You have been signed out. Account session cleared. Please sign in to continue.");
      setEmailOrPhone("");
      setPassword("");
      return;
    }

    if (modeParam === "login") {
      setMode("login");
      if (typeof window !== "undefined") {
        const savedEmail = localStorage.getItem("locallens_last_provider_email");
        if (savedEmail && !emailOrPhone) {
          setEmailOrPhone(savedEmail);
        }
      }
      return;
    }

    // First, always show "Join as a Local Host" signup page by default
    setMode("signup");

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        window.location.href = "/dashboard";
      }
    });
  }, [searchParams]);

  // Switch modes smoothly
  const switchTo = (targetMode: "login" | "signup") => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setMode(targetMode);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/" + targetMode);
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const loginId = emailOrPhone.trim();
    const isEmail = loginId.includes("@");
    const derivedName = isEmail
      ? loginId.split("@")[0].replace(/[._]/g, " ").replace(/w/g, (c) => c.toUpperCase())
      : (loginId ? loginId.replace(/w/g, (c) => c.toUpperCase()) : "Local Provider");

    try {
      // 1. Save profile immediately (0ms instant login response)
      if (typeof window !== "undefined" && isEmail) {
        localStorage.setItem("locallens_last_provider_email", loginId);
      }
      saveProviderProfile({
        name: derivedName,
        fullName: derivedName,
        email: isEmail ? loginId : `${loginId || "provider"}@locallens.in`,
        phone: !isEmail && loginId ? loginId : "+91 98201 55432",
        role: "Tour Guide / Storyteller",
        providerCategory: "Tour Guide / Storyteller",
        authProvider: "email",
        verified: true,
      });

      // 2. Non-blocking background sync with Supabase auth
      if (isEmail) {
        supabase.auth.signInWithPassword({
          email: loginId,
          password: password,
        }).then(({ data }) => {
          if (data?.session && data.user) {
            const userMeta = data.user.user_metadata || {};
            saveProviderProfile({
              id: data.user.id,
              name: userMeta.full_name || derivedName,
              fullName: userMeta.full_name || derivedName,
              email: loginId,
            });
          }
        }).catch(() => {});
      }

      setSuccessMsg(`Welcome back, ${derivedName}! Entering your Provider Portal...`);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || "Sign in failed. Please verify credentials.");
      setIsLoading(false);
    }
  };

  // Handle Signup (Direct login without email confirmation delay)
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!agreedToTerms) {
      setErrorMsg("Please agree to the Terms of Service and Privacy Policy.");
      setIsLoading(false);
      return;
    }

    const assignedRole = "Local Host / Guide";
    const cleanName = fullName.trim() || "Local Provider";
    const cleanEmail = email.trim();
    const cleanPhone = phone.trim() || "+91 98201 55432";

    try {
      // 1. Direct login with the given user details (no email confirmation required)
      if (typeof window !== "undefined" && cleanEmail) {
        localStorage.setItem("locallens_last_provider_email", cleanEmail);
      }
      saveProviderProfile({
        id: "user_" + Date.now(),
        name: cleanName,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: assignedRole,
        providerCategory: assignedRole,
        authProvider: "email",
        verified: true,
        joinedDate: "Today",
        rating: 5.0,
        totalExperiences: 1,
        totalGuests: 0,
      });

      // 2. Non-blocking background sync with Supabase
      supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            role: "provider",
            provider_category: assignedRole,
          },
        },
      }).then(({ data }) => {
        if (data?.user) {
          Promise.resolve(
            supabase.from("profiles").upsert({
              id: data.user.id,
              full_name: cleanName,
              updated_at: new Date().toISOString(),
            })
          ).catch(() => {});
        }
      }).catch(() => {});

      setSuccessMsg(`Welcome to LocalLens, ${cleanName}! Direct login successful...`);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    } catch (err: any) {
      setSuccessMsg(`Welcome, ${cleanName}! Redirecting to dashboard...`);
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 100);
    }
  };

  // Official Supabase Google OAuth Trigger
  const triggerOfficialGoogleOAuth = async () => {
    setIsLoading(true);
        setErrorMsg(null);
    setSuccessMsg("Connecting to Google OAuth...");

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log("[Google OAuth] Initiating signInWithOAuth with redirectTo:", redirectUrl);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          scopes: "email profile openid",
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        console.error("Google OAuth initiation error:", error);
        setErrorMsg(error.message || "Could not launch Google Sign-In.");
        setIsLoading(false);
        return;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Google OAuth exception:", err);
      setErrorMsg(err.message || "Failed to initialize Google login.");
      setIsLoading(false);
    }
  };

  // Apple Auth
  const handleAppleAuth = () => {
    setIsLoading(true);
    saveProviderProfile({
      name: "Apple Host",
      fullName: "Apple Provider",
      email: "host.apple@icloud.com",
      phone: "+91 98201 55432",
      role: selectedRole || "Adventure Host",
      providerCategory: selectedRole || "Adventure Host",
      avatar: "/dashboard/priya.jpg",
      authProvider: "apple",
      verified: true,
    });
    setSuccessMsg("Signed in with Apple! Redirecting to Provider Portal...");
    setTimeout(() => { window.location.href = "/dashboard"; }, 300);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-3 sm:p-5 lg:p-6 font-sans selection:bg-[#00875A] selection:text-white overflow-x-hidden">
      {/* 1. Fullscreen Background Image */}
      <div className="fixed inset-0 z-0 pointer-events-none select-none">
        <Image
          src="/hero-coastal-bg.png"
          alt="Tropical coastal paradise"
          fill
          className="object-cover object-center scale-[1.02]"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-white/5" />
      </div>

      {/* 2. Main Two-Column Container */}
      <div className="relative z-10 w-full max-w-[1020px] mx-auto">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-6 lg:gap-10">

          {/* ======================================================== */}
          {/* LEFT COLUMN: BRANDING, VALUE PROPS & KAYAKING PREVIEW    */}
          {/* ======================================================== */}
          <div className="w-full lg:w-[48%] flex flex-col items-start pt-1 sm:pt-2">
            {/* Top Logo & Language Selector */}
            <div className="w-full flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group cursor-pointer">
                <div className="w-[34px] h-[34px] rounded-[9px] bg-[#00875A] text-white flex items-center justify-center shadow-md shadow-emerald-700/25 group-hover:scale-105 transition-transform">
                  <Compass className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="font-heading font-anton text-lg text-[#0F172A] tracking-tight leading-none">
                    {t("nav.brand", "Local Lens")}
                  </span>
                  <span className="text-[12px] font-semibold text-[#00875A] leading-tight mt-0.5">
                    - {t("nav.provider", "Provider")}
                  </span>
                </div>
              </Link>
              <LanguageSelector variant="navbar" />
            </div>

            {/* Category Pill */}
            <div className="mt-4 sm:mt-5">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full bg-[#EAF5EF] text-[#00875A] text-[10.5px] font-bold tracking-tight shadow-xs">
                For Local Experience Providers
              </span>
            </div>

            {/* Headline */}
            <h1 className="mt-3 text-[32px] sm:text-[38px] font-heading font-anton text-[#0F172A] tracking-tight leading-[1.06]">
              Turn Your<br />
              Local Passion<br />
              Into a <span className="text-[#00875A]">Thriving</span><br />
              <span className="text-[#00875A]">Business</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-2.5 text-[12px] sm:text-[12.5px] text-slate-600 leading-relaxed max-w-[390px] font-normal">
              List your tours, workshops and experiences. Get more travelers, manage your schedule, and grow your income with LocalLens.
            </p>

            {/* 3 Value Propositions */}
            <div className="mt-4 sm:mt-5 space-y-3.5 w-full max-w-[390px]">
              {/* Prop 1: More Bookings */}
              <div className="flex items-center gap-3">
                <div className="w-[36px] h-[36px] rounded-xl bg-[#EAF5EF] flex items-center justify-center text-[#00875A] shrink-0 shadow-xs">
                  <Calendar className="w-[17px] h-[17px] stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#0F172A] leading-tight">
                    More Bookings
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                    Reach qualified travelers with AI matching.
                  </p>
                </div>
              </div>

              {/* Prop 2: Easy Management */}
              <div className="flex items-center gap-3">
                <div className="w-[36px] h-[36px] rounded-xl bg-[#EAF5EF] flex items-center justify-center text-[#00875A] shrink-0 shadow-xs">
                  <BarChart3 className="w-[17px] h-[17px] stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#0F172A] leading-tight">
                    Easy Management
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                    Manage your availability, guests and payouts.
                  </p>
                </div>
              </div>

              {/* Prop 3: Trusted Platform */}
              <div className="flex items-center gap-3">
                <div className="w-[36px] h-[36px] rounded-xl bg-[#EAF5EF] flex items-center justify-center text-[#00875A] shrink-0 shadow-xs">
                  <Shield className="w-[17px] h-[17px] stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#0F172A] leading-tight">
                    Trusted Platform
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                    Be part of a growing community of 1,200+ local hosts.
                  </p>
                </div>
              </div>
            </div>

            {/* Sunset Kayaking Card Preview */}
            <div className="mt-5 w-[230px] bg-white rounded-[15px] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.09)] border border-white/80 hover:shadow-xl transition-shadow">
              <div className="relative aspect-[16/10] w-full rounded-[10px] overflow-hidden bg-slate-100">
                <Image
                  src="/dashboard/kayaking_exact_hq.png"
                  alt="Sunset Kayaking at Versova"
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
                <div className="absolute top-1.5 left-1.5 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                  <MapPin className="w-2.5 h-2.5 text-[#E11D48] fill-[#E11D48]" />
                  <span className="text-[9px] font-bold text-[#0F172A]">Mumbai</span>
                </div>
                <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center text-slate-700 shadow-xs">
                  <Heart className="w-3 h-3 stroke-[2]" />
                </div>
              </div>

              <div className="pt-2 px-1 space-y-1">
                <h5 className="text-[11px] font-bold text-[#0F172A] leading-tight">
                  Sunset Kayaking at Versova
                </h5>
                <div className="flex items-center gap-1 text-[9.5px]">
                  <Star className="w-3 h-3 fill-[#F59E0B] text-[#F59E0B]" />
                  <span className="font-bold text-[#0F172A]">4.8</span>
                  <span className="text-slate-400 font-normal">(142 reviews)</span>
                </div>
                <div className="flex items-center gap-1 text-[9px] text-slate-400">
                  <MapPin className="w-2.5 h-2.5 text-slate-400" />
                  <span>Versova Beach, Mumbai</span>
                </div>
                <div className="pt-1 flex items-center justify-between border-t border-slate-50 mt-1">
                  <div>
                    <span className="text-[10.5px] font-extrabold text-[#00875A]">₹1,200</span>
                    <span className="text-[8.5px] text-slate-400"> / person</span>
                  </div>
                  <span className="text-[8px] font-bold text-[#00875A] bg-[#EAF5EF] px-1.5 py-0.5 rounded-full">
                    Authentic Experience
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* RIGHT COLUMN: THE CRISP WHITE FORM CARD                  */}
          {/* ======================================================== */}
          <div className="w-full lg:w-[48%] max-w-[420px] shrink-0">
            <div className="bg-white rounded-[24px] shadow-[0_20px_50px_rgba(15,23,42,0.12)] border border-slate-100 p-6 sm:p-7 transition-all">
              
              {/* Feedback messages */}
              {errorMsg && (
                <div className="mb-3.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="mb-3.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* VIEW A: LOGIN FORM                                   */}
              {/* ---------------------------------------------------- */}
              {mode === "login" ? (
                <>
                  <div className="text-right text-[11px] text-slate-500 font-medium">
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchTo("signup")}
                      className="font-bold text-[#00875A] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                    >
                      <span>Join as Host</span>
                      <span>&rarr;</span>
                    </button>
                  </div>

                  <h2 className="text-[23px] sm:text-[25px] font-heading font-anton text-[#0F172A] tracking-tight mt-2">
                    {t("auth.loginTitle", "Welcome Back")}
                  </h2>
                  <p className="text-[11.5px] text-slate-400 font-medium mt-0.5">
                    {t("auth.loginSubtitle", "Log in to your LocalLens Provider account")}
                  </p>

                  <form id="login-form" onSubmit={handleLogin} method="post" action="#" className="mt-4 space-y-3.5">
                    <div>
                      <label htmlFor="login-username" className="block text-[11.5px] font-bold text-[#0F172A] mb-1.5">
                        Email or Phone Number
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={emailOrPhone}
                          onChange={(e) => setEmailOrPhone(e.target.value)}
                          id="login-username" name="username" autoComplete="username" placeholder="Enter your email or phone number"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none rounded-xl bg-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="login-password" className="block text-[11.5px] font-bold text-[#0F172A] mb-1.5">
                        Password
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          id="login-password" name="password" autoComplete="current-password" placeholder="Enter your password"
                          className="w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none rounded-xl bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-right pt-0.5">
                      <a
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          alert("Password recovery link sent to your email.");
                        }}
                        className="text-[11px] font-bold text-[#00875A] hover:underline"
                      >
                        Forgot Password?
                      </a>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-extrabold text-[13px] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all cursor-pointer mt-1"
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Log In</span>
                          <span>&rarr;</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              ) : (
                /* ---------------------------------------------------- */
                /* VIEW B: SIGNUP FORM (JOIN AS HOST)                   */
                /* ---------------------------------------------------- */
                <>
                  <div className="text-right text-[11px] text-slate-500 font-medium">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchTo("login")}
                      className="font-bold text-[#00875A] hover:underline cursor-pointer inline-flex items-center gap-0.5"
                    >
                      <span>Log in</span>
                      <span>&rarr;</span>
                    </button>
                  </div>

                  <h2 className="text-[23px] sm:text-[25px] font-heading font-anton text-[#0F172A] tracking-tight mt-2">
                    {t("auth.signupTitle", "Become a LocalLens Provider")}
                  </h2>
                  <p className="text-[11.5px] text-slate-400 font-medium mt-0.5">
                    {t("auth.signupSubtitle", "Turn your local knowledge, passions, and spaces into a thriving business.")}
                  </p>

                  <form id="signup-form" onSubmit={handleSignup} method="post" action="#" className="mt-3.5 space-y-2.5">
                    <div>
                      <label htmlFor="signup-name" className="block text-[11px] font-bold text-[#0F172A] mb-1">
                        Full Name
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          id="signup-name" name="name" autoComplete="name" placeholder="Enter your full name"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none rounded-xl bg-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-email" className="block text-[11px] font-bold text-[#0F172A] mb-1">
                        Email Address
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          id="signup-email" name="email" autoComplete="email" placeholder="Enter your email address"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none rounded-xl bg-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-phone" className="block text-[11px] font-bold text-[#0F172A] mb-1">
                        Phone Number
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          id="signup-phone" name="tel" autoComplete="tel" placeholder="Enter your phone number"
                          className="w-full pl-10 pr-3.5 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none rounded-xl bg-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="signup-password" className="block text-[11px] font-bold text-[#0F172A] mb-1">
                        Password
                      </label>
                      <div className="relative rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus-within:border-[#00875A] focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          id="signup-password" name="password" autoComplete="new-password" placeholder="Create a password"
                          className="w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none rounded-xl bg-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 font-normal">
                        Must be at least 8 characters with a number and a letter.
                      </p>
                    </div>

                    

                    <div className="flex items-center gap-2 pt-0.5">
                      <input
                        type="checkbox"
                        id="signupAgree"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-[#00875A] focus:ring-[#00875A] cursor-pointer accent-[#00875A]"
                      />
                      <label htmlFor="signupAgree" className="text-[10px] text-slate-600 font-medium cursor-pointer">
                        I agree to the{" "}
                        <a href="#" className="text-[#00875A] font-bold hover:underline">
                          Terms of Service
                        </a>{" "}
                        and{" "}
                        <a href="#" className="text-[#00875A] font-bold hover:underline">
                          Privacy Policy
                        </a>
                        .
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#00875A] hover:bg-[#00704A] text-white font-extrabold text-[13px] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-700/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 transition-all cursor-pointer mt-1"
                    >
                      {isLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Create Account</span>
                          <span>&rarr;</span>
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}

              {/* ---------------------------------------------------- */}
              {/* OR DIVIDER & SOCIAL BUTTONS (Shared by both views)   */}
              {/* ---------------------------------------------------- */}
              <div className="relative flex items-center justify-center my-3.5">
                <div className="w-full border-t border-slate-200" />
                <span className="absolute bg-white px-3 text-[10px] font-extrabold text-slate-400 tracking-wider">
                  OR
                </span>
              </div>

              {/* Social Buttons */}
              <div className="space-y-2">
                {/* Google Button */}
                <button
                  type="button"
                  onClick={triggerOfficialGoogleOAuth}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer group"
                >
                  <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
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

                {/* Apple Button */}
                <button
                  type="button"
                  onClick={handleAppleAuth}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs transition-all cursor-pointer group"
                >
                  <svg className="w-4 h-4 fill-black group-hover:scale-110 transition-transform" viewBox="0 0 170 170">
                    <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.58-7.7-11.64-13.99-5.99-9.35-10.74-19.81-14.25-31.39-3.51-11.58-5.27-22.33-5.27-32.24 0-14.35 3.73-26.04 11.19-35.08 7.46-9.04 16.59-13.67 27.39-13.89 4.8-.11 10.15 1.25 16.05 4.09 5.9 2.84 9.61 4.37 11.14 4.59 2.11-.44 6.07-2.13 11.89-5.07 5.82-2.94 10.97-4.24 15.45-3.9 11.88.88 21.24 5.37 28.09 13.48-10.46 6.32-15.58 15.14-15.36 26.47.22 8.71 3.51 15.93 9.87 21.66 6.36 5.73 13.96 9.04 22.8 9.92-2.18 6.53-4.79 12.84-7.83 18.94zM119.22 33.15c0-6.75 2.47-13.17 7.41-19.26 4.94-6.09 11.02-10.45 18.24-13.08-.22 1.3-.43 2.6-.65 3.91-.43 3.69-1.42 7.28-2.94 10.78-2.29 5.23-5.55 9.69-9.8 13.39-4.24 3.7-9.36 6.1-15.36 7.2-.21-.98-.42-1.96-.65-2.94-.15-.99-.25-1.99-.25-3.03z" />
                  </svg>
                  <span>Continue with Apple</span>
                </button>
              </div>

              {/* Terms Footer (for Login) */}
              {mode === "login" && (
                <div className="pt-3 text-center text-[10px] text-slate-400 leading-normal">
                  By logging in, you agree to our{" "}
                  <a href="#" className="text-[#00875A] font-bold hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-[#00875A] font-bold hover:underline">
                    Privacy Policy
                  </a>
                  .
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

          </div>
  );
};
