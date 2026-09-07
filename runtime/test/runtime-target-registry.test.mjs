import assert from "node:assert/strict";
import test from "node:test";

import { isCodexRendererTarget, RuntimeTargetRegistry } from "../src/runtime-target-registry.mjs";

test("accepts only inspectable Codex application pages", () => {
  assert.equal(isCodexRendererTarget({ type: "page", url: "app://-/index.html", webSocketDebuggerUrl: "ws://local" }), true);
  assert.equal(isCodexRendererTarget({ type: "page", url: "https://example.com", webSocketDebuggerUrl: "ws://local" }), false);
  assert.equal(isCodexRendererTarget({ type: "worker", url: "app://-/index.html", webSocketDebuggerUrl: "ws://local" }), false);
  assert.equal(isCodexRendererTarget({ type: "page", url: "app://-/index.html" }), false);
});

test("injects repository settings only into runtimes with a different version", async () => {
  const registry = new RuntimeTargetRegistry({
    port: 9341,
    ownsEndpoint: async () => true,
    settingsRepository: { read: async () => { throw new Error("unexpected read"); } },
  });
  registry.discover = async () => [{ id: "target-1", webSocketDebuggerUrl: "ws://local" }];
  const expressions = [];
  registry.evaluate = async (_target, expression) => {
    expressions.push(expression);
    if (expression.includes("?.version")) return "outdated";
    return { version: "current" };
  };
  const settingsState = {
    exists: true,
    settings: { schemaVersion: 2, tags: [{ name: "Review", color: "#123456", description: "复核" }] },
  };
  const result = await registry.ensureInjected(settingsState);
  assert.deepEqual([...result.injectedTargetIds], ["target-1"]);
  assert.match(expressions[1], /"settingsSource":"repository"/u);
  assert.match(expressions[1], /"name":"Review"/u);
});
