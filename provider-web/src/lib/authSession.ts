import { supabase } from "./supabaseClient";

export interface ProviderProfile {
  id?: string;
  name: string;
  fullName?: string;
  email: string;
  phone?: string;
  role: string;
  providerCategory?: string;
  avatar?: string;
  authProvider?: "google" | "apple" | "email" | "demo";
  verified?: boolean; // false until Aadhaar OCR verification is completed!
  aadhaarVerified?: boolean;
  aadhaarNumber?: string;
  aadhaarName?: string;
  aadhaarDob?: string;
  aadhaarGender?: string;
  aadhaarAddress?: string;
  aadhaarScanDate?: string;
  rating?: number;
  totalExperiences?: number;
  totalGuests?: number;
  joinedDate?: string;
  businessName?: string;
  bio?: string;
  language?: "en" | "hi" | "mr" | "bn";
}

const DEFAULT_PROFILE: ProviderProfile = {
  id: "host_default_guest",
  name: "Local Provider",
  fullName: "Local Provider",
  email: "provider@locallens.in",
  phone: "+91 98201 55432",
  role: "Tour Guide / Storyteller",
  providerCategory: "Tour Guide / Storyteller",
  avatar: "",
  authProvider: "google",
  verified: false,
  aadhaarVerified: false,
  rating: 4.9,
  totalExperiences: 4,
  totalGuests: 328,
  joinedDate: "Recent Member",
};

/**
 * Builds profile synchronously from Supabase auth user metadata (0ms execution)
 * Preserves verified / Aadhaar OCR state if previously completed
 */
export function buildProfileFromAuthUser(user: any): ProviderProfile {
  if (!user) return DEFAULT_PROFILE;

  const meta = user.user_metadata || {};
  const isGoogle = meta.iss?.includes("google") || user.app_metadata?.provider === "google";

  const displayName =
    meta.full_name ||
    meta.name ||
    user.email?.split("@")[0] ||
    "Local Provider";

  const avatarUrl =
    meta.avatar_url ||
    meta.picture ||
    "";

  const userEmail = user.email || meta.email || "provider@locallens.in";

  // Check saved session in localStorage to preserve completed Aadhaar verification
  let savedVerified = false;
  let savedAadhaarVerified = false;
  let savedAadhaarDetails: Partial<ProviderProfile> = {};

  if (typeof window !== "undefined") {
    try {
      const savedStr = localStorage.getItem("locallens_provider_session");
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        if (
          saved.id === user.id ||
          saved.email?.toLowerCase() === userEmail.toLowerCase()
        ) {
          savedVerified = Boolean(saved.verified);
          savedAadhaarVerified = Boolean(saved.aadhaarVerified);
          savedAadhaarDetails = {
            aadhaarNumber: saved.aadhaarNumber,
            aadhaarName: saved.aadhaarName,
            aadhaarDob: saved.aadhaarDob,
            aadhaarGender: saved.aadhaarGender,
            aadhaarAddress: saved.aadhaarAddress,
            aadhaarScanDate: saved.aadhaarScanDate,
          };
        }
      }
    } catch {}
  }

  const isAadhaarVerified = Boolean(
    meta.aadhaar_verified || meta.aadhaarVerified || savedAadhaarVerified
  );
  const isVerified = Boolean(
    (meta.verified || savedVerified || isAadhaarVerified) && isAadhaarVerified
  );

  return {
    id: user.id,
    name: displayName,
    fullName: displayName,
    email: userEmail,
    phone: meta.phone || "+91 98201 55432",
    role: meta.provider_category || meta.role || "Tour Guide / Storyteller",
    providerCategory: meta.provider_category || meta.role || "Tour Guide / Storyteller",
    avatar: avatarUrl,
    authProvider: isGoogle ? "google" : "email",
    verified: isVerified,
    aadhaarVerified: isAadhaarVerified,
    aadhaarNumber: meta.aadhaar_number || savedAadhaarDetails.aadhaarNumber,
    aadhaarName: meta.aadhaar_name || savedAadhaarDetails.aadhaarName,
    aadhaarDob: meta.aadhaar_dob || savedAadhaarDetails.aadhaarDob,
    aadhaarGender: meta.aadhaar_gender || savedAadhaarDetails.aadhaarGender,
    aadhaarAddress: meta.aadhaar_address || savedAadhaarDetails.aadhaarAddress,
    aadhaarScanDate: meta.aadhaar_scan_date || savedAadhaarDetails.aadhaarScanDate,
    rating: 4.9,
    totalExperiences: 4,
    totalGuests: 328,
    joinedDate: "Recent Member",
  };
}

