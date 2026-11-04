"use client";

import React from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSelector } from "@/components/settings/LanguageSelector";

export const Navbar: React.FC = () => {
  const { t } = useI18n();

  return (
    <header className="w-full h-[76px] bg-white border-b border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.02)] sticky top-0 z-50">
      <div className="max-w-[1240px] h-full mx-auto px-6 flex items-center justify-between">
        {/* Left Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-[38px] h-[38px] rounded-[10px] bg-[#059669] text-white flex items-center justify-center shadow-sm">
            <Compass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-baseline">
            <span className="font-heading font-anton text-[20px] text-[#0F172A] tracking-tight">
              {t("nav.brand", "Local Lens")}
            </span>
            <span className="text-[13px] font-semibold text-[#059669] ml-1.5">
              - {t("nav.provider", "Provider")}
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-9 text-[14px] font-medium text-[#475569]">
          <a href="#features" className="hover:text-[#0F172A] transition-colors">
            {t("nav.features", "Features")}
          </a>
          <a href="#how-it-works" className="hover:text-[#0F172A] transition-colors">
            {t("nav.howItWorks", "How it Works")}
          </a>
          <a href="#pricing" className="hover:text-[#0F172A] transition-colors">
            {t("nav.pricing", "Pricing")}
          </a>
          <a href="#faqs" className="hover:text-[#0F172A] transition-colors">
            {t("nav.faqs", "FAQs")}
          </a>
        </nav>

        {/* Right CTA Links & Language */}
        <div className="flex items-center gap-3">
          <LanguageSelector variant="navbar" />
          <Link
            href="/login"
            className="text-[14px] font-bold text-[#0F172A] hover:text-[#059669] px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {t("nav.login", "Login")}
          </Link>
        </div>
      </div>
    </header>
  );
};
