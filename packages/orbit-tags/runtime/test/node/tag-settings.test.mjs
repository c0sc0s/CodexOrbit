import assert from "node:assert/strict";
import test from "node:test";

import { createTagSettings, DEFAULT_TAG_DEFINITIONS, normalizeTagDefinitions } from "../../../dist/runtime/src/shared/tag-settings.js";

test("migrates legacy tone settings and supplies default descriptions", () => {
  assert.deepEqual(normalizeTagDefinitions([{ name: "Bug", tone: "red" }]), [{
    name: "Bug",
    color: "#d95c5c",
    description: DEFAULT_TAG_DEFINITIONS.find(({ name }) => name === "Bug").description,
  }]);
});

test("seeds four English defaults without replacing saved user definitions", () => {
  const defaults = createTagSettings(undefined).tags;
  assert.deepEqual(defaults.map(({ name }) => name), ["Feature", "Bug", "Design", "Research"]);
  for (const { description } of defaults) {
    assert.ok(description.length > 0 && description.length <= 240);
    assert.match(description, /^[\x20-\x7e]+$/u);
  }
  const saved = [
    { name: "Pending", color: "#123456", description: "My custom category" },
    { name: "Bug", color: "#654321", description: "My own definition" },
  ];
  assert.deepEqual(createTagSettings(saved).tags, saved);
  assert.deepEqual(createTagSettings([]).tags, []);
});

test("normalizes custom colors and optional descriptions into schema v2", () => {
  assert.deepEqual(createTagSettings([{
    name: "Review",
    color: "#ABCDEF",
    description: "  需要   人工复核  ",
  }]), {
    schemaVersion: 2,
    tags: [{ name: "Review", color: "#abcdef", description: "需要 人工复核" }],
  });
});