/**
 * Gets or creates provider profile with non-blocking DB sync for instant response
 */
export async function getOrCreateProviderProfile(user: any): Promise<ProviderProfile> {
  const profile = buildProfileFromAuthUser(user);

  // 1. Immediately persist to localStorage for 0ms retrieval
  if (typeof window !== "undefined") {
    localStorage.setItem("locallens_provider_session", JSON.stringify(profile));
  }

  // 2. Non-blocking background sync with Supabase profiles table (fire and forget)
  try {
    const syncDb = async () => {
      const { data: dbProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (dbProfile) {
        profile.fullName = dbProfile.full_name || profile.fullName;
        profile.name = dbProfile.full_name || profile.name;
        profile.avatar = dbProfile.avatar_url || profile.avatar;
        if (dbProfile.verified !== undefined || dbProfile.aadhaar_verified !== undefined) {
          profile.aadhaarVerified = Boolean(dbProfile.aadhaar_verified);
          profile.verified = Boolean(dbProfile.verified && dbProfile.aadhaar_verified);
          profile.aadhaarNumber = dbProfile.aadhaar_number || profile.aadhaarNumber;
          profile.aadhaarName = dbProfile.aadhaar_name || profile.aadhaarName;
          profile.aadhaarDob = dbProfile.aadhaar_dob || profile.aadhaarDob;
          profile.aadhaarGender = dbProfile.aadhaar_gender || profile.aadhaarGender;
          profile.aadhaarAddress = dbProfile.aadhaar_address || profile.aadhaarAddress;
        }
        if (dbProfile.language) {
          profile.language = dbProfile.language;
          if (typeof window !== "undefined") {
            localStorage.setItem("locallens_preferred_language", dbProfile.language);
          }
        }
        if (typeof window !== "undefined") {
          localStorage.setItem("locallens_provider_session", JSON.stringify(profile));
        }
      } else {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: profile.fullName,
          avatar_url: profile.avatar,
          language: profile.language || "en",
          verified: profile.verified,
          aadhaar_verified: profile.aadhaarVerified,
          aadhaar_number: profile.aadhaarNumber,
          aadhaar_name: profile.aadhaarName,
          aadhaar_dob: profile.aadhaarDob,
          aadhaar_gender: profile.aadhaarGender,
          aadhaar_address: profile.aadhaarAddress,
          updated_at: new Date().toISOString(),
        });
      }
    };

    // Use a fast 800ms race so UI is never blocked by database latency
    await Promise.race([
      syncDb(),
      new Promise((res) => setTimeout(res, 800)),
    ]);
  } catch (err) {
    // Non-fatal, profile is already safely cached in session
  }

  return profile;
}

/**
 * Completes Aadhaar OCR Verification for the provider
 * Sets verified: true, aadhaarVerified: true, stores extracted details,
 * and notifies active components.
 */
