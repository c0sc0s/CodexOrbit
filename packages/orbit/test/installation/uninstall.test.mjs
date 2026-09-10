import assert from "node:assert/strict";
import test from "node:test";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInstallationManager } from "../../dist/installation/manager.js";
import { runPlatformCli } from "../../dist/cli/platform.js";

test("platform uninstall requires explicit confirmation and rejects ambiguous flags", async () => {
  for (const args of [[], ["--purge"]]) {
    await assert.rejects(runPlatformCli(["uninstall", ...args]), /confirm removal/);
  }
  for (const args of [["--yes", "--dry-run"], ["--yes", "--yes"], ["--all"]]) {
    await assert.rejects(runPlatformCli(["uninstall", ...args]), /Usage/);
  }
});

async function setup(t, overrides = {}) {
  const home = await mkdtemp(join(tmpdir(), "orbit-uninstall-test-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const calls = [];
  const options = { home, root: join(home, "orbit"), platform: "darwin", manageExtensions: false,
    run: async (_file, args) => { calls.push(args); return { stdout: "", stderr: "" }; }, ...overrides };
  const manager = createInstallationManager(options);
  await manager.install();
  const source = join(home, "plugin");
  await mkdir(source);
  await writeFile(join(source, "package.json"), JSON.stringify({ name: "test-plugin", version: "1.0.0", files: ["orbit-plugin.json", "renderer.js"] }));
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify({ schemaVersion: 1, id: "test-plugin", version: "1.0.0", runtimeVersion: "1.0.0", orbit: { min: "0.5.0", maxExclusive: "1.0.0" }, renderer: "renderer.js" }));
  await writeFile(join(source, "renderer.js"), "export function activate() {}\n");
  await manager.addPlugin(source);
  const data = join(manager.paths.root, "data/test-plugin/settings.json");
  await writeFile(data, "user settings");
  return { home, manager, options, calls, data };
}

test("preview is nonmutating; ordinary uninstall preserves data and supports reinstall", async t => {
  const { manager, calls, data } = await setup(t);
  const before = await readFile(manager.paths.configPath, "utf8"), count = calls.length;
  assert.equal((await manager.uninstall({ dryRun: true })).status, "planned");
  assert.equal(calls.length, count);
  assert.equal(await readFile(manager.paths.configPath, "utf8"), before);
  await access(manager.paths.launcherPath);
  const result = await manager.uninstall();
  assert.equal(result.status, "uninstalled");
  assert.ok(calls.some(args => args[1] === "stop"));
  assert.equal(await readFile(data, "utf8"), "user settings");
  await assert.rejects(access(manager.paths.launcherPath));
  await assert.rejects(access(manager.paths.configPath));
  await assert.rejects(access(join(manager.paths.root, "runtime")));
  await manager.install();
  assert.equal((await manager.status()).installed, true);
  assert.equal(await readFile(data, "utf8"), "user settings");
});

test("purge after ordinary uninstall removes owned data and the empty root", async t => {
  const { manager, home } = await setup(t);
  const protectedFile = join(home, "codex-session.txt");
  await writeFile(protectedFile, "untouched");
  const state = join(manager.paths.root, "module-data/test-plugin");
  await mkdir(state, { recursive: true });
  await writeFile(join(state, "state.json"), "{}");
  await manager.uninstall();
  await access(state);
  const result = await manager.uninstall({ purge: true });
  assert.deepEqual(result.remaining, []);
  await assert.rejects(access(manager.paths.root));
  assert.equal(await readFile(protectedFile, "utf8"), "untouched");
  assert.equal((await manager.uninstall({ purge: true })).status, "not-installed");
});

test("purge preserves external data and unrelated files and reports them", async t => {
  const { manager, home } = await setup(t);
  const external = join(home, "legacy-data");
  await mkdir(external); await writeFile(join(external, "settings.json"), "keep");
  const config = await manager.read();
  config.orbit.packages["test-plugin"].dataDirectory = external;
  config.orbit.packages["test-plugin"].externalData = true;
  await writeFile(manager.paths.configPath, JSON.stringify(config));
  const unknown = join(manager.paths.root, "user-notes.txt"); await writeFile(unknown, "keep");
  const result = await manager.uninstall({ purge: true });
  assert.ok(result.preserved.includes(external));
  assert.ok(result.remaining.includes(unknown));
  await access(join(external, "settings.json")); await access(unknown);
});

test("foreign launcher and symlink data abort before stopping or deleting", async t => {
  const { manager, calls, data, home } = await setup(t);
  const executable = join(manager.paths.launcherPath, "Contents/MacOS/codex-plugin-loader");
  const original = await readFile(executable, "utf8");
  await writeFile(executable, "foreign launcher");
  const count = calls.length;
  await assert.rejects(manager.uninstall({ purge: true }), /another installation/);
  assert.equal(calls.length, count); await access(data);
  await writeFile(executable, original);
  await rm(join(manager.paths.root, "data"), { recursive: true });
  await symlink(home, join(manager.paths.root, "data"));
  await assert.rejects(manager.uninstall({ purge: true }), /symlink/);
  assert.equal(calls.length, count); await access(manager.paths.configPath);
});

test("stop failure preserves metadata and payload for retry", async t => {
  const { manager, options, data } = await setup(t);
  const failing = createInstallationManager({ ...options, run: async () => { throw new Error("stop failed"); } });
  await assert.rejects(failing.uninstall({ purge: true }), /stop failed/);
  await access(manager.paths.configPath); await access(data); await access(manager.paths.launcherPath);
});

test("unknown runtime snapshots are not recursively removed", async t => {
  const { manager, calls } = await setup(t);
  const unknown = join(manager.paths.root, "runtime/foreign");
  await mkdir(unknown); await writeFile(join(unknown, "package.json"), '{"name":"foreign"}');
  const count = calls.length;
  await assert.rejects(manager.uninstall({ purge: true }), /Unowned runtime/);
  assert.equal(calls.length, count); await access(unknown);
});

test("orphan runtime processes prevent destructive cleanup", async t => {
  const { manager, options, data } = await setup(t);
  const orphan = createInstallationManager({ ...options, run: async file => ({
    stdout: file === "/bin/ps" ? `123 node ${manager.paths.root}/runtime/old/dist/cli.js watch --config ${manager.paths.configPath} --port 9341` : "", stderr: "",
  }) });
  await assert.rejects(orphan.uninstall({ purge: true }), /Residual Orbit runtime/);
  await access(manager.paths.configPath); await access(data);
});

test("daemon conflict aborts and extension removal failures remain retryable", async t => {
  const { manager, options, data } = await setup(t);
  const conflict = createInstallationManager({ ...options, getDaemonStatus: async () => ({ running: false, conflict: true }) });
  await assert.rejects(conflict.uninstall(), /ownership conflicts/);
  const config = await manager.read();
  config.orbit.packages["test-plugin"].manifest.codex = { name: "test-plugin", marketplace: "test-market" };
  await writeFile(manager.paths.configPath, JSON.stringify(config));
  const failing = createInstallationManager({ ...options, manageExtensions: true, codexBinary: "/test/codex", run: async (file) => {
    if (file === "/test/codex") throw new Error("extension unavailable");
    return { stdout: "", stderr: "" };
  } });
  await assert.rejects(failing.uninstall(), /extension unavailable/);
  await access(manager.paths.configPath); await access(data);
});
