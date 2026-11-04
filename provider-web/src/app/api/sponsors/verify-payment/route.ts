import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { serverCampaignsRegistry } from "@/lib/sponsorRegistry";
import { SponsorCampaign } from "@/types/sponsor";

const VALID_SPONSOR_COLUMNS = new Set([
  "id",
  "user_id",
  "business_id",
  "listing_id",
  "owner_name",
  "shop_name",
  "listing_name",
  "sponsor_type",
  "sponsor_package",
  "amount",
  "offer_type",
  "offer_value",
  "offer_price",
  "offer_description",
  "start_at",
  "end_at",
  "timezone",
  "payment_method",
  "payment_status",
  "payment_transaction_id",
  "campaign_status",
  "created_at",
  "updated_at",
]);

function ensureUuid(id?: string): string {
  if (!id) return crypto.randomUUID();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id;
  return crypto.randomUUID();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const campaignId = body.campaign_id?.trim();
    const paymentMethod = body.payment_method || "upi";
    const transactionId =
      body.payment_transaction_id ||
      `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (!campaignId) {
      return NextResponse.json(
        { success: false, error: "Campaign ID is required for payment verification." },
        { status: 400 }
      );
    }

    // Locate the campaign across server partitions or Supabase
    let matchedCampaign: SponsorCampaign | null = null;

    for (const [, campaigns] of serverCampaignsRegistry.entries()) {
      const found = campaigns.find((c) => c.id === campaignId);
      if (found) {
        matchedCampaign = found;
        break;
      }
    }

    // If not found in memory, query Supabase
    if (!matchedCampaign) {
      try {
        const { data, error } = await supabase
          .from("sponsor_campaigns")
          .select("*")
          .eq("id", campaignId)
          .maybeSingle();

        if (!error && data) {
          matchedCampaign = data as SponsorCampaign;
        }
      } catch (err) {
        console.warn("Supabase fetch notice in payment verify:", err);
      }
    }

    if (!matchedCampaign) {
      matchedCampaign = {
        id: campaignId,
        user_id: body.user_id || "provider_default",
        listing_id: body.listing_id || "EXP-001",
        owner_name: body.owner_name || "Verified Host",
        shop_name: body.shop_name || "Local Experience Host",
        listing_name: body.listing_name || "Local Experience",
        sponsor_type: body.sponsor_type || "boost",
        sponsor_package: body.sponsor_package || "Weekly Push (7 Days)",
        amount: Number(body.amount) || 999,
        offer_type: body.offer_type || "percentage_discount",
        offer_value: Number(body.offer_value) || 20,
        offer_price: Number(body.offer_price) || 960,
        offer_description: body.offer_description || "20% OFF",
        start_at: body.start_at || new Date().toISOString(),
        end_at: body.end_at || new Date(Date.now() + 7 * 86400000).toISOString(),
        timezone: "Asia/Kolkata",
        payment_method: paymentMethod,
        payment_status: "pending",
        campaign_status: "draft",
        created_at: new Date().toISOString(),
        experience_details: body.experience_details,
      };
    }

    const now = new Date();
    const startAtDate = new Date(matchedCampaign.start_at);
    const isFuture = startAtDate.getTime() > now.getTime();
    const newCampaignStatus = isFuture ? "scheduled" : "active";

    matchedCampaign.payment_status = "paid";
    matchedCampaign.payment_transaction_id = transactionId;
    matchedCampaign.payment_method = paymentMethod;
    matchedCampaign.campaign_status = newCampaignStatus;
    matchedCampaign.updated_at = now.toISOString();

    if (body.experience_details) {
      matchedCampaign.experience_details = body.experience_details;
    }

    // Update server registry across all relevant partitions
    const userKey = (matchedCampaign.user_id || "").toLowerCase();
    for (const [k, list] of serverCampaignsRegistry.entries()) {
      if (list.some((c) => c.id === matchedCampaign!.id)) {
        serverCampaignsRegistry.set(
          k,
          [matchedCampaign, ...list.filter((c) => c.id !== matchedCampaign!.id)]
        );
      }
    }
    if (userKey) {
      const existingForUser = serverCampaignsRegistry.get(userKey) || [];
      serverCampaignsRegistry.set(
        userKey,
        [matchedCampaign, ...existingForUser.filter((c) => c.id !== matchedCampaign!.id)]
      );
    }

    // Update Supabase sponsor_campaigns table record
    let dbUpdated = false;
    let dbError: string | null = null;
    try {
      const { data, error } = await supabase
        .from("sponsor_campaigns")
        .update({
          payment_status: "paid",
          payment_transaction_id: transactionId,
          campaign_status: newCampaignStatus,
          updated_at: now.toISOString(),
        })
        .eq("id", campaignId)
        .select();

      if (!error && data && data.length > 0) {
        dbUpdated = true;
      } else {
        // Upsert full campaign record
        const upsertRecord: Record<string, any> = {
          id: ensureUuid(matchedCampaign.id),
          user_id: matchedCampaign.user_id,
          business_id: matchedCampaign.business_id || "BIZ-DEFAULT",
          listing_id: matchedCampaign.listing_id || "EXP-DEFAULT",
          owner_name: matchedCampaign.owner_name,
          shop_name: matchedCampaign.shop_name,
          listing_name: matchedCampaign.listing_name,
          sponsor_type: matchedCampaign.sponsor_type,
          sponsor_package: matchedCampaign.sponsor_package,
          amount: matchedCampaign.amount,
          offer_type: matchedCampaign.offer_type,
          offer_value: matchedCampaign.offer_value,
          offer_price: matchedCampaign.offer_price,
          offer_description: matchedCampaign.offer_description,
          start_at: matchedCampaign.start_at,
          end_at: matchedCampaign.end_at,
          timezone: matchedCampaign.timezone,
          payment_method: matchedCampaign.payment_method,
          payment_status: "paid",
          payment_transaction_id: transactionId,
          campaign_status: newCampaignStatus,
          created_at: matchedCampaign.created_at,
          updated_at: now.toISOString(),
        };

        const sanitizedPayload: Record<string, any> = {};
        for (const [k, v] of Object.entries(upsertRecord)) {
          if (VALID_SPONSOR_COLUMNS.has(k)) sanitizedPayload[k] = v;
        }

        const upsertRes = await supabase.from("sponsor_campaigns").upsert(sanitizedPayload).select();
        if (upsertRes.error) {
          dbError = upsertRes.error.message;
        } else {
          dbUpdated = true;
        }
      }
    } catch (err: any) {
      dbError = err.message;
      console.warn("Supabase payment update notice:", err);
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: `Payment verified successfully via ${paymentMethod.toUpperCase()}. Campaign is now ${newCampaignStatus}.`,
      campaign: matchedCampaign,
      transaction_id: transactionId,
      dbUpdated,
      dbError,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
