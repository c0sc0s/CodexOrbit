import assert from "node:assert/strict";
import test from "node:test";

import { ControllerRouter } from "../../../dist/runtime/src/service/router.js";
import { createRuntimeMessage, RuntimeMessageType } from "../../../dist/runtime/src/shared/protocol.js";

const client = { id: "target-1" };

test("navigation normalizes local IDs and rejects remote or malformed targets", async () => {
  const opened = [];
  const { router } = createRouter({ openSession: async (id) => opened.push(id) });
  const id = "12345678-1234-1234-1234-123456789abc";
  for (const threadId of [id, `local:${id}`, `remote:${id}`, "-".repeat(36), "file:///tmp/session"]) {
    await router.handle(client, createRuntimeMessage(RuntimeMessageType.navigationOpen, { threadId }));
  }
  assert.deepEqual(opened, [id, id]);
});

test("failed settings writes return saved configuration and an explicit error", async () => {
  const { router, sent } = createRouter({ settingsRepository: { write: async () => { throw new Error("disk full"); } } });
  await router.handle(client, createRuntimeMessage(RuntimeMessageType.settingsUpdate, { tags: [] }));
  assert.deepEqual(sent.map(({ message }) => message.type), [RuntimeMessageType.settingsSnapshot, RuntimeMessageType.settingsError]);
});

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
  assert.equal(await router.handle(client, getRequest), true);
  assert.equal(sent[0].message.type, RuntimeMessageType.settingsSnapshot);

  const tags = [{ name: "Review", color: "#123456", description: "复核" }];
  const updateRequest = createRuntimeMessage(RuntimeMessageType.settingsUpdate, { tags });
  assert.equal(await router.handle(client, updateRequest), true);
  assert.deepEqual(getSettings().tags, tags);
});

test("returns bounded search results and ignores unknown messages", async () => {
  const { router, sent } = createRouter();
  const request = createRuntimeMessage(RuntimeMessageType.searchRequest, { query: "match", threadIds: ["thread-1"], limit: 10 }, 4);
  assert.equal(await router.handle(client, request), true);
  assert.equal(sent[0].message.type, RuntimeMessageType.searchResult);
  assert.equal(sent[0].message.requestId, 4);
  assert.equal(sent[0].message.payload.items.length, 1);

  const unknown = createRuntimeMessage("future.message", {});
  assert.equal(await router.handle(client, unknown), false);
});
