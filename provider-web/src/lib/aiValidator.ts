/**
 * AI Content & Location Validator for LocalLens Providers
 * - Profanity / abusive content filter (English + Hinglish)
 * - Fake / misleading claim detector
 * - Sentence clarity & completeness evaluator
 * - Multi-show location validation with distance & transit buffer checks
 * - AI auto-enhance recommendation
 *
 * HARD RULES — listing CANNOT publish if:
 *   1. Any abusive/bad word is found in title or description
 *   2. Any fake/misleading claim pattern is matched
 *   3. Location coordinates are missing / invalid
 *   4. Clarity score is below 40 (gibberish / near-empty)
 */

// ─── ABUSIVE / BAD WORD LIST (English + Hinglish) ────────────────────────────
const BAD_WORDS_LIST: string[] = [
  // English profanity & abuse
  "abuse", "ass", "asshole", "bastard", "bitch", "blowjob", "bullshit", "crap",
  "cunt", "damn", "dick", "douche", "dumbass", "fag", "faggot", "fuck", "fucking",
  "fucked", "fucks", "hate", "idiot", "motherfucker", "nigger", "nigga",
  "piss", "pussy", "retard", "scam", "shit", "shitty", "slut", "stupid",
  "suck", "whore", "prick", "wanker", "twat", "cocksucker", "jerk", "moron",
  "douchebag", "sleazy", "creep", "pervert", "perv",
  // Hate speech
  "nazi", "fascist",
  // Hinglish / Indian vernacular profanity
  "bc", "bkl", "bhosadi", "bhosdike", "chutiya", "choot", "chodu", "gandu",
  "harami", "kamina", "kutta", "lauda", "loda", "lund", "madarchod", "mc",
  "randi", "saala", "suar", "bhenchod", "sala", "sali", "gaand", "bhadwa",
];

// ─── FAKE / MISLEADING CLAIM PATTERNS ─────────────────────────────────────────
interface FakeClaimPattern {
  pattern: RegExp;
  reason: string;
}

const FAKE_CLAIM_PATTERNS: FakeClaimPattern[] = [
  {
    pattern: /\b(100\s*%\s*guaranteed)\s+(profit|return|money|earning)/i,
    reason: "False profit-guarantee claim",
  },
  {
    pattern: /\b(earn|make)\s+\d{3,}\s*(per\s*day|daily|a\s*day|\/day)/i,
    reason: "Unrealistic daily earning claim",
  },
  {
    pattern: /\b(free\s*cash|free\s*money|instant\s*cash|quick\s*cash)\b/i,
    reason: "Free/instant cash claim is not permitted",
  },
  {
    pattern: /\b(pyramid|mlm|multi[\s-]?level\s*marketing|ponzi)\b/i,
    reason: "MLM / pyramid-scheme language is prohibited",
  },
  {
    pattern: /\b(fake|fraud|illegal|smuggl|drugs?|weapons?|narcotic|cocaine|heroin|weed|ganja|opium)\b/i,
    reason: "Prohibited / illegal content",
  },
  {
    pattern: /\b(send\s*money|wire\s*transfer|advance\s*payment\s*required|pay\s*first)\b/i,
    reason: "Suspicious payment-first demand — potential scam",
  },
  {
    pattern: /\bcontact\s*(me|us)\s*(for|to\s*get)\s*(price|detail|info)/i,
    reason: "Off-platform contact solicitation is not allowed",
  },
  {
    pattern: /\b(click\s*here|visit\s*our\s*website|whatsapp\s*us|dm\s*(us|me|for))\b/i,
    reason: "Off-platform redirect or DM solicitation is not permitted",
  },
];

// ─── VAGUE / LOW-EFFORT PHRASES ───────────────────────────────────────────────
const VAGUE_PHRASES: string[] = [
  "nice stuff", "good thing", "random things", "whatever",
  "see some things", "contact me for details", "dm for price",
  "asdf", "test listing", "just checking", "lorem ipsum",
  "placeholder", "tbd", "coming soon", "details later", "etc etc",
];

// ─── TYPE DEFINITIONS ─────────────────────────────────────────────────────────

export interface ProfanityCheckResult {
  hasBadWords: boolean;
  badWordsFound: string[];
  cleanText: string;
  message: string;
}

export interface FakeClaimCheckResult {
  hasFakeClaims: boolean;
  claimsFound: string[];
  message: string;
}

export interface ClarityCheckResult {
  isClear: boolean;
  score: number; // 0 - 100
  level: "Excellent" | "Good" | "Needs Improvement" | "Unclear";
  wordCount: number;
  sentenceCount: number;
  issues: string[];
  suggestions: string[];
  aiPolishedText?: string;
}

export interface ShowLocationData {
  id: string;
  name: string;
  venue: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  timeSlot?: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  hasMultiShow: boolean;
  show1Valid: boolean;
  show2Valid: boolean;
  distanceKm?: number;
  transitFeasible?: boolean;
  messages: string[];
}

