import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, symlink, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parseCliOptions } from "../../../dist/scripts/cli-options.js";
import { activationHealth } from "../../../dist/scripts/health.js";
import { withLifecycleLock } from "../../../dist/scripts/lifecycle-lock.js";

test("CLI defaults to two-step installation and rejects unsafe ambiguous arguments", () => {
  assert.equal(parseCliOptions([]).command, "install");
  assert.equal(parseCliOptions(["--help"]).command, "help");
  assert.equal(parseCliOptions(["uninstall", "--purge", "--json"]).purge, true);
  for (const args of [["off", "--purge"], ["install", "off"], ["uninstall", "--pruge"], ["unknown"]]) assert.throws(() => parseCliOptions(args));
});

test("activation fails closed on absent, stale, partially injected or broken services", () => {
  const healthy = {
    runtime: { installed: true, cdp: true, controllerPid: 123, sourceVersion: "1", activeVersions: ["1"], activeWindows: [{ toolbar: true }], catalog: { complete: true }, tagSettings: { tags: [] }, searchIndex: { indexedSessions: 0 } },
    plugin: { installed: true, enabled: true, payloadPresent: true }, supervisor: { loaded: false },
  };
  assert.equal(activationHealth(healthy).ok, true);
  assert.equal(activationHealth({ ...healthy, supervisor: { loaded: true, pid: 456 } }).ok, false);
  for (const patch of [{ activeVersions: ["1", null] }, { activeVersions: ["0"] }, { tagSettings: undefined }, { tagSettingsError: "read failed" }, { controllerPid: null }, { searchIndex: { error: "corrupt" } }]) {
    assert.equal(activationHealth({ ...healthy, runtime: { ...healthy.runtime, ...patch } }).ok, false);
  }
  assert.equal(activationHealth({}).ok, false);
});

test("lifecycle lock rejects concurrent mutation and is released after failure", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-lock-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(withLifecycleLock(root, async () => {
    assert.equal(JSON.parse(await readFile(join(root, ".lifecycle.lock"))).pid, process.pid);
    await assert.rejects(withLifecycleLock(root, async () => {}), /Another installation/u);
    throw new Error("test failure");
  }), /test failure/u);
  assert.equal(await withLifecycleLock(root, async () => "recovered"), "recovered");
});

test("lifecycle lock refuses a symlink destination before writing or executing", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-lock-link-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const link = join(root, "linked-install");
  await symlink(root, link);
  await assert.rejects(withLifecycleLock(link, async () => assert.fail("must not execute")), /symbolic link/u);
  await assert.rejects(access(join(root, ".lifecycle.lock")));
});
