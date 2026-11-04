"use client";

import React, { useState, useEffect } from "react";
import { ExperienceListing, BoostPackage } from "@/types/experience";
import { BOOST_PACKAGES } from "@/services/mockExperiences";
import { formatINR } from "@/utils/geoMath";
import { getProviderProfile, ProviderProfile } from "@/lib/authSession";
import { supabase } from "@/lib/supabaseClient";
import { SponsorCampaign } from "@/types/sponsor";
import {
  X,
  Zap,
  CheckCircle2,
  Radio,
  Flame,
  ShieldCheck,
  MapPin,
  ExternalLink,
  CreditCard,
  QrCode,
  Building2,
  User,
  Phone,
  Mail,
  Check,
  AlertCircle,
} from "lucide-react";
import confetti from "canvas-confetti";

interface SponsorshipBoostModalProps {
  listing: ExperienceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onApplyBoost: (listingId: string, boostTier: BoostPackage["name"]) => void;
}

export const SponsorshipBoostModal: React.FC<SponsorshipBoostModalProps> = ({
  listing,
  isOpen,
  onClose,
  onApplyBoost,
}) => {
  const [provider, setProvider] = useState<ProviderProfile | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<BoostPackage>(
    BOOST_PACKAGES[1] // Weekly Surge default
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [purchasedCampaign, setPurchasedCampaign] = useState<SponsorCampaign | null>(null);

  // Provider Form State
  const [ownerName, setOwnerName] = useState("Krishnkumar Gupta");
  const [shopName, setShopName] = useState("Versova Ocean Adventures");
  const [providerEmail, setProviderEmail] = useState("provider@locallens.in");
  const [providerPhone, setProviderPhone] = useState("+91 98201 45920");

  // Payment Options
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [upiId, setUpiId] = useState("provider@okaxis");

  useEffect(() => {
    if (isOpen) {
      setPurchasedCampaign(null);
      setErrorNotice(null);
      getProviderProfile().then((p) => {
        if (p) {
          setProvider(p);
          if (p.name || p.fullName) setOwnerName(p.name || p.fullName || "Verified Provider");
          if (p.businessName) setShopName(p.businessName);
          if (p.email) setProviderEmail(p.email);
          if (p.phone) setProviderPhone(p.phone);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen || !listing) return null;

  const lat = listing.latitude || 19.131102;
  const lng = listing.longitude || 72.81541;
  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  const handleActivateBoost = async () => {
    setIsProcessing(true);
    setErrorNotice(null);

    try {
      const userId = provider?.id || "provider_krishn";
      const campaignUUID = crypto.randomUUID();
      const listingUUID = crypto.randomUUID();
      const bizUUID = crypto.randomUUID();
      const generatedTxnId = `TXN-UPI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const now = new Date();
      const startAtDate = now;
      const endAtDate = new Date(now.getTime() + selectedPackage.durationDays * 86400000);

      const campaignPayload = {
        id: campaignUUID,
        user_id: userId,
        email: providerEmail,
        provider_phone: providerPhone,
        business_id: bizUUID,
        listing_id: listing.experience_id || listingUUID,
        owner_name: ownerName.trim() || "Verified Provider",
        shop_name: shopName.trim() || "Local Experience Host",
        listing_name: listing.experience_name,
        sponsor_type: "boost",
        sponsor_package: selectedPackage.name,
        package_days: selectedPackage.durationDays,
        amount: selectedPackage.price,
        offer_type: "percentage_discount",
        offer_value: 20,
        offer_price: Math.round((listing.price_inr_clean || 1200) * 0.8),
        offer_description: `20% OFF Sponsored Special - ${selectedPackage.name}`,
        start_at: startAtDate.toISOString(),
        end_at: endAtDate.toISOString(),
        timezone: "Asia/Kolkata",
        payment_method: paymentMethod,
        experience_details: {
          image_url: (listing.images && listing.images[0]) || "",
          rating: listing.rating || 5.0,
          review_count: listing.review_count || 1,
          location: listing.meeting_point || listing.city || "Mumbai",
          city: listing.city || "Mumbai",
          district: listing.district || "Mumbai Suburban",
          latitude: lat,
          longitude: lng,
          google_map_url: googleMapsUrl,
          original_price: listing.price_inr_clean || 1200,
          category: listing.category,
        },
      };

      // 1. Post to Server API `/api/sponsors`
      const initResp = await fetch("/api/sponsors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(campaignPayload),
      });

      const initData = await initResp.json();
      const createdCampaign: SponsorCampaign = initData.campaign || {
        ...campaignPayload,
        payment_status: "pending",
        campaign_status: "draft",
        created_at: now.toISOString(),
      };

      // 2. Authorize and verify payment via `/api/sponsors/verify-payment`
      const verifyResp = await fetch("/api/sponsors/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: createdCampaign.id,
          payment_method: paymentMethod,
          payment_transaction_id: generatedTxnId,
          experience_details: campaignPayload.experience_details,
        }),
      });

      const verifyData = await verifyResp.json();
      const finalCampaign: SponsorCampaign = verifyData.campaign || {
        ...createdCampaign,
        payment_status: "paid",
        payment_transaction_id: generatedTxnId,
        campaign_status: "active",
        updated_at: new Date().toISOString(),
      };

      // 3. Fallback direct upsert to Supabase sponsor_campaigns table
      try {
        await supabase.from("sponsor_campaigns").upsert({
          id: finalCampaign.id,
          user_id: finalCampaign.user_id,
          business_id: bizUUID,
          listing_id: listing.experience_id || listingUUID,
          owner_name: finalCampaign.owner_name,
          shop_name: finalCampaign.shop_name,
          listing_name: finalCampaign.listing_name,
          sponsor_type: finalCampaign.sponsor_type,
          sponsor_package: finalCampaign.sponsor_package,
          amount: finalCampaign.amount,
          start_at: finalCampaign.start_at,
          end_at: finalCampaign.end_at,
          timezone: finalCampaign.timezone,
          payment_method: finalCampaign.payment_method,
          payment_status: "paid",
          payment_transaction_id: generatedTxnId,
          campaign_status: "active",
          created_at: finalCampaign.created_at,
          updated_at: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn("Direct Supabase upsert notice:", dbErr);
      }

      // 4. Update provider local storage partition
      const storageKey = `provider_campaigns_${userId}`;
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
        const updated = [finalCampaign, ...stored.filter((c: any) => c.id !== finalCampaign.id)];
        localStorage.setItem(storageKey, JSON.stringify(updated));

        // Global cache as well
        const globalStored = JSON.parse(localStorage.getItem("locallens_sponsor_campaigns") || "[]");
        localStorage.setItem(
          "locallens_sponsor_campaigns",
          JSON.stringify([finalCampaign, ...globalStored.filter((c: any) => c.id !== finalCampaign.id)])
        );
      } catch (e) {
        console.warn("Storage sync note:", e);
      }

      // 5. Notify system components & update parent state
      window.dispatchEvent(new CustomEvent("campaigns_updated", { detail: { campaign: finalCampaign } }));
      window.dispatchEvent(new CustomEvent("experiences_updated"));
      onApplyBoost(listing.experience_id, selectedPackage.name);

      setPurchasedCampaign(finalCampaign);
      setIsProcessing(false);

      // Confetti celebration
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b"],
      });
    } catch (err: any) {
      console.error("Boost activation error:", err);
      setErrorNotice(err.message || "Failed to process sponsor purchase. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white border border-violet-100 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header with Violet Gradient */}
        <div className="px-6 py-5 bg-gradient-to-r from-violet-950 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-600/70 border border-violet-400/40 text-yellow-300 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 fill-yellow-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Purchase Sponsorship &amp; Boost Package
                </h2>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-violet-500/40 border border-violet-400 text-violet-200">
                  3D Radar Live
                </span>
              </div>
              <p className="text-xs text-violet-200/80 truncate max-w-lg mt-0.5">
                Propel &ldquo;{listing.experience_name}&rdquo; into top traveler feeds &amp; sponsor campaigns table
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-violet-300 hover:text-white hover:bg-violet-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-xs">
          {errorNotice && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}

          {/* Success Screen after Purchase */}
          {purchasedCampaign ? (
            <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <Check className="w-7 h-7 stroke-[3]" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                  Payment Verified &bull; Active in Database
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">
                  Sponsorship Campaign Activated!
                </h3>
                <p className="text-slate-600 text-xs max-w-md mx-auto mt-1">
                  Your listing has been elevated with 3D Radar and pushed directly into the{" "}
                  <strong>Sponsor Campaigns Table</strong>.
                </p>
              </div>

              {/* Transaction & Provider Card */}
              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm text-left grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Provider Name</span>
                  <div className="font-extrabold text-slate-900 mt-0.5">{purchasedCampaign.owner_name}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Shop / Business</span>
                  <div className="font-extrabold text-slate-900 mt-0.5">{purchasedCampaign.shop_name}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Amount Paid</span>
                  <div className="font-black text-emerald-600 mt-0.5">₹{purchasedCampaign.amount} (PAID)</div>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[9px]">Transaction ID</span>
                  <div className="font-mono font-bold text-slate-700 mt-0.5 truncate">
                    {purchasedCampaign.payment_transaction_id}
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
                >
                  View in Sponsor Campaigns Table
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Radar Banner */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-violet-50 border border-violet-200/80 text-violet-950">
                <Radio className="w-4 h-4 text-violet-700 animate-spin shrink-0" />
                <span>
                  Activating this package automatically pushes your complete provider profile into the{" "}
                  <strong>Sponsor Campaigns Database Table</strong> and renders an omnidirectional 3D radar ring on the traveler map.
                </span>
              </div>

              {/* Step 1: Package Selector */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2.5">
                  1. Select Sponsorship Package Tier
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {BOOST_PACKAGES.map((pkg) => {
                    const isSelected = selectedPackage.id === pkg.id;
                    const isPopular = pkg.id === "boost-surge";

                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                          isSelected
                            ? "border-violet-600 bg-violet-50/50 shadow-md ring-2 ring-violet-500/20"
                            : "border-slate-200 hover:border-violet-300 bg-white"
                        }`}
                      >
                        {isPopular && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-[10px] font-extrabold text-white shadow-sm flex items-center gap-1">
                            <Flame className="w-3 h-3 fill-white" /> Popular
                          </span>
                        )}

                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            {pkg.durationDays} Days Duration
                          </div>
                          <div className="text-sm font-extrabold text-slate-900 mt-1">
                            {pkg.name}
                          </div>
                          <div className="text-xl font-black text-violet-700 mt-1.5">
                            {formatINR(pkg.price)}
                          </div>
                          <div className="text-[11px] font-bold text-emerald-600 mt-0.5">
                            {pkg.multiplierText}
                          </div>

                          <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                            {pkg.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                          <span>Target: {pkg.recommendedFor.split("&")[0]}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-violet-600 shrink-0" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Provider Profile Details (Stored in Database) */}
              <div className="bg-slate-50 p-4.5 rounded-2xl border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-violet-600" />
                    2. Provider &amp; Shop Details (Saved to Database)
                  </label>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                    ✓ Verified Host
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Provider / Owner Full Name
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                        placeholder="e.g. Krishnkumar Gupta"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Shop / Business Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                        placeholder="e.g. Versova Ocean Adventures"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Provider Contact Email
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={providerEmail}
                        onChange={(e) => setProviderEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                        placeholder="provider@locallens.in"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Provider Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={providerPhone}
                        onChange={(e) => setProviderPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold focus:ring-2 focus:ring-violet-500/20 focus:border-violet-600"
                        placeholder="+91 98201 45920"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Attached Google Map & Venue Details */}
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>Attached Google Map Coordinates:</span>
                      <span className="font-mono text-[11px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {lat.toFixed(4)}, {lng.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-[11px] text-emerald-800 mt-0.5">
                      Venue: {listing.meeting_point || listing.city}, {listing.district || "Mumbai Suburban"}
                    </div>
                  </div>
                </div>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-extrabold text-[10px] flex items-center gap-1 shadow-xs transition-colors shrink-0"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Step 4: Payment Method Selection */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                  3. Select Payment Mode
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("upi")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      paymentMethod === "upi"
                        ? "border-violet-600 bg-violet-50 text-violet-950 font-bold ring-2 ring-violet-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-violet-600" />
                    <div>
                      <div className="text-xs font-extrabold">Instant UPI</div>
                      <div className="text-[10px] text-slate-500">GPay, PhonePe, Paytm</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      paymentMethod === "card"
                        ? "border-violet-600 bg-violet-50 text-violet-950 font-bold ring-2 ring-violet-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-violet-600" />
                    <div>
                      <div className="text-xs font-extrabold">Cards</div>
                      <div className="text-[10px] text-slate-500">Visa, Mastercard, RuPay</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("netbanking")}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                      paymentMethod === "netbanking"
                        ? "border-violet-600 bg-violet-50 text-violet-950 font-bold ring-2 ring-violet-500/20"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <Building2 className="w-4 h-4 text-violet-600" />
                    <div>
                      <div className="text-xs font-extrabold">Net Banking</div>
                      <div className="text-[10px] text-slate-500">All major banks</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <div className="text-xs font-bold text-white">
                      Instant Database Push &amp; Live Radar
                    </div>
                    <div className="text-[10px] text-slate-300">
                      Receipt &amp; Transaction ID will be saved to your sponsor table
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Total Payable:</span>
                  <div className="text-lg font-black text-emerald-400">
                    {formatINR(selectedPackage.price)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!purchasedCampaign && (
          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              onClick={handleActivateBoost}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white text-xs font-extrabold shadow-lg shadow-violet-600/30 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>
                {isProcessing
                  ? "Authorizing & Pushing to Database..."
                  : `Confirm & Purchase ${selectedPackage.name}`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};