import assert from "node:assert/strict";
import test from "node:test";

import { createTagSettings, normalizeTagDefinitions } from "../src/tag-settings.mjs";

test("migrates legacy tone settings and supplies default descriptions", () => {
  assert.deepEqual(normalizeTagDefinitions([{ name: "Bug", tone: "red" }]), [{
    name: "Bug",
    color: "#d95c5c",
    description: "修复错误、异常行为、回归或稳定性问题",
  }]);
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
