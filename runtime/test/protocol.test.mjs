import assert from "node:assert/strict";
import test from "node:test";

import { createRuntimeMessage, parseRuntimeMessage, RuntimeMessageType } from "../src/protocol.mjs";

test("creates and parses a versioned runtime message", () => {
  const source = createRuntimeMessage(RuntimeMessageType.searchRequest, { query: "标签" }, 7);
  assert.deepEqual(parseRuntimeMessage(JSON.stringify(source)), { ok: true, message: source });
});

test("rejects malformed and unsupported runtime messages", () => {
  assert.deepEqual(parseRuntimeMessage("{"), { ok: false, reason: "invalid-json" });
  assert.deepEqual(parseRuntimeMessage({ protocolVersion: 2, type: "hello", payload: {} }), { ok: false, reason: "unsupported-version" });
  assert.deepEqual(parseRuntimeMessage({ protocolVersion: 1, type: "hello", payload: [], requestId: 1 }), { ok: false, reason: "invalid-payload" });
});
