import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { SponsorCampaign } from "@/types/sponsor";
import { serverCampaignsRegistry } from "@/lib/sponsorRegistry";

// Exact valid columns of public.sponsor_campaigns in Supabase
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id")?.trim();
    const email = searchParams.get("email")?.trim();
    const fetchAll = searchParams.get("all") === "true" || userId === "all" || !userId;

    const cleanUser = userId?.toLowerCase() || "";
    const cleanEmail = email?.toLowerCase() || "";
    const seenIds = new Set<string>();
    const results: SponsorCampaign[] = [];

    // 1. Fetch from Supabase sponsor_campaigns table
    try {
      let query = supabase.from("sponsor_campaigns").select("*");

      if (!fetchAll && (cleanUser || cleanEmail)) {
        const filters: string[] = [];
        if (cleanUser && cleanUser !== "all") {
          filters.push(`user_id.eq.${cleanUser}`);
        }
        if (cleanEmail && cleanEmail !== cleanUser) {
          filters.push(`user_id.eq.${cleanEmail}`);
        }
        if (filters.length > 0) {
          query = query.or(filters.join(","));
        }
      }

      const { data: dbData, error } = await query.order("created_at", { ascending: false });

      if (!error && Array.isArray(dbData)) {
        for (const item of dbData) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            results.push(item as SponsorCampaign);
          }
        }
      } else if (error) {
        console.warn("Supabase sponsor_campaigns SELECT warning:", error.message);
      }
    } catch (err) {
      console.warn("Supabase sponsor_campaigns query notice:", err);
    }

    // 2. Fetch from server in-memory provider registry fallback
    if (fetchAll) {
      for (const list of serverCampaignsRegistry.values()) {
        for (const item of list) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            results.push(item);
          }
        }
      }
    } else {
      const registryItems: SponsorCampaign[] = [
        ...(cleanUser ? serverCampaignsRegistry.get(cleanUser) || [] : []),
        ...(cleanEmail && cleanEmail !== cleanUser ? serverCampaignsRegistry.get(cleanEmail) || [] : []),
      ];

      for (const item of registryItems) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push(item);
        }
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, data: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const userId = (body.user_id || body.userId || "provider_default").trim();
    const userEmail = (body.email || body.provider_email || "").trim();
    const userPhone = (body.phone || body.provider_phone || "+91 98201 45920").trim();
    const listingId = String(body.listing_id || "EXP-LISTING-DEFAULT").trim();
    const businessId = String(body.business_id || "BIZ-DEFAULT").trim();

    const now = new Date();
    const startAtDate = body.start_at ? new Date(body.start_at) : now;

    // Default package duration: 7 days
    let durationDays = 7;
    if (body.sponsor_package?.toLowerCase().includes("spark") || body.package_days === 3) durationDays = 3;
    if (body.sponsor_package?.toLowerCase().includes("surge") || body.package_days === 14) durationDays = 14;

    const endAtDate = body.end_at ? new Date(body.end_at) : new Date(startAtDate.getTime() + durationDays * 86400000);

    const campaignId = ensureUuid(body.id);

    const newCampaign: SponsorCampaign = {
      id: campaignId,
      user_id: userId,
      business_id: businessId,
      listing_id: listingId,
      owner_name: body.owner_name || "Verified Provider",
      shop_name: body.shop_name || "Local Experience Host",
      listing_name: body.listing_name || "Local Experience",
      sponsor_type: body.sponsor_type || "boost",
      sponsor_package: body.sponsor_package || "Weekly Push (7 Days)",
      amount: Number(body.amount) || 999,
      offer_type: body.offer_type || "percentage_discount",
      offer_value: Number(body.offer_value) || 20,
      offer_price: Number(body.offer_price) || 960,
      offer_description: body.offer_description || `${body.offer_value || 20}% OFF Special`,
      start_at: startAtDate.toISOString(),
      end_at: endAtDate.toISOString(),
      timezone: body.timezone || "Asia/Kolkata",
      payment_method: body.payment_method || "upi",
      payment_status: "pending",
      payment_transaction_id: undefined,
      campaign_status: "draft",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      provider_email: userEmail,
      provider_phone: userPhone,
      experience_details: body.experience_details,
    };

    // Save in server registry partition for immediate display
    const key = userId.toLowerCase();
    const existing = serverCampaignsRegistry.get(key) || [];
    serverCampaignsRegistry.set(
      key,
      [newCampaign, ...existing.filter((c) => c.id !== newCampaign.id)]
    );
    if (userEmail && userEmail.toLowerCase() !== key) {
      const emailKey = userEmail.toLowerCase();
      const existingEmail = serverCampaignsRegistry.get(emailKey) || [];
      serverCampaignsRegistry.set(
        emailKey,
        [newCampaign, ...existingEmail.filter((c) => c.id !== newCampaign.id)]
      );
    }

    // Persist to Supabase sponsor_campaigns table
    const dbRecord: Record<string, any> = {
      id: newCampaign.id,
      user_id: newCampaign.user_id,
      business_id: newCampaign.business_id,
      listing_id: newCampaign.listing_id,
      owner_name: newCampaign.owner_name,
      shop_name: newCampaign.shop_name,
      listing_name: newCampaign.listing_name,
      sponsor_type: newCampaign.sponsor_type,
      sponsor_package: newCampaign.sponsor_package,
      amount: newCampaign.amount,
      offer_type: newCampaign.offer_type,
      offer_value: newCampaign.offer_value,
      offer_price: newCampaign.offer_price,
      offer_description: newCampaign.offer_description,
      start_at: newCampaign.start_at,
      end_at: newCampaign.end_at,
      timezone: newCampaign.timezone,
      payment_method: newCampaign.payment_method,
      payment_status: "pending",
      campaign_status: "draft",
      created_at: newCampaign.created_at,
      updated_at: newCampaign.updated_at,
    };

    // Filter strictly to valid columns
    const sanitizedDbPayload: Record<string, any> = {};
    for (const [k, v] of Object.entries(dbRecord)) {
      if (VALID_SPONSOR_COLUMNS.has(k)) {
        sanitizedDbPayload[k] = v;
      }
    }

    let dbSuccess = false;
    let dbNotice: string | null = null;
    try {
      const { data, error } = await supabase.from("sponsor_campaigns").insert(sanitizedDbPayload).select();
      if (error) {
        dbNotice = error.message;
        console.warn("Supabase sponsor_campaigns INSERT notice:", error.message);
      } else {
        dbSuccess = true;
      }
    } catch (dbErr: any) {
      dbNotice = dbErr.message;
    }

    return NextResponse.json({
      success: true,
      campaign: newCampaign,
      dbSuccess,
      notice: dbNotice,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
