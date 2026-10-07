import test from "node:test";
import assert from "node:assert/strict";

import { getSafePostAuthPath } from "./redirect.ts";

test("allows known internal post-auth destinations", () => {
  assert.equal(getSafePostAuthPath("/dashboard"), "/dashboard");
  assert.equal(getSafePostAuthPath("/pricing"), "/pricing");
  assert.equal(
    getSafePostAuthPath("/invite/secure-token?source=signup"),
    "/invite/secure-token?source=signup"
  );
});

test("rejects external and unsupported redirect destinations", () => {
  assert.equal(getSafePostAuthPath("https://example.com"), "/dashboard");
  assert.equal(getSafePostAuthPath("/login"), "/dashboard");
  assert.equal(getSafePostAuthPath(null), "/dashboard");
});
