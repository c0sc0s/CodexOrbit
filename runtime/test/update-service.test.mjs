import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { UpdateService, isNewer, isRelease } from "../src/update-service.mjs";
import { runUpdate, writeUpdateStatus } from "../src/update-worker.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "tags-update-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, "install.json"), JSON.stringify({ packageVersion: "0.6.1" }));
  return root;
}
test("stable versions compare numerically and never downgrade", () => {
  assert.equal(isNewer("0.10.0", "0.9.9"), true);
  for (const version of ["0.6.1", "0.5.9", "0.7.0-beta.1", "latest;touch /tmp/no", "01.7.0"]) assert.equal(isNewer(version, "0.6.1"), false);
  assert.equal(isRelease("1.2.3"), true);
});
test("checks are single flight, cached, and manually refreshable", async (t) => {
  const root = await fixture(t); let calls = 0;
  const service = new UpdateService(root, () => {}, { fetchMetadata: async () => { calls++; return { ok: true, json: async () => ({ version: "0.7.0" }) }; } });
  await service.refresh();
  await Promise.all([service.check(), service.check()]); await service.check();
  assert.equal(calls, 1); assert.equal(service.state.phase, "available");
  await service.check(true); assert.equal(calls, 2);
});
test("registry failures and invalid metadata allow retry", async (t) => {
  const root = await fixture(t);
  for (const fetchMetadata of [async () => { throw new Error("offline"); }, async () => ({ ok: true, json: async () => ({ version: "latest" }) })]) {
    const service = new UpdateService(root, () => {}, { fetchMetadata }); await service.refresh(); await service.check();
    assert.equal(service.state.error, "check"); assert.equal(service.checkedAt, 0);
  }
});
test("restart recovers terminal status and detects a dead worker", async (t) => {
  const root = await fixture(t);
  await writeUpdateStatus(root, { phase: "updating", pid: -1, latestVersion: "0.7.0" });
  const service = new UpdateService(root, () => {}); await service.refresh();
  assert.equal(service.state.error, "interrupted");
  await writeUpdateStatus(root, { phase: "succeeded", currentVersion: "wrong" }); await service.refresh();
  assert.equal(service.state.currentVersion, "0.6.1");
});
test("installation requires an available higher version and a free lock", async (t) => {
  const root = await fixture(t); const service = new UpdateService(root, () => {});
  service.findNpm = () => { throw new Error("Must not start npm"); };
  await service.refresh(); await service.install(); assert.equal(service.state.phase, "idle");
  await writeFile(join(root, "update.lock"), JSON.stringify({ pid: process.pid }));
  service.state = { phase: "available", currentVersion: "0.6.1", latestVersion: "0.7.0" };
  await service.install(); assert.equal(service.state.error, "start"); await access(join(root, "update.lock"));
});
test("worker pins npm package and persists verified completion outside temporary files", async (t) => {
  const root = await fixture(t); const temporary = await mkdtemp(join(root, "worker-")); const commands = [];
  await runUpdate({ directory: root, temporary, npmCli: "/npm-cli.js", version: "0.7.0" }, async (executable, args, options) => {
    commands.push(args); assert.equal(options.env.CODEX_TAGS_INSTALL_DIR, root);
    if (args.at(-1) === "update") await writeFile(join(root, "install.json"), JSON.stringify({ packageVersion: "0.7.0" }));
  });
  assert.equal(commands[0].at(-1), "@c0sc0s/codex-tags@0.7.0");
  assert.equal(JSON.parse(await readFile(join(root, "update-status.json"))).phase, "succeeded");
  await assert.rejects(access(temporary));
});
test("worker failure persists an error and attempts local recovery", async (t) => {
  const root = await fixture(t); const temporary = await mkdtemp(join(root, "worker-")); let calls = 0;
  await runUpdate({ directory: root, temporary, npmCli: "/npm-cli.js", version: "0.7.0" }, async () => { calls++; throw new Error("failed"); });
  assert.equal(calls, 2); assert.equal(JSON.parse(await readFile(join(root, "update-status.json"))).error, "install");
});
test("detached worker survives service replacement and reports completion to the new service", async (t) => {
  const root = await fixture(t); const npmCli = join(root, "npm-cli.js");
  await writeFile(npmCli, `const fs = require('node:fs'); const path = require('node:path');
const prefix = process.argv[process.argv.indexOf('--prefix') + 1];
const bin = path.join(prefix, 'node_modules/@c0sc0s/codex-tags/bin'); fs.mkdirSync(bin, { recursive: true });
fs.writeFileSync(path.join(bin, 'codex-tags.mjs'), "import {writeFileSync} from 'node:fs'; import {join} from 'node:path'; writeFileSync(join(process.env.CODEX_TAGS_INSTALL_DIR, 'install.json'), JSON.stringify({packageVersion:'0.7.0'}));");`);
  const service = new UpdateService(root, () => {}); service.findNpm = async () => npmCli;
  service.state = { phase: "available", currentVersion: "0.6.1", latestVersion: "0.7.0" };
  await service.install(); assert.equal(service.state.phase, "updating");
  const replacement = new UpdateService(root, () => {});
  for (let attempt = 0; attempt < 100; attempt++) {
    await replacement.refresh(); if (replacement.state.phase !== "updating") break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(replacement.state.phase, "succeeded", JSON.stringify(replacement.state)); assert.equal(replacement.state.currentVersion, "0.7.0");
});