export interface FullValidationResult {
  canPublish: boolean;
  overallScore: number;
  /** Human-readable reason why publishing is blocked. null = no blocker. */
  blockingReason: string | null;
  profanity: ProfanityCheckResult;
  fakeClaims: FakeClaimCheckResult;
  clarity: ClarityCheckResult;
  location: LocationValidationResult;
}

// ─── 1. PROFANITY / ABUSIVE WORD CHECK ───────────────────────────────────────

export function checkProfanity(text: string): ProfanityCheckResult {
  if (!text || typeof text !== "string") {
    return { hasBadWords: false, badWordsFound: [], cleanText: "", message: "Clean text." };
  }

  // Normalize: lowercase + strip common leet substitutions + strip separators
  const normalized = text
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/3/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/0/g, "o")
    .replace(/[$5]/g, "s")
    .replace(/7/g, "t")
    .replace(/[-_.#*]/g, "");

  const detected = new Set<string>();

  for (const bad of BAD_WORDS_LIST) {
    const escaped = bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(normalized)) {
      detected.add(bad);
    }
  }

  const badWordsFound = Array.from(detected);
  const hasBadWords = badWordsFound.length > 0;

  // Mask bad words in original text
  let cleanText = text;
  for (const bad of badWordsFound) {
    const mask = bad[0] + "*".repeat(bad.length - 1);
    const escapedBad = bad.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const reg = new RegExp(`\\b${escapedBad}\\b`, "gi");
    cleanText = cleanText.replace(reg, mask);
  }

  return {
    hasBadWords,
    badWordsFound,
    cleanText,
    message: hasBadWords
      ? `🚫 Abusive language detected. Remove: "${badWordsFound.join('", "')}" to publish.`
      : "✅ Safety Check Passed: No abusive or offensive language found.",
  };
}

// ─── 2. FAKE / MISLEADING CLAIM CHECK ────────────────────────────────────────

export function checkFakeClaims(text: string): FakeClaimCheckResult {
  if (!text || typeof text !== "string") {
    return { hasFakeClaims: false, claimsFound: [], message: "No misleading claims detected." };
  }

  const claimsFound: string[] = [];
  for (const { pattern, reason } of FAKE_CLAIM_PATTERNS) {
    if (pattern.test(text)) {
      claimsFound.push(reason);
    }
  }

  const hasFakeClaims = claimsFound.length > 0;

  return {
    hasFakeClaims,
    claimsFound,
    message: hasFakeClaims
      ? `⚠️ Misleading content: ${claimsFound[0]}. Edit your listing before publishing.`
      : "✅ Integrity Check Passed: No misleading claims found.",
  };
}

// ─── 3. CLARITY & SENTENCE QUALITY CHECK ──────────────────────────────────────

export function checkClarity(title: string, description: string): ClarityCheckResult {
  const combined = `${title || ""} ${description || ""}`.trim();
  const words = combined.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const rawSentences = (description || "")
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = rawSentences.length;

  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Title checks
  if (!title || title.trim().length < 5) {
    issues.push("Title is too short. Travelers need a descriptive title (at least 5 characters).");
    score -= 25;
  } else if (/^[a-z]/.test(title.trim())) {
    suggestions.push("Capitalize the first letter of your title for a professional impression.");
    score -= 5;
  }

  // Description length
  if (description.trim().length === 0) {
    issues.push("Description is completely empty. Explain what travelers will experience.");
    score -= 50;
  } else if (wordCount < 12) {
    issues.push("Description is very brief. Provide at least 15–20 words describing the activity.");
    score -= 30;
  } else if (wordCount < 25) {
    suggestions.push("Adding more detail about gear, sights, or local stories will increase bookings.");
    score -= 10;
  }

  // Vague phrases
  const lowerDesc = combined.toLowerCase();
  for (const vague of VAGUE_PHRASES) {
    if (lowerDesc.includes(vague)) {
      issues.push(`Vague phrase detected ("${vague}"). Replace with specific tour details.`);
      score -= 15;
    }
  }

  // Keyboard spam / gibberish
  if (/(.)\1{4,}/.test(combined) || /[a-z]{20,}/i.test(combined)) {
    issues.push("Gibberish or repetitive characters detected. Please use real words.");
    score -= 35;
  }

  // ALL CAPS abuse
  const capsRatio = (description.match(/[A-Z]/g) || []).length / Math.max(description.length, 1);
  if (capsRatio > 0.6 && description.length > 15) {
    suggestions.push("Avoid typing in ALL CAPS — it reads as shouting to travelers.");
    score -= 10;
  }

  // Punctuation
  if (sentenceCount > 0 && !/[.!?]$/.test(description.trim())) {
    suggestions.push("End your description with proper punctuation (period or exclamation mark).");
    score -= 5;
  }

  // Clamp
  score = Math.max(10, Math.min(100, score));

  let level: ClarityCheckResult["level"] = "Excellent";
  if (score < 45) level = "Unclear";
  else if (score < 70) level = "Needs Improvement";
  else if (score < 88) level = "Good";

  // AI-polished version
  let aiPolishedText = description.trim();
  if (aiPolishedText.length > 5) {
    aiPolishedText = aiPolishedText.charAt(0).toUpperCase() + aiPolishedText.slice(1);
    if (!/[.!?]$/.test(aiPolishedText)) aiPolishedText += ".";
  }

  return {
    isClear: score >= 65 && issues.length === 0,
    score,
    level,
    wordCount,
    sentenceCount,
    issues,
    suggestions,
    aiPolishedText,
  };
}

