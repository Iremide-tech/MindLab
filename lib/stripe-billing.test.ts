import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getExpectedPlanAmount,
  isPaidPlanCode,
  mapStripeSubscriptionStatus,
} from "./stripe-billing.ts";

test("paid plan prices match the public monthly USD prices", () => {
  assert.equal(getExpectedPlanAmount("student"), 1200);
  assert.equal(getExpectedPlanAmount("research"), 2900);
});

test("only supported paid plans are accepted", () => {
  assert.equal(isPaidPlanCode("student"), true);
  assert.equal(isPaidPlanCode("research"), true);
  assert.equal(isPaidPlanCode("free"), false);
  assert.equal(isPaidPlanCode("owner"), false);
});

test("Stripe subscription statuses map to supported plan states", () => {
  assert.equal(mapStripeSubscriptionStatus("active", false), "active");
  assert.equal(mapStripeSubscriptionStatus("active", true), "cancelled");
  assert.equal(mapStripeSubscriptionStatus("trialing", false), "trialing");
  assert.equal(mapStripeSubscriptionStatus("past_due", false), "cancelled");
  assert.equal(mapStripeSubscriptionStatus("canceled", false), "expired");
  assert.equal(mapStripeSubscriptionStatus("incomplete", false), null);
});