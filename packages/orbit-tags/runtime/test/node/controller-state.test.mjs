import assert from "node:assert/strict";
import test from "node:test";

import { isOwnedControllerCommand, parseControllerPid } from "../../../dist/runtime/src/host/controller-state.js";

test("reads current and legacy controller pid files", () => {
  assert.equal(parseControllerPid('{"pid":123,"startedAt":"2026-09-04T00:00:00.000Z"}'), 123);
  assert.equal(parseControllerPid("456\n"), 456);
  assert.equal(parseControllerPid(""), null);
  assert.equal(parseControllerPid('{"pid":"123"}'), null);
});

test("matches only the owned watch command", () => {
  const scriptPath = "/Users/example/Library/Application Support/Codex Sidebar Tags/app.mjs";
  assert.equal(isOwnedControllerCommand(`/usr/bin/node ${scriptPath} watch`, scriptPath), true);
  assert.equal(isOwnedControllerCommand(`/usr/bin/node ${scriptPath} status`, scriptPath), false);
  assert.equal(isOwnedControllerCommand("/usr/bin/node /tmp/app.mjs watch", scriptPath), false);
});

