import { SponsorCampaign } from "@/types/sponsor";

// Server-side persistent storage partitioned strictly by user ID / email
export const serverCampaignsRegistry: Map<string, SponsorCampaign[]> = new Map();
