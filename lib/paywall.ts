import { createAdminClient } from "./supabase/admin.ts";

export type PlanCode = "free" | "student" | "research";

export const DEFAULT_PLAN: PlanCode = "free";

export type PlanConfig = {
  code: PlanCode;
  name: string;
  maxGenerationsPerDay: number;
  featureLimitsPerDay: Record<string, number>;
  mindMapNodeCount: number;
  features: string[];
  allowsNoteImport: boolean;
};

export const PLAN_CONFIG: Record<PlanCode, PlanConfig> = {
  free: {
    code: "free",
    name: "Free",
    maxGenerationsPerDay: 2,
    featureLimitsPerDay: {
      quiz: 2,
      explain: 2,
      example: 2,
      expand: 2,
      generate: 2,
      connect: 2,
      "import-note": 0,
    },
    mindMapNodeCount: 5,
    features: ["basic-generation"],
    allowsNoteImport: false,
  },
  student: {
    code: "student",
    name: "Student",
    maxGenerationsPerDay: 25,
    featureLimitsPerDay: {
      quiz: 25,
      explain: 25,
      example: 25,
      expand: 25,
      generate: 25,
      connect: 25,
      "import-note": 10,
    },
    mindMapNodeCount: 8,
    features: ["priority-generation", "concept-exploration", "note-import"],
    allowsNoteImport: true,
  },
  research: {
    code: "research",
    name: "Research",
    maxGenerationsPerDay: Number.POSITIVE_INFINITY,
    featureLimitsPerDay: {
      quiz: Number.POSITIVE_INFINITY,
      explain: Number.POSITIVE_INFINITY,
      example: Number.POSITIVE_INFINITY,
      expand: Number.POSITIVE_INFINITY,
      generate: Number.POSITIVE_INFINITY,
      connect: Number.POSITIVE_INFINITY,
      "import-note": Number.POSITIVE_INFINITY,
    },
    mindMapNodeCount: 10,
    features: ["unlimited-generation", "advanced-reasoning", "note-import"],
    allowsNoteImport: true,
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

export function isPaidPlan(planCode: string | PlanCode | null | undefined): boolean {
  const code = normalizePlanCode(planCode);
  return code === "student" || code === "research";
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
    request && "headers" in request ? request.headers : undefined;
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

/**
 * When working inside a shared map, generation quota belongs to the map owner
 * so invited collaborators cannot exceed the owner's plan.
 */
export async function resolveBillingUserId({
  userId,
  mapId,
}: {
  userId: string;
  mapId?: string | null;
}): Promise<string> {
  if (!mapId || typeof mapId !== "string" || !mapId.trim()) {
    return userId;
  }

  try {
    const admin = createAdminClient();
    const { data: map, error } = await admin
      .from("research_maps")
      .select("user_id")
      .eq("id", mapId.trim())
      .maybeSingle();

    if (error || !map?.user_id) {
      return userId;
    }

    const ownerId = String(map.user_id);
    if (ownerId === userId) {
      return userId;
    }

    // Confirm membership before charging the owner's quota.
    const { data: membership } = await admin
      .from("map_members")
      .select("user_id")
      .eq("map_id", mapId.trim())
      .eq("user_id", userId)
      .maybeSingle();

    if (membership?.user_id) {
      return ownerId;
    }

    // Fallback: some workspaces only track owner on research_maps.
    return ownerId;
  } catch (error) {
    console.warn("Unable to resolve workspace billing owner; using actor.", error);
    return userId;
  }
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

    const activeStatus =
      data?.status && ["active", "trialing", "cancelled"].includes(String(data.status))
        ? String(data.status)
        : "expired";

    const currentPeriodEnd =
      data && typeof data.current_period_end === "string"
        ? new Date(data.current_period_end).getTime()
        : Number.NEGATIVE_INFINITY;

    const planCode =
      data &&
      typeof data.plan_code === "string" &&
      ["free", "student", "research"].includes(String(data.plan_code).toLowerCase())
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
  billingUserId,
}: {
  userId: string;
  feature: string;
  request?: Request;
  /** When set (e.g. map owner), quota is checked and recorded against this user. */
  billingUserId?: string;
}): Promise<{
  allowed: boolean;
  planCode: PlanCode;
  limit: number;
  usageCount: number;
  billingUserId: string;
  message?: string;
}> {
  const quotaUserId = billingUserId || userId;
  const state = await getPlanState({ userId: quotaUserId, request });
  const usageCount = await getUsageCountForFeature({ userId: quotaUserId, feature });
  const featureLimit =
    getPlanConfig(state.planCode).featureLimitsPerDay[feature] ?? state.limit;
  const allowed = isUsageAllowed({
    planCode: state.planCode,
    usageCount,
    limit: featureLimit,
  });

  return {
    allowed,
    planCode: state.planCode,
    limit: featureLimit,
    usageCount,
    billingUserId: quotaUserId,
    message: allowed
      ? undefined
      : `You have reached the ${getPlanConfig(state.planCode).name.toLowerCase()} plan limit for today. Upgrade to continue.`,
  };
}
