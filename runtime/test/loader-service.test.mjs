import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { ServiceProcess } from "../src/plugin-loader/service-process.mjs";
import { PluginHost } from "../src/plugin-loader/host.mjs";
import { PluginTargetRegistry } from "../src/plugin-loader/target-registry.mjs";
import { readManifest, setPluginEnabled } from "../src/plugin-loader/manifest.mjs";

async function directory(t) {
  const root = await mkdtemp(join(tmpdir(), "loader-service-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function service(t, source, options = {}) {
  const root = await directory(t);
  const entry = join(root, "service.mjs");
  await writeFile(entry, source);
  const child = new ServiceProcess({ entry, id: "test", stateDirectory: root, timeoutMs: 1000, shutdownMs: 100, ...options });
  t.after(() => child.close());
  await child.ready;
  return child;
}
async function until(predicate) {
  for (let i = 0; i < 100; i++) { if (await predicate()) return; await delay(10); }
  assert.fail("condition did not become true");
}

test("service crashes reject in-flight RPC without stopping another plugin", async (t) => {
  const source = `export function activate({id, rpc}) {
    rpc.handle('identity', () => id);
    rpc.handle('crash', () => process.exit(12));
  }`;
  const broken = await service(t, source);
  const healthy = await service(t, source);
  assert.equal(await healthy.request("call", { method: "identity" }), "test");
  await assert.rejects(broken.request("call", { method: "crash" }), /unavailable/);
  assert.equal(await healthy.request("call", { method: "identity" }), "test");
});

test("cancellation reaches the handler and timed-out requests release the parent queue", async (t) => {
  const child = await service(t, `export function activate({rpc}) {
    let cancelled = 0;
    rpc.handle('wait', (_, {signal}) => new Promise(resolve => signal.addEventListener('abort', () => { cancelled++; resolve(); }, {once:true})));
    rpc.handle('count', () => cancelled);
  }`);
  const abort = new AbortController();
  const request = child.request("call", { method: "wait" }, { signal: abort.signal });
  abort.abort();
  await assert.rejects(request, /cancelled/);
  await assert.rejects(child.request("call", { method: "wait" }, { timeoutMs: 20 }), /timed out/);
  await until(async () => (await child.request("call", { method: "count" })) === 2);
  assert.equal(child.pending.size, 0);
});

test("a CPU-blocked service can be terminated within the shutdown deadline", async (t) => {
  const child = await service(t, `export function activate({rpc}) { rpc.handle('block', () => { while(true) {} }); }`);
  await assert.rejects(child.request("call", { method: "block" }, { timeoutMs: 30 }), /timed out/);
  const start = Date.now();
  await child.close();
  assert.ok(Date.now() - start < 1500);
  assert.equal(child.child.signalCode, "SIGKILL");
});

test("oversized requests never enter the IPC queue", async (t) => {
  const child = await service(t, `export function activate({rpc}) { rpc.handle('echo', value => value); }`);
  await assert.rejects(child.request("call", { method: "echo", payload: "x".repeat(1024 * 1024) }), /exceeds/);
  assert.equal(child.pending.size, 0);
  assert.equal(await child.request("call", { method: "echo", payload: "ok" }), "ok");
});

async function platform(t) {
  const root = await directory(t);
  await writeFile(join(root, "service.mjs"), `export function activate({rpc, events, clients}) {
    rpc.handle('identity', (_, {clientId}) => clientId);
    rpc.handle('echo', value => value);
    rpc.handle('slow', value => new Promise(resolve => setTimeout(() => resolve(value), 60)));
    clients.onConnect(id => events.publish('ready', id, id));
  }`);
  await writeFile(join(root, "renderer.js"), `var CodexPlugin = { async activate(context) {
    const record = { context, identity: await context.rpc.call('identity'), ready: null };
    context.events.subscribe('ready', id => { record.ready = id; });
    window.instances ??= {}; window.instances[context.id] = record;
    context.onDispose(() => { delete window.instances[context.id]; });
    return { status: () => ({ identity: record.identity, ready: record.ready }) };
  }};`);
  const path = join(root, "loader.json");
  await writeFile(path, JSON.stringify({ apiVersion: 1, plugins: ["one", "two"].map(id => ({ id, version: "1", entry: "renderer.js", service: "service.mjs" })) }));
  const targets = ["a", "b"].map(id => ({ id, webSocketDebuggerUrl: `ws://127.0.0.1:9341/${id}` }));
  const newWorld = () => vm.createContext({ window: {}, AbortController, TextEncoder, setTimeout, clearTimeout });
  const registry = new PluginTargetRegistry({ ownsEndpoint: async () => true, connect: async (target) => ({
    target, generation: 0, connected: true, context: newWorld(), bindingHandlers: new Map(),
    evaluate(expression) { return vm.runInContext(expression, this.context); },
    async addBinding(name, handler) {
      this.bindingHandlers.set(name, handler);
      this.context.window[name] = payload => { void handler({ payload, executionContextId: this.generation + 1 }); };
    },
    async removeBinding(name) { this.bindingHandlers.delete(name); delete this.context.window[name]; },
    close() { this.connected = false; },
  }) });
  registry.discover = async () => targets;
  const host = new PluginHost({ registry, manifest: await readManifest(path) });
  t.after(() => host.close());
  await host.start();
  assert.ok((await host.sync()).every(result => !result.error));
  return { host, registry, path, newWorld };
}

test("two services route RPC/events per window and scoped removal preserves peers", async (t) => {
  const { host, registry, path } = await platform(t);
  const a = registry.clients.get("a").context.window;
  const b = registry.clients.get("b").context.window;
  await until(() => a.instances.one.ready && b.instances.two.ready);
  const identities = [a.instances.one.identity, b.instances.one.identity, a.instances.two.identity, b.instances.two.identity];
  assert.equal(new Set(identities).size, 4);
  assert.equal(a.instances.one.ready, identities[0]);
  assert.equal(b.instances.two.ready, identities[3]);
  assert.equal(await a.instances.one.context.rpc.call("echo", "你好"), "你好");
  await assert.rejects(a.instances.one.context.rpc.call("echo", "界".repeat(30_000)), /exceeds/);
  await assert.rejects(a.instances.one.context.rpc.call("unknown"), /failed/);
  await setPluginEnabled(path, "one", false);
  assert.ok((await host.sync()).every(result => !result.error));
  assert.equal(a.instances.one, undefined);
  assert.equal(b.instances.one, undefined);
  assert.equal(await a.instances.two.context.rpc.call("echo", 42), 42);
});

test("renderer replacement rejects old requests and never delivers stale replies into the new instance", async (t) => {
  const { host, registry } = await platform(t);
  const client = registry.clients.get("a");
  const loader = client.context.window.__codexPluginLoader;
  const old = client.context.window.instances.one;
  const pending = assert.rejects(old.context.rpc.call("slow", "stale"), /unloaded/);
  await loader.unload("one");
  await pending;
  assert.ok((await host.sync()).every(result => !result.error));
  const fresh = client.context.window.instances.one;
  assert.notEqual(fresh.identity, old.identity);
  assert.equal(await fresh.context.rpc.call("echo", "fresh"), "fresh");
  await delay(80);
  assert.equal(await fresh.context.rpc.call("echo", "still fresh"), "still fresh");
});

test("document reload reconnects services using a fresh client identity", async (t) => {
  const { host, registry, newWorld } = await platform(t);
  const client = registry.clients.get("a");
  const before = client.context.window.instances.one.identity;
  client.context = newWorld(); client.generation++;
  assert.ok((await host.sync()).every(result => !result.error));
  await until(() => client.context.window.instances.one.ready);
  assert.notEqual(client.context.window.instances.one.identity, before);
  assert.equal(await client.context.window.instances.two.context.rpc.call("echo", "reloaded"), "reloaded");
});

test("oversized replies fail explicitly and the service remains usable", async (t) => {
  const child = await service(t, `export function activate({rpc}) { rpc.handle('large', () => 'x'.repeat(1024 * 1024)); rpc.handle('ok', () => true); }`);
  await assert.rejects(child.request("call", { method: "large" }), /oversized/);
  assert.equal(await child.request("call", { method: "ok" }), true);
});

test("removing a module with an in-flight call completes without quarantining peers", async (t) => {
  const { host, registry, path } = await platform(t);
  const context = registry.clients.get("a").context.window.instances.one.context;
  const request = assert.rejects(context.rpc.call("slow", "pending"));
  await setPluginEnabled(path, "one", false);
  await host.sync();
  await request;
  assert.deepEqual(host.status(), [{ id: "two", state: "active" }]);
});

test("a replacement daemon replaces surviving renderer endpoints even at the same plugin version", async (t) => {
  const { host, registry, path } = await platform(t);
  const before = registry.clients.get("a").context.window.instances.one;
  // Closing service scopes leaves renderer state behind, as an abrupt daemon exit would.
  for (const record of host.modules) await record.scope.close();
  const replacement = new PluginHost({ registry, manifest: await readManifest(path) });
  t.after(() => replacement.close());
  await replacement.start();
  assert.ok((await replacement.sync()).every(result => !result.error));
  const current = registry.clients.get("a").context.window.instances.one;
  assert.notEqual(current.identity, before.identity);
  assert.equal(before.context.signal.aborted, true);
  assert.equal(await current.context.rpc.call("echo", "reconnected"), "reconnected");
});
