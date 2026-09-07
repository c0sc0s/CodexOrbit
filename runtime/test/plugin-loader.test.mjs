import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { mkdtemp, rm, writeFile, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOADER_VERSION, buildPluginExpression, PluginTargetRegistry } from "../src/plugin-loader/index.mjs";
import { readPlugins } from "../src/plugin-loader/manifest.mjs";

function renderer() {
  const context = vm.createContext({ window: {}, AbortController, setTimeout, clearTimeout, events: [] });
  const load = (id, version = "1", source = `var CodexPlugin = { activate({ id, onDispose }) {
    events.push('start:' + id);
    onDispose(() => events.push('stop:' + id));
    return { handleMessage: message => id + ':' + message, status: () => ({ ready: true }) };
  } };`) => vm.runInContext(buildPluginExpression({ id, version, source }), context);
  return { context, load, get loader() { return context.window.__codexPluginLoader; } };
}

test("independent plugins coexist, route messages and unload only their own resources", async () => {
  const host = renderer();
  await host.load("first");
  await host.load("second");
  assert.equal(host.loader.dispatch("first", "hi"), "first:hi");
  assert.equal(host.loader.dispatch("absent", "hi"), false);
  await host.loader.unload("first");
  assert.equal(host.loader.status("first"), null);
  assert.equal(host.loader.status("second").state, "active");
  assert.deepEqual(host.context.events, ["start:first", "start:second", "stop:first"]);
});

test("concurrent identical loads mount once; upgrade cleans before activation", async () => {
  const host = renderer();
  await Promise.all([host.load("first"), host.load("first")]);
  await host.load("first", "2");
  assert.deepEqual(host.context.events, ["start:first", "stop:first", "start:first"]);
  assert.equal(host.loader.status("first").version, "2");
});

test("externally disposed instances recover and invalid runtime contracts fail closed", async () => {
  const host = renderer();
  const source = `var CodexPlugin = { activate() {
    window.mounted = true;
    events.push('mounted');
    return { isActive: () => window.mounted, handleMessage: () => true };
  } };`;
  await host.load("first", "1", source);
  host.context.window.mounted = false;
  assert.equal(host.loader.status("first").state, "inactive");
  assert.equal(host.loader.dispatch("first", {}), false);
  await host.load("first", "1", source);
  assert.deepEqual(host.context.events, ["mounted", "mounted"]);
  await assert.rejects(host.loader.load({ apiVersion: 1, version: "1" }, () => {}), /Invalid/);
  await assert.rejects(host.loader.load({ apiVersion: 2, id: "other", version: "1" }, () => {}), /Invalid/);
});

test("failed activation cleans registered resources in reverse order and can retry", async () => {
  const host = renderer();
  await assert.rejects(host.load("broken", "1", `var CodexPlugin = { activate({ onDispose, signal }) {
    onDispose(() => events.push('first:' + signal.aborted));
    onDispose(() => events.push('second'));
    throw new Error('private data must not appear in diagnostics');
  } };`), /^Error: Plugin broken activation failed$/);
  assert.deepEqual(host.context.events, ["second", "first:true"]);
  assert.equal(host.loader.status("broken").state, "failed");
  await host.load("working");
  await host.load("broken");
  assert.equal(host.loader.status("broken").state, "active");
});

test("cleanup failure runs remaining disposers and blocks unsafe replacement", async () => {
  const host = renderer();
  await host.load("broken", "1", `var CodexPlugin = { activate({ onDispose }) {
    onDispose(() => events.push('remaining'));
    onDispose(() => { throw new Error('failed'); });
  } };`);
  await assert.rejects(host.load("broken", "2"), /cleanup failed/);
  assert.deepEqual(host.context.events, ["remaining"]);
  assert.equal(host.loader.status("broken").state, "cleanup-failed");
  await assert.rejects(host.load("broken", "2"), /renderer reload/);
  await host.load("other");
});

test("unload waits for pending activation and invokes instance cleanup", async () => {
  const host = renderer();
  let release;
  host.context.ready = new Promise((resolve) => { release = resolve; });
  const loading = host.load("slow", "1", `var CodexPlugin = { async activate() {
    await ready;
    return { dispose: () => events.push('disposed') };
  } };`);
  const removing = host.loader.unload("slow");
  release();
  await Promise.all([loading, removing]);
  assert.deepEqual(host.context.events, ["disposed"]);
  assert.equal(host.loader.status("slow"), null);
});

