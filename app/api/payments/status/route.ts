import { NextResponse } from "next/server";

import { getPlanConfig, getPlanState, getUsageCountForFeature } from "@/lib/paywall";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
    }

    const [plan, usageCount] = await Promise.all([
      getPlanState({ userId: user.id }),
      getUsageCountForFeature({
        userId: user.id,
        feature: "generate",
      }),
    ]);

    const config = getPlanConfig(plan.planCode);
    return NextResponse.json(
      {
        planCode: plan.planCode,
        planName: config.name,
        status: plan.status,
        usageCount: Number.isFinite(usageCount) ? usageCount : null,
        dailyLimit: Number.isFinite(plan.limit) ? plan.limit : null,
      },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch (error) {
    console.error("Billing status lookup failed:", error);
    return NextResponse.json(
      { error: "Unable to load your plan right now." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } }
    );
  }
}
