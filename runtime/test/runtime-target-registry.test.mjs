import assert from "node:assert/strict";
import test from "node:test";

import { isCodexRendererTarget, RuntimeTargetRegistry } from "../src/runtime-target-registry.mjs";

test("accepts only inspectable Codex application pages", () => {
  assert.equal(isCodexRendererTarget({ type: "page", url: "app://-/index.html", webSocketDebuggerUrl: "ws://local" }), true);
  assert.equal(isCodexRendererTarget({ type: "page", url: "https://example.com", webSocketDebuggerUrl: "ws://local" }), false);
  assert.equal(isCodexRendererTarget({ type: "worker", url: "app://-/index.html", webSocketDebuggerUrl: "ws://local" }), false);
  assert.equal(isCodexRendererTarget({ type: "page", url: "app://-/index.html" }), false);
});
