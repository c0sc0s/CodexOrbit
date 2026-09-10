import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import { PluginHost } from "../../dist/host/plugin-host.js";
import { PluginTargetRegistry } from "../../dist/cdp/target-registry.js";
import { buildPluginExpression } from "../../dist/cdp/expressions.js";
import { readManifest, setPluginEnabled } from "../../dist/config/manifest.js";

async function fixture(t, factories) {
  const root = await mkdtemp(join(tmpdir(), "codex-host-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "loader.json");
  const events = [];
  await writeFile(path, JSON.stringify({ apiVersion: 1, plugins: Object.keys(factories).map((id) => ({ id, entry: `${id}.mjs`, version: "1" })) }));
  for (const id of Object.keys(factories)) await writeFile(join(root, `${id}.mjs`), "");
  const targets = [{ id: "window-a", webSocketDebuggerUrl: "ws://127.0.0.1:9341/a" }, { id: "window-b", webSocketDebuggerUrl: "ws://127.0.0.1:9341/b" }];
  const registry = new PluginTargetRegistry({ ownsEndpoint: async () => true });
  const clients = new Map();
  const newContext = () => vm.createContext({ window: {}, AbortController, setTimeout, clearTimeout });
  registry.connect = async (target) => {
    const client = {
      target, generation: 0, connected: true, context: newContext(), bindingHandlers: new Map(),
      async evaluate(expression) { return vm.runInContext(expression, this.context); },
      async addBinding(name, handler) { events.push(`bind:${target.id}:${name}`); this.bindingHandlers.set(name, handler); },
      async removeBinding(name) { this.bindingHandlers.delete(name); },
      close() { this.connected = false; },
    };
    clients.set(target.id, client);
    return client;
  };
  registry.discover = async () => targets;
  const host = new PluginHost({ registry, manifest: await readManifest(path), createModule: async (entry, context) => factories[entry.id](events)({ ...context, id: entry.id }) });
  t.after(() => host.close());
  return { host, registry, clients, events, path, newContext };
}

function factory(events) {
  return async ({ id, onDispose }) => {
    onDispose(() => events.push(`dispose:${id}`));
    return {
      renderer: () => ({ id, version: "1", expression: buildPluginExpression({ id, version: "1", source: "var CodexPlugin = { activate() { return { status: () => ({ active: true }) }; } };" }) }),
      bindings: [{ name: `__${id}`, handle: async () => {} }],
      onReady(client) { assert.ok(client.bindingHandlers.has(`__${id}`)); assert.ok(client.context.window.__codexPluginLoader.status(id)); events.push(`ready:${client.target.id}:${id}`); },
      onTargetRemoved(targetId) { events.push(`removed:${targetId}:${id}`); },
    };
  };
}

test("Loader owns bindings before injection and refreshes snapshots on reconnect/reload", async (t) => {
  const f = await fixture(t, { first: factory });
  await f.host.start();
  assert.ok((await f.host.sync()).every((item) => !item.error));
  assert.equal(f.registry.clients.size, 2, "per-target synchronization must not prune sibling windows");
  assert.ok(f.events.indexOf("bind:window-a:__first") < f.events.indexOf("ready:window-a:first"));
  await f.host.sync();
  assert.equal(f.events.filter((event) => event.startsWith("ready:")).length, 2);
  const first = f.clients.get("window-a");
  first.context = f.newContext(); first.generation += 1;
  await f.host.sync();
  assert.equal(f.events.filter((event) => event === "ready:window-a:first").length, 2);
  first.connected = false;
  await f.host.sync();
  assert.equal(f.events.filter((event) => event === "ready:window-a:first").length, 3);
});

test("disabling one host module cleans it while preserving other modules and connections", async (t) => {
  const f = await fixture(t, { first: factory, second: factory });
  await f.host.start(); await f.host.sync();
  const client = f.clients.get("window-a");
  await setPluginEnabled(f.path, "first", false);
  await f.host.sync();
  assert.equal(client.context.window.__codexPluginLoader.status("first"), null);
  assert.equal(client.context.window.__codexPluginLoader.status("second").state, "active");
  assert.equal(client.bindingHandlers.has("__first"), false);
  assert.equal(client.bindingHandlers.has("__second"), true);
  assert.equal(client.connected, true);
  assert.ok(f.events.includes("dispose:first"));
  assert.ok(!f.events.includes("dispose:second"));
  await setPluginEnabled(f.path, "first", true); await f.host.sync();
  assert.equal(client.context.window.__codexPluginLoader.status("first").state, "active");
});

test("partial host activation is cleaned and cannot block another module", async (t) => {
  const f = await fixture(t, { broken: (events) => async ({ onDispose }) => {
    onDispose(() => events.push("partial-cleanup")); throw new Error("private text");
  }, working: factory });
  await f.host.start(); const results = await f.host.sync();
  assert.ok(f.events.includes("partial-cleanup"));
  assert.ok(results.some((item) => item.pluginId === "broken" && item.stage === "host-activation"));
  assert.ok(results.some((item) => item.pluginId === "working" && !item.error));
  assert.ok(!JSON.stringify(results).includes("private text"));
});

test("a conflicting binding cannot replace or remove another module's handler", async (t) => {
  const f = await fixture(t, { first: factory, second: (events) => async (context) => {
    const module = await factory(events)(context);
    module.bindings[0].name = "__first";
    return module;
  } });
  await f.host.start(); const results = await f.host.sync();
  assert.ok(results.some((item) => item.pluginId === "second" && item.error));
  const firstHandler = f.clients.get("window-a").bindingHandlers.get("__first");
  await setPluginEnabled(f.path, "second", false); await f.host.sync();
  assert.equal(f.clients.get("window-a").bindingHandlers.get("__first"), firstHandler);
});

test("host shutdown drains pending messages before closing plugin resources", async (t) => {
  let release;
  const f = await fixture(t, { first: (events) => async (context) => {
    const module = await factory(events)(context);
    module.bindings[0].handle = () => new Promise((resolve) => { release = () => { events.push("message-done"); resolve(); }; });
    return module;
  } });
  await f.host.start(); await f.host.sync();
  const pending = f.clients.get("window-a").bindingHandlers.get("__first")({});
  await Promise.resolve();
  const closing = f.host.close();
  release(); await pending; await closing;
  assert.ok(f.events.indexOf("message-done") < f.events.indexOf("dispose:first"));
  assert.equal(f.registry.clients.size, 0);
});


test("a transient initial snapshot failure retries its window without disabling the module", async (t) => {
  let attempts = 0;
  const f = await fixture(t, { first: (events) => async (context) => {
    const module = await factory(events)(context);
    const ready = module.onReady;
    module.onReady = (client) => {
      if (client.target.id === "window-a" && attempts++ === 0) throw new Error("Window navigated");
      ready(client);
    };
    return module;
  } });
  await f.host.start();
  assert.ok((await f.host.sync()).some((item) => item.stage === "ready" && item.error));
  assert.equal(f.host.status()[0].state, "active");
  assert.ok((await f.host.sync()).every((item) => !item.error));
  assert.ok(f.events.includes("ready:window-a:first"));
});

test("failed module cleanup is quarantined without blocking healthy modules", async (t) => {
  const f = await fixture(t, { first: (events) => async (context) => {
    const module = await factory(events)(context);
    context.onDispose(() => { throw new Error("Cleanup failed"); });
    return module;
  }, second: factory });
  await f.host.start(); await f.host.sync();
  await setPluginEnabled(f.path, "first", false);
  const results = await f.host.sync();
  assert.equal(f.host.status().find(({ id }) => id === "first").state, "cleanup-failed");
  assert.ok(results.some((item) => item.pluginId === "second" && !item.error));
  await f.host.sync();
  assert.equal(f.clients.get("window-a").context.window.__codexPluginLoader.status("second").state, "active");
});


test("host modules receive separate persistent data directories", async (t) => {
  const directories = new Map();
  const capture = (events) => async (context) => {
    directories.set(context.id, context.stateDirectory);
    return factory(events)(context);
  };
  const f = await fixture(t, { first: capture, second: capture });
  await f.host.start();
  assert.notEqual(directories.get("first"), directories.get("second"));
  assert.ok(directories.get("first").endsWith("module-data/first"));
});
