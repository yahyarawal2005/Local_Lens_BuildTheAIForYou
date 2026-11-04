import { ExperienceListing } from "@/types/experience";

export interface AuditCheckItem {
  id: string;
  label: string;
  passed: boolean;
  impactWeight: number; // Percentage contribution
  recommendation: string;
  datasetField: string;
}

export interface AuditResult {
  score: number;
  canPublish: boolean;
  minPublishScore: number;
  status: "excellent" | "good" | "needs_improvement";
  summary: string;
  checks: AuditCheckItem[];
  highPrioritySuggestions: string[];
}

export function performAIAudit(listing: ExperienceListing): AuditResult {
  const checks: AuditCheckItem[] = [
    {
      id: "media_count",
      label: "Visual Media Quality (At least 2 HD Photos)",
      passed: listing.images && listing.images.length >= 2,
      impactWeight: 15,
      recommendation: "Add at least 2 high-resolution photos highlighting authentic moments.",
      datasetField: "images",
    },
    {
      id: "meeting_point",
      label: "Precise Traveler Meeting Point Landmark",
      passed: Boolean(listing.meeting_point && listing.meeting_point.trim().length > 5),
      impactWeight: 20,
      recommendation: "Specify an unmistakable landmark with gate/entry details for travelers.",
      datasetField: "meeting_point",
    },
    {
      id: "description_depth",
      label: "Narrative & Cultural Context Depth",
      passed: Boolean(listing.description && listing.description.trim().length >= 80),
      impactWeight: 15,
      recommendation: "Enrich experience narrative with unique local lore or host backstory (>80 chars).",
      datasetField: "description",
    },
    {
      id: "geocoding_precision",
      label: "Exact 6-decimal GPS Coordinates",
      passed: listing.latitude !== 0 && listing.longitude !== 0 && !isNaN(listing.latitude),
      impactWeight: 15,
      recommendation: "Use the 3D pin dropper to pin down the exact operational coordinates.",
      datasetField: "latitude, longitude",
    },
    {
      id: "pricing_duration_balance",
      label: "Fair Pricing & Clear Duration Ratio",
      passed: listing.price_inr_clean > 0 && listing.duration_hours_clean > 0,
      impactWeight: 10,
      recommendation: "Ensure price is in standard INR and duration is specified in clear hours.",
      datasetField: "price_inr_clean, duration_hours_clean",
    },
    {
      id: "inclusions_transparency",
      label: "Transparent Inclusions & Gear Checklist",
      passed: Boolean(listing.inclusions && listing.inclusions.length >= 1),
      impactWeight: 10,
      recommendation: "List what is covered (equipment, tasting portions, permits) to prevent disputes.",
      datasetField: "inclusions",
    },
    {
      id: "weather_adaptability",
      label: "Indoor/Outdoor Weather Tagging",
      passed: ["Indoor", "Outdoor", "Mixed"].includes(listing.indoor_outdoor_clean),
      impactWeight: 15,
      recommendation: "Tag environmental adaptability so travelers and weather pauses route accurately.",
      datasetField: "indoor_outdoor_clean",
    },
  ];

  let calculatedScore = 0;
  checks.forEach((chk) => {
    if (chk.passed) {
      calculatedScore += chk.impactWeight;
    }
  });

  // Clamp 0 - 100
  const score = Math.min(100, Math.max(0, calculatedScore));

  const highPrioritySuggestions = checks
    .filter((chk) => !chk.passed)
    .map((chk) => chk.recommendation);

  let status: "excellent" | "good" | "needs_improvement" = "needs_improvement";
  let summary = "Needs refinement before algorithmic boost eligible.";

  if (score >= 90) {
    status = "excellent";
    summary = "Ready for Top-Tier Recommendation Engine & VIP Traveler Push.";
  } else if (score >= 75) {
    status = "good";
    summary = "Solid listing! A couple of quick enhancements can unlock maximum booking conversion.";
  } else if (score < 50) {
    status = "needs_improvement";
    summary = "Quality score is below 50. Publishing is disabled until essential listing standards are met.";
  }

  return {
    score,
    canPublish: score >= 50,
    minPublishScore: 50,
    status,
    summary,
    checks,
    highPrioritySuggestions,
  };
}
