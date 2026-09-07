import assert from "node:assert/strict";
import test from "node:test";

import { ControllerRouter } from "../src/controller-router.mjs";
import { createRuntimeMessage, RuntimeMessageType } from "../src/protocol.mjs";

const client = { target: { id: "target-1" } };

function createRouter(overrides = {}) {
  const sent = [];
  let settings = { schemaVersion: 2, tags: [{ name: "Bug", color: "#d95c5c", description: "" }] };
  const router = new ControllerRouter({
    searchIndex: { search: () => [{ threadId: "thread-1", snippet: "match" }] },
    settingsRepository: { write: async (tags) => ({ settings: { schemaVersion: 2, tags } }) },
    getSettings: () => settings,
    onSettingsChanged: async (nextSettings) => { settings = nextSettings; },
    waitForIndex: async () => {},
    getIndexStatus: () => ({ phase: "ready", completed: 1, total: 1 }),
    send: async (_client, message, executionContextId) => { sent.push({ message, executionContextId }); },
    ...overrides,
  });
  return { router, sent, getSettings: () => settings };
}

test("routes settings snapshots and updates through one versioned boundary", async () => {
  const { router, sent, getSettings } = createRouter();
  const getRequest = createRuntimeMessage(RuntimeMessageType.settingsGet, {});
  assert.equal(await router.handle(client, { payload: JSON.stringify(getRequest), executionContextId: 7 }), true);
  assert.equal(sent[0].message.type, RuntimeMessageType.settingsSnapshot);
  assert.equal(sent[0].executionContextId, 7);

  const tags = [{ name: "Review", color: "#123456", description: "复核" }];
  const updateRequest = createRuntimeMessage(RuntimeMessageType.settingsUpdate, { tags });
  assert.equal(await router.handle(client, { payload: JSON.stringify(updateRequest) }), true);
  assert.deepEqual(getSettings().tags, tags);
});

test("returns bounded search results and ignores unknown messages", async () => {
  const { router, sent } = createRouter();
  const request = createRuntimeMessage(RuntimeMessageType.searchRequest, { query: "match", threadIds: ["thread-1"], limit: 10 }, 4);
  assert.equal(await router.handle(client, { payload: JSON.stringify(request), executionContextId: 3 }), true);
  assert.equal(sent[0].message.type, RuntimeMessageType.searchResult);
  assert.equal(sent[0].message.requestId, 4);
  assert.equal(sent[0].message.payload.items.length, 1);

  const unknown = createRuntimeMessage("future.message", {});
  assert.equal(await router.handle(client, { payload: JSON.stringify(unknown) }), false);
});
