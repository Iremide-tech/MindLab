import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PLAN,
  getPlanConfig,
  isUsageAllowed,
  type PlanCode,
} from "./paywall.ts";

test("default plan resolves to free", () => {
  assert.equal(DEFAULT_PLAN, "free");
  assert.deepEqual(getPlanConfig("free"), {
    code: "free",
    name: "Free",
    maxGenerationsPerDay: 3,
    mindMapNodeCount: 5,
    features: ["basic-generation"],
  });
});

test("research plan allows unlimited generation", () => {
  const research = getPlanConfig("research");
  assert.equal(research.code, "research");
  assert.equal(research.maxGenerationsPerDay, Number.POSITIVE_INFINITY);
});

test("mind map node counts increase with plan tier", () => {
  assert.equal(getPlanConfig("free").mindMapNodeCount, 5);
  assert.equal(getPlanConfig("student").mindMapNodeCount, 8);
  assert.equal(getPlanConfig("research").mindMapNodeCount, 10);
});

test("usage checks enforce the free plan limit", () => {
  const allowed = isUsageAllowed({
    planCode: "free",
    usageCount: 2,
    limit: getPlanConfig("free").maxGenerationsPerDay,
  });

  assert.equal(allowed, true);

  const blocked = isUsageAllowed({
    planCode: "free",
    usageCount: 3,
    limit: getPlanConfig("free").maxGenerationsPerDay,
  });

  assert.equal(blocked, false);
});

test("only valid plan codes are accepted", () => {
  const plan = "student" as PlanCode;
  assert.equal(getPlanConfig(plan).code, "student");
});
