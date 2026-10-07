import assert from "node:assert/strict";
import { test } from "node:test";

import { parseJsonResponse } from "./json.ts";

test("parses clean JSON responses", () => {
  const value = parseJsonResponse('{"title":"Mind map","nodes":[]}');

  assert.deepEqual(value, { title: "Mind map", nodes: [] });
});

test("extracts JSON from a fenced code block", () => {
  const value = parseJsonResponse(
    '```json\n{"title":"Mind map","nodes":[]}\n```'
  );

  assert.deepEqual(value, { title: "Mind map", nodes: [] });
});

test("extracts JSON from surrounding prose", () => {
  const value = parseJsonResponse(
    'Here is the result:\n{\n  "title": "Mind map",\n  "nodes": []\n}\nDone.'
  );

  assert.deepEqual(value, { title: "Mind map", nodes: [] });
});

test("rejects non-object JSON output", () => {
  assert.throws(
    () => parseJsonResponse("[1, 2, 3]"),
    /expected a json object/i
  );
});