export async function completeAadhaarVerification(details: {
  aadhaarNumber: string;
  aadhaarName: string;
  aadhaarDob: string;
  aadhaarGender: string;
  aadhaarAddress?: string;
  aadhaarCardImage?: string;
}): Promise<ProviderProfile> {
  const current = (await getProviderProfile()) || DEFAULT_PROFILE;
  const updated: ProviderProfile = {
    ...current,
    verified: true,
    aadhaarVerified: true,
    aadhaarNumber: details.aadhaarNumber,
    aadhaarName: details.aadhaarName,
    aadhaarDob: details.aadhaarDob,
    aadhaarGender: details.aadhaarGender,
    aadhaarAddress: details.aadhaarAddress || "Verified Resident of India",
    aadhaarScanDate: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("locallens_provider_session", JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("locallens_profile_updated", { detail: updated })
    );
  }

  // Non-blocking sync to Supabase
  try {
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id || updated.id;
    if (userId) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: updated.fullName || updated.name,
        verified: true,
        aadhaar_verified: true,
        aadhaar_number: details.aadhaarNumber,
        aadhaar_name: details.aadhaarName,
        aadhaar_dob: details.aadhaarDob,
        aadhaar_gender: details.aadhaarGender,
        aadhaar_address: details.aadhaarAddress || "Verified Resident of India",
        updated_at: new Date().toISOString(),
      });
      await supabase.auth.updateUser({
        data: {
          verified: true,
          aadhaar_verified: true,
          aadhaar_number: details.aadhaarNumber,
        },
      });
    }
  } catch (e) {
    console.warn("Supabase Aadhaar completion sync notice:", e);
  }

  return updated;
}

/**
 * Resets Aadhaar verification state (useful for re-testing OCR verification)
 */
export async function resetAadhaarVerification(): Promise<ProviderProfile> {
  const current = (await getProviderProfile()) || DEFAULT_PROFILE;
  const updated: ProviderProfile = {
    ...current,
    verified: false,
    aadhaarVerified: false,
    aadhaarNumber: undefined,
    aadhaarName: undefined,
    aadhaarDob: undefined,
    aadhaarGender: undefined,
    aadhaarAddress: undefined,
    aadhaarScanDate: undefined,
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("locallens_provider_session", JSON.stringify(updated));
    window.dispatchEvent(
      new CustomEvent("locallens_profile_updated", { detail: updated })
    );
  }
  return updated;
}

/**
 * Loads current provider profile with instant synchronous localStorage check first
 */
export async function getProviderProfile(): Promise<ProviderProfile | null> {
  if (typeof window === "undefined") {
    return DEFAULT_PROFILE;
  }

  // Fast path: localStorage
  try {
    const saved = localStorage.getItem("locallens_provider_session");
    if (saved && saved.trim() && saved !== "undefined" && saved !== "null") {
      const parsed = JSON.parse(saved);
      // Validate session in background
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session?.user) {
          getOrCreateProviderProfile(data.session.user);
        }
      }).catch(() => {});
      return parsed;
    }
  } catch (err) {
    try {
      localStorage.removeItem("locallens_provider_session");
    } catch (_) {}
    console.error("Error reading localStorage profile:", err);
  }

  // Supabase active session check
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      return await getOrCreateProviderProfile(data.session.user);
    }
  } catch (err) {
    console.error("Error reading Supabase session:", err);
  }

  return null;
}

/**
 * Saves provider profile to localStorage and updates state
 */
export function saveProviderProfile(profile: Partial<ProviderProfile>): ProviderProfile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;

  let current = DEFAULT_PROFILE;
  try {
    const currentStr = localStorage.getItem("locallens_provider_session");
    if (currentStr && currentStr.trim() && currentStr !== "undefined" && currentStr !== "null") {
      current = JSON.parse(currentStr);
    }
  } catch (_) {
    current = DEFAULT_PROFILE;
  }

  const rawEmail = (profile.email || current.email || "").trim().toLowerCase();
  const emailSlug = rawEmail.replace(/[^a-z0-9]/g, "_");
  const stableId = profile.id || (current.id && current.id !== "host_default_guest" ? current.id : (emailSlug ? `provider_${emailSlug}` : `provider_${Date.now()}`));

  const updated: ProviderProfile = {
    ...current,
    ...profile,
    id: stableId,
    name: profile.fullName || profile.name || current.name,
  };

  try {
    localStorage.setItem("locallens_provider_session", JSON.stringify(updated));
    if (rawEmail) {
      localStorage.setItem("locallens_last_provider_email", rawEmail);
    }
  } catch (_) {}
  return updated;
}

/**
 * Clears provider session and logs out
 */
export async function logoutProvider(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("locallens_provider_session");
  }
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.error("Error signing out from Supabase:", err);
  }
}
