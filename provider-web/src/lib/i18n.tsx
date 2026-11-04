"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import mr from "@/locales/mr.json";
import bn from "@/locales/bn.json";
import { supabase } from "./supabaseClient";
import { getProviderProfile, saveProviderProfile } from "./authSession";

export type SupportedLanguage = "en" | "hi" | "mr" | "bn";

export interface LanguageOption {
  code: SupportedLanguage;
  label: string;
  nativeLabel: string;
  flag?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "hi", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeLabel: "मराठी" },
  { code: "bn", label: "Bengali", nativeLabel: "বাংলা" },
];

const translations: Record<SupportedLanguage, any> = {
  en,
  hi,
  mr,
  bn,
};

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, fallback?: string) => string;
  supportedLanguages: LanguageOption[];
  isChanging: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: async () => {},
  t: (key: string, fallback?: string) => fallback || key,
  supportedLanguages: SUPPORTED_LANGUAGES,
  isChanging: false,
});

const STORAGE_KEY = "locallens_preferred_language";

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>("en");
  const [isChanging, setIsChanging] = useState(false);

  // Initialize language from local storage and sync with user profile
  useEffect(() => {
    if (typeof window === "undefined") return;

    let activeLang: SupportedLanguage = "en";

    // 1. Check persistent localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as SupportedLanguage | null;
    if (saved && (saved === "en" || saved === "hi" || saved === "mr" || saved === "bn")) {
      activeLang = saved;
    }

    setLanguageState(activeLang);
    document.documentElement.lang = activeLang;

    // 2. Fetch authenticated profile preference if available
    getProviderProfile().then((profile) => {
      if (profile?.language && profile.language !== activeLang) {
        setLanguageState(profile.language);
        localStorage.setItem(STORAGE_KEY, profile.language);
        document.documentElement.lang = profile.language;
      }
    }).catch(() => {});

    // Listen to storage and custom language change events across components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const newLang = e.newValue as SupportedLanguage;
        if (newLang === "en" || newLang === "hi" || newLang === "mr" || newLang === "bn") {
          setLanguageState(newLang);
          document.documentElement.lang = newLang;
        }
      }
    };

    const handleCustomEvent = (e: any) => {
      if (e.detail && (e.detail === "en" || e.detail === "hi" || e.detail === "mr" || e.detail === "bn")) {
        setLanguageState(e.detail);
        document.documentElement.lang = e.detail;
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("locallens_language_changed", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("locallens_language_changed", handleCustomEvent);
    };
  }, []);

  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    setIsChanging(true);
    setLanguageState(newLang);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
      // Dispatch custom event for immediate reactive sync across all open components
      window.dispatchEvent(new CustomEvent("locallens_language_changed", { detail: newLang }));
    }

    // Save to user profile & Supabase in background
    try {
      saveProviderProfile({ language: newLang });

      const { data } = await supabase.auth.getSession();
      const userId = data?.session?.user?.id;
      if (userId) {
        await supabase
          .from("profiles")
          .update({ language: newLang, updated_at: new Date().toISOString() })
          .eq("id", userId);
      }
    } catch (err) {
      console.warn("Language DB sync notice:", err);
    } finally {
      setIsChanging(false);
    }
  }, []);

  // Nested dot-notation lookup with fallback: e.g. "dashboard.stats.totalEarnings"
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const keys = key.split(".");
      let current: any = translations[language];

      for (const k of keys) {
        if (current && typeof current === "object" && k in current) {
          current = current[k];
        } else {
          // Fallback to English translation first
          let enCurrent: any = translations["en"];
          for (const ek of keys) {
            if (enCurrent && typeof enCurrent === "object" && ek in enCurrent) {
              enCurrent = enCurrent[ek];
            } else {
              enCurrent = null;
              break;
            }
          }
          return typeof enCurrent === "string" ? enCurrent : (fallback || key);
        }
      }

      return typeof current === "string" ? current : (fallback || key);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
        isChanging,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useI18n = () => useContext(LanguageContext);
export const useTranslation = () => useContext(LanguageContext);