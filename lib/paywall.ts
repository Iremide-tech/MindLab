import { createAdminClient } from "./supabase/admin.ts";

export type PlanCode = "free" | "student" | "research";

export const DEFAULT_PLAN: PlanCode = "free";

export type PlanConfig = {
  code: PlanCode;
  name: string;
  maxGenerationsPerDay: number;
  mindMapNodeCount: number;
  features: string[];
};

export const PLAN_CONFIG: Record<PlanCode, PlanConfig> = {
  free: {
    code: "free",
    name: "Free",
    maxGenerationsPerDay: 3,
    mindMapNodeCount: 5,
    features: ["basic-generation"],
  },
  student: {
    code: "student",
    name: "Student",
    maxGenerationsPerDay: 25,
    mindMapNodeCount: 8,
    features: ["priority-generation", "concept-exploration"],
  },
  research: {
    code: "research",
    name: "Research",
    maxGenerationsPerDay: Number.POSITIVE_INFINITY,
    mindMapNodeCount: 10,
    features: ["unlimited-generation", "advanced-reasoning"],
  },
};

export function normalizePlanCode(value: string | PlanCode | null | undefined): PlanCode {
  const normalized = (value ?? DEFAULT_PLAN).toString().trim().toLowerCase();

  if (normalized === "student" || normalized === "research" || normalized === "free") {
    return normalized;
  }

  return DEFAULT_PLAN;
}

export function getPlanConfig(planCode: string | PlanCode | null | undefined): PlanConfig {
  return PLAN_CONFIG[normalizePlanCode(planCode)];
}

export function isUsageAllowed({
  planCode,
  usageCount,
  limit,
}: {
  planCode: string | PlanCode;
  usageCount: number;
  limit?: number;
}): boolean {
  const safePlanCode = normalizePlanCode(planCode);
  if (safePlanCode === "research") {
    return true;
  }

  const resolvedLimit =
    typeof limit === "number" && Number.isFinite(limit)
      ? limit
      : getPlanConfig(safePlanCode).maxGenerationsPerDay;

  return usageCount < resolvedLimit;
}

export function getPlanOverride(
  request?: Request | { headers?: Headers | Record<string, string | undefined> }
): PlanCode | undefined {
  const envOverride = process.env.PAYWALL_PLAN_OVERRIDE?.trim().toLowerCase();
  const requestHeaders =
    request && "headers" in request
      ? request.headers
      : undefined;
  const requestOverride =
    requestHeaders instanceof Headers
      ? requestHeaders.get("x-mindlab-plan")
      : requestHeaders?.["x-mindlab-plan"];

  if (process.env.NODE_ENV === "production") {
    return undefined;
  }

  if (envOverride && ["free", "student", "research"].includes(envOverride)) {
    return normalizePlanCode(envOverride);
  }

  if (requestOverride && ["free", "student", "research"].includes(requestOverride.toLowerCase())) {
    return normalizePlanCode(requestOverride);
  }

  return undefined;
}

export async function getPlanState({
  userId,
  request,
}: {
  userId: string;
  request?: Request;
}): Promise<{
  planCode: PlanCode;
  status: string;
  limit: number;
  usageCount: number;
}> {
  const override = getPlanOverride(request);
  if (override) {
    const config = getPlanConfig(override);
    return {
      planCode: override,
      status: "override",
      limit: config.maxGenerationsPerDay,
      usageCount: 0,
    };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("user_plans")
      .select("plan_code, status, current_period_end")
      .eq("user_id", userId)
      .maybeSingle?.();

    if (error) {
      throw error;
    }

    const activeStatus = data?.status && ["active", "trialing", "cancelled"].includes(String(data.status))
      ? String(data.status)
      : "expired";

    const currentPeriodEnd = data && typeof data.current_period_end === "string"
      ? new Date(data.current_period_end).getTime()
      : Number.NEGATIVE_INFINITY;

    const planCode =
      data && typeof data.plan_code === "string" && ["free", "student", "research"].includes(String(data.plan_code).toLowerCase())
        ? normalizePlanCode(String(data.plan_code))
        : DEFAULT_PLAN;

    const isExpired =
      activeStatus === "expired" ||
      (typeof data?.current_period_end === "string" && currentPeriodEnd <= Date.now()) ||
      (activeStatus === "cancelled" && typeof data?.current_period_end !== "string");

    const effectivePlan = isExpired ? DEFAULT_PLAN : planCode;
    const config = getPlanConfig(effectivePlan);

    return {
      planCode: effectivePlan,
      status: isExpired ? "expired" : activeStatus,
      limit: config.maxGenerationsPerDay,
      usageCount: 0,
    };
  } catch (error) {
    console.warn("Paywall plan lookup unavailable; falling back to the free tier.", error);
    const config = getPlanConfig(DEFAULT_PLAN);
    return {
      planCode: DEFAULT_PLAN,
      status: "fallback",
      limit: config.maxGenerationsPerDay,
      usageCount: 0,
    };
  }
}

export async function getUsageCountForFeature({
  userId,
  feature,
}: {
  userId: string;
  feature: string;
}): Promise<number> {
  try {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const admin = createAdminClient();
    const { count, error } = await admin
      .from("user_usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("feature", feature)
      .gte("created_at", start.toISOString());

    if (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "42P01") {
        return 0;
      }
      throw error;
    }

    return Number(count ?? 0);
  } catch (error) {
    console.warn(`Usage count lookup unavailable for ${feature}.`, error);
    return Number.POSITIVE_INFINITY;
  }
}

export async function recordFeatureUsage({
  userId,
  feature,
}: {
  userId: string;
  feature: string;
}): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("user_usage_events").insert({
      user_id: userId,
      feature,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;
    return true;
  } catch (error) {
    console.warn(`Failed to record usage for ${feature}.`, error);
    return false;
  }
}

export async function enforceFeatureLimit({
  userId,
  feature,
  request,
}: {
  userId: string;
  feature: string;
  request?: Request;
}): Promise<{
  allowed: boolean;
  planCode: PlanCode;
  limit: number;
  usageCount: number;
  message?: string;
}> {
  const state = await getPlanState({ userId, request });
  const usageCount = await getUsageCountForFeature({ userId, feature });
  const allowed = isUsageAllowed({
    planCode: state.planCode,
    usageCount,
    limit: state.limit,
  });

  return {
    allowed,
    planCode: state.planCode,
    limit: state.limit,
    usageCount,
    message: allowed
      ? undefined
      : `You have reached the ${getPlanConfig(state.planCode).name.toLowerCase()} plan limit for today. Upgrade to continue.`,
  };
}