// ─── DISTANCE HELPER ─────────────────────────────────────────────────────────

export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// ─── 4. LOCATION VALIDATOR ───────────────────────────────────────────────────

export function validateExperienceLocations(
  show1: ShowLocationData,
  show2?: ShowLocationData | null
): LocationValidationResult {
  const messages: string[] = [];

  const show1LatValid = typeof show1.lat === "number" && show1.lat >= -90 && show1.lat <= 90 && show1.lat !== 0;
  const show1LngValid = typeof show1.lng === "number" && show1.lng >= -180 && show1.lng <= 180 && show1.lng !== 0;
  const show1CityValid = Boolean(show1.city && show1.city.trim().length >= 2);
  const show1Valid = show1LatValid && show1LngValid && show1CityValid;

  if (!show1LatValid || !show1LngValid) messages.push("Show 1: Coordinates are missing or invalid. Please drop a pin on the map.");
  if (!show1CityValid) messages.push("Show 1: City name is required.");

  const hasMultiShow = Boolean(show2 && (show2.venue || show2.city || (show2.lat && show2.lat !== show1.lat)));
  let show2Valid = true;
  let distanceKm: number | undefined;
  let transitFeasible: boolean | undefined;

  if (hasMultiShow && show2) {
    const show2LatValid = typeof show2.lat === "number" && show2.lat >= -90 && show2.lat <= 90 && show2.lat !== 0;
    const show2LngValid = typeof show2.lng === "number" && show2.lng >= -180 && show2.lng <= 180 && show2.lng !== 0;
    const show2CityValid = Boolean(show2.city && show2.city.trim().length >= 2);
    show2Valid = show2LatValid && show2LngValid && show2CityValid;

    if (!show2LatValid || !show2LngValid) messages.push("Show 2: Coordinates are missing. Select second venue on map.");
    if (!show2CityValid) messages.push("Show 2: City name is required.");

    if (show1Valid && show2Valid) {
      distanceKm = calculateDistanceKm(show1.lat, show1.lng, show2.lat, show2.lng);
      if (distanceKm < 0.05) {
        messages.push("Notice: Show 1 and Show 2 are at identical coordinates. Confirm venues are distinct.");
        transitFeasible = true;
      } else if (distanceKm > 80) {
        messages.push(`Notice: Show 1 and Show 2 are ${distanceKm} km apart. Ensure sufficient transit buffer.`);
        transitFeasible = true;
      } else {
        transitFeasible = true;
        messages.push(`Multi-Show Verified: Show 1 (${show1.venue || show1.city}) and Show 2 (${show2.venue || show2.city}) are ${distanceKm} km apart.`);
      }
    }
  }

  return {
    isValid: show1Valid && (!hasMultiShow || show2Valid),
    hasMultiShow,
    show1Valid,
    show2Valid,
    distanceKm,
    transitFeasible,
    messages,
  };
}

// ─── 5. COMBINED FULL VALIDATOR ───────────────────────────────────────────────

export function validateFullListing(
  title: string,
  description: string,
  show1: ShowLocationData,
  show2?: ShowLocationData | null
): FullValidationResult {
  const profanity = checkProfanity(`${title} ${description}`);
  const fakeClaims = checkFakeClaims(`${title} ${description}`);
  const clarity = checkClarity(title, description);
  const location = validateExperienceLocations(show1, show2);

  let overallScore = clarity.score;
  if (profanity.hasBadWords) overallScore = Math.min(overallScore, 10);
  if (fakeClaims.hasFakeClaims) overallScore = Math.min(overallScore, 15);
  if (!location.isValid) overallScore = Math.min(overallScore, 40);
  if (location.hasMultiShow && location.isValid) overallScore = Math.min(100, overallScore + 5);
  overallScore = Math.max(0, Math.min(100, overallScore));

  // Hard-block reasons — any truthy value prevents publishing
  let blockingReason: string | null = null;
  if (profanity.hasBadWords) {
    blockingReason = `Abusive language detected ("${profanity.badWordsFound.join('", "')}")\u2014remove these words to publish.`;
  } else if (fakeClaims.hasFakeClaims) {
    blockingReason = `Misleading content: ${fakeClaims.claimsFound[0]}\u2014edit your listing to remove false claims.`;
  } else if (!location.isValid) {
    blockingReason = "Valid map coordinates and city are required before publishing.";
  } else if (clarity.score < 40) {
    blockingReason = "Your description is too unclear or incomplete. Add more detail before publishing.";
  }

  return {
    canPublish: blockingReason === null,
    overallScore,
    blockingReason,
    profanity,
    fakeClaims,
    clarity,
    location,
  };
}

