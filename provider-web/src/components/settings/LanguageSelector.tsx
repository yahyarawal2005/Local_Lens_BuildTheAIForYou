"use client";

import React, { useState } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useI18n, SupportedLanguage } from "@/lib/i18n";

interface LanguageSelectorProps {
  variant?: "settings" | "navbar" | "compact";
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = "settings",
  showLabel = true,
}) => {
  const { language, setLanguage, supportedLanguages, t, isChanging } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const currentOption = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

  const handleSelectLanguage = async (code: SupportedLanguage) => {
    setIsOpen(false);
    await setLanguage(code);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2800);
  };

  // 1. Settings section variant: Shows "Language" and "[ English ▼ ]" with options
  if (variant === "settings") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0e8a5b] flex items-center justify-center font-bold">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {t("settings.language", "Language")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("settings.languageSubtitle", "Select your preferred language for the LocalLens provider portal interface.")}
                </p>
              </div>
            </div>
          </div>

          {/* Language Selector Dropdown */}
          <div className="relative min-w-[220px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              {t("settings.language", "Language")}
            </label>
            <div className="relative">
              <button
                type="button"
                id="language-settings-dropdown-button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200 text-sm font-semibold text-slate-800 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0e8a5b]/30"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-[#0e8a5b]" />
                  <span className="font-bold text-slate-900">{currentOption.nativeLabel}</span>
                  {currentOption.code !== "en" && (
                    <span className="text-xs text-slate-500 font-normal">({currentOption.label})</span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Options Popover */}
              {isOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-full z-50 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    {supportedLanguages.map((opt) => {
                      const isSelected = opt.code === language;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => handleSelectLanguage(opt.code)}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                            isSelected
                              ? "bg-emerald-50 text-[#0e8a5b] font-bold"
                              : "text-slate-700 hover:bg-slate-50 font-medium"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-base">{opt.nativeLabel}</span>
                            <span className="text-xs text-slate-500 font-normal">
                              {opt.label}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-[#0e8a5b]" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Persistence Indicator */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {t("settings.savedAutomatically", "Saved to your profile and browser. Persists across logins.")}
          </span>
          {saveSuccess && (
            <span className="text-[#0e8a5b] font-bold animate-pulse">
              ✓ {t("settings.saveSuccess", "Language updated!")}
            </span>
          )}
        </div>
      </div>
    );
  }

  // 2. Navbar variant: Compact globe dropdown
  return (
    <div className="relative">
      <button
        type="button"
        id="navbar-language-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-[#059669] hover:bg-emerald-50/60 hover:border-emerald-200 transition-colors shadow-sm"
        title="Select Language / भाषा निवडा / ভাষা বেছে নিন"
      >
        <Globe className="w-3.5 h-3.5 text-[#059669]" />
        <span>{currentOption.nativeLabel}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-44 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            {supportedLanguages.map((opt) => {
              const isSelected = opt.code === language;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => handleSelectLanguage(opt.code)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-emerald-50 text-[#0e8a5b] font-bold"
                      : "text-slate-700 hover:bg-slate-50 font-medium"
                  }`}
                >
                  <span className="text-sm font-semibold">{opt.nativeLabel}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#0e8a5b]" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