test("target reconciliation isolates a failed plugin/window and reinjects new renderers", async () => {
  const registry = new PluginTargetRegistry({ ownsEndpoint: async () => true });
  const hosts = { first: renderer(), second: renderer() };
  registry.discover = async () => Object.keys(hosts).map((id) => ({ id }));
  registry.evaluate = async (target, expression) => vm.runInContext(expression, hosts[target.id].context);
  const plugins = [
    { id: "bad", version: "1", expression: buildPluginExpression({ id: "bad", version: "1", source: "throw new Error('failed')" }) },
    { id: "good", version: "1", expression: buildPluginExpression({ id: "good", version: "1", source: "var CodexPlugin = { activate() { events.push('mounted'); } }" }) },
  ];
  const first = await registry.ensurePlugins(plugins);
  assert.equal(first.results.filter((result) => result.error).length, 2);
  assert.equal(hosts.second.loader.status("good").state, "active");
  await registry.ensurePlugins(plugins);
  assert.deepEqual(hosts.first.context.events, ["mounted"]);
  hosts.first = renderer();
  await registry.ensurePlugins(plugins);
  assert.deepEqual(hosts.first.context.events, ["mounted"]);
  await registry.removePlugins(["good"]);
  assert.equal(hosts.second.loader.status("good"), null);
});

test("rejects foreign endpoints and remote target sockets before connecting", async () => {
  const registry = new PluginTargetRegistry({ ownsEndpoint: async () => false });
  registry.discover = () => assert.fail("must not discover");
  await assert.rejects(registry.ensurePlugins([]), /not owned/);
  await assert.rejects(registry.evaluate({ webSocketDebuggerUrl: "ws://example.com:9341/devtools/page/1" }, "1"), /loopback/);
  await assert.rejects(registry.evaluate({ webSocketDebuggerUrl: "ws://127.0.0.1:9341/devtools/page/1" }, "1"), /not owned/);
});

test("local manifest rejects traversal, symlink escapes, duplicates and incompatible APIs", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "loader-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const config = join(root, "loader.json");
  await writeFile(join(root, "entry.js"), "var CodexPlugin = { activate() {} };");
  const plugin = { id: "hello", version: "1", entry: "entry.js" };
  const save = (plugins, apiVersion = 1) => writeFile(config, JSON.stringify({ apiVersion, plugins }));
  await save([plugin]);
  assert.equal((await readPlugins(config))[0].id, "hello");
  await save([plugin, plugin]);
  await assert.rejects(readPlugins(config), /duplicate/);
  await save([plugin], 2);
  await assert.rejects(readPlugins(config), /apiVersion/);
  await symlink(import.meta.filename, join(root, "escape.js"));
  await save([{ ...plugin, entry: "escape.js" }]);
  await assert.rejects(readPlugins(config), /inside/);
  await save([{ ...plugin, entry: "../missing.js" }]);
  await assert.rejects(readPlugins(config));
});


test("configuration ownership prevents takeover and scoped removal of another module", async () => {
  const host = renderer();
  await host.load("first"); await host.load("second");
  assert.equal(host.loader.claim("first", "config-a"), true);
  assert.equal(host.loader.claim("first", "config-b"), false);
  await assert.rejects(host.loader.release("first", "config-b"), /another Loader/);
  assert.equal(host.loader.status("first").state, "active");
  await host.loader.release("first", "config-a");
  assert.equal(host.loader.status("second").state, "active");
});

test("stalled activation is bounded and late resources are cleaned without unsafe replacement", async () => {
  const host = renderer();
  host.context.setTimeout = (callback, ms) => setTimeout(callback, Math.min(ms, 15));
  let release;
  host.context.ready = new Promise((resolve) => { release = resolve; });
  await assert.rejects(host.load("slow", "1", `var CodexPlugin = { async activate({ onDispose }) {
    await ready;
    onDispose(() => events.push('late-resource'));
    return { dispose: () => events.push('late-instance') };
  } };`), /activation failed/);
  assert.equal(host.loader.status("slow").state, "cleanup-failed");
  release(); await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(host.context.events, ["late-resource", "late-instance"]);
  await assert.rejects(host.load("slow", "2"), /renderer reload/);
  await host.load("other");
});

test("Loader upgrades only after the older runtime's plugins have been removed", async () => {
  const host = renderer();
  let active = true;
  host.context.window.__codexPluginLoader = { apiVersion: 1, version: "0.1.0", status: () => active ? [{ id: "old" }] : [] };
  await assert.rejects(host.load("new"), /unload its plugins/);
  active = false;
  await host.load("new");
  assert.equal(host.loader.version, LOADER_VERSION);
});
