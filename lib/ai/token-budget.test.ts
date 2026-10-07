import assert from "node:assert/strict";
import { test } from "node:test";

import {
  AI_GENERATION_LIMITS,
  getGenerationConfig,
} from "./token-budget.ts";

test("every AI operation has an explicit output token budget", () => {
  const operations = Object.values(AI_GENERATION_LIMITS);

  assert.equal(operations.length, 5);
  assert.ok(operations.every((limit) => Number.isInteger(limit) && limit > 0));
  assert.ok(operations.every((limit) => limit <= 2048));
});

test("generation config forwards a bounded output token limit", () => {
  assert.deepEqual(getGenerationConfig(1200), {
    max_output_tokens: 1200,
  });
  assert.throws(() => getGenerationConfig(0), /positive integer/);
});
