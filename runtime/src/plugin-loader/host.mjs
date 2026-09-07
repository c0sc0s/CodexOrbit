import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createServiceModule } from "./service-module.mjs";
import { createResourceScope } from "./lifecycle.mjs";
import { readManifest } from "./manifest.mjs";

/** Runs configured host modules and their renderer plugins without product-specific branches. */
export class PluginHost {
  constructor({ registry, manifest, createModule = createServiceModule }) {
    this.registry = registry;
    this.manifest = manifest;
    this.createModule = createModule;
    this.modules = [];
    this.syncing = null;
    this.closing = null;
  }

  async start() {
    if (this.modules.length || this.closing) throw new Error("Plugin host has already started");
    for (const entry of this.manifest.plugins.filter((item) => item.enabled !== false)) await this.add(entry);
  }

  async add(entry) {
    const scope = createResourceScope();
    const record = { id: entry.id, scope, module: null, clients: new Map(), pending: new Set(), error: null, signature: JSON.stringify(entry) };
    this.modules.push(record);
    try {
      const stateDirectory = join(this.manifest.root, "module-data", entry.id);
      await mkdir(stateDirectory, { recursive: true, mode: 0o700 });
      const activation = this.createModule(entry, { root: this.manifest.root, stateDirectory, owner: this.registry.owner, onDispose: scope.onDispose })
        .then((module) => { if (typeof module?.dispose === "function") scope.onDispose(() => module.dispose()); return module; });
      record.module = await scope.bounded(() => activation, "Service activation");
      if (typeof record.module?.renderer !== "function") throw new Error("Expected renderer descriptor provider");
      for (const binding of record.module.bindings ?? []) {
        if (typeof binding.name !== "string" || !/^__[A-Za-z][A-Za-z0-9_]*$/.test(binding.name) || typeof binding.handle !== "function") throw new Error("Invalid module binding");
      }
    } catch {
      record.error = "host-activation";
      try { await scope.close(); } catch { record.error = "host-cleanup"; }
      record.module = null;
    }
  }

  sync() {
    if (this.closing) return Promise.reject(new Error("Plugin host is closing"));
    this.syncing ??= this.synchronize().finally(() => { this.syncing = null; });
    return this.syncing;
  }

  async synchronize() {
    const latest = await readManifest(this.manifest.path);
    const entries = latest.plugins.filter((item) => item.enabled !== false);
    for (const record of [...this.modules]) {
      if (!record.retiring && !entries.some((entry) => entry.id === record.id && JSON.stringify(entry) === record.signature)) {
        const failures = await this.removeRecord(record);
        if (failures.length) { record.retiring = true; record.error = "module-cleanup"; record.module = null; continue; }
        this.modules = this.modules.filter((item) => item !== record);
      }
    }
    for (const entry of entries) if (!this.modules.some((record) => record.id === entry.id)) await this.add(entry);
    const targets = await this.registry.discover();
    this.registry.prune(targets);
    if (!targets.length) throw new Error("No Codex renderer found");
    const targetIds = new Set(targets.map(({ id }) => id));
    const results = [];
    for (const record of this.modules) {
      if (!record.module || record.scope.signal.aborted) { results.push({ pluginId: record.id, stage: record.error, error: "Host module unavailable" }); continue; }
      for (const [id] of record.clients) {
        if (!targetIds.has(id)) {
          record.clients.delete(id);
          try { await record.scope.bounded(() => record.module.onTargetRemoved?.(id), "Target cleanup"); } catch { record.error = "target-cleanup"; }
        }
      }
      try {
        await record.scope.bounded(() => record.module.tick?.(), "Host tick");
        for (const target of targets) {
          if (record.scope.signal.aborted) break;
          let stage = "connect";
          try {
            await this.registry.claimPlugin(target, record.id);
            const client = await this.registry.client(target);
            const previous = record.clients.get(target.id);
            const changed = !previous?.bound || previous.client !== client || previous.generation !== client.generation;
            if (changed) {
              await record.scope.bounded(() => record.module.onTargetRemoved?.(target.id), "Target cleanup");
              if (previous?.client === client) for (const name of previous.bindings) await client.removeBinding(name);
              const state = { client, generation: client.generation, ready: false, bound: false, bindings: [] };
              record.clients.set(target.id, state);
              for (const binding of record.module.bindings ?? []) {
                if (client.bindingHandlers.has(binding.name)) throw new Error("Duplicate module binding");
                await client.addBinding(binding.name, (params) => {
                  if (record.scope.signal.aborted) return;
                  const pending = Promise.resolve().then(() => binding.handle(client, params));
                  record.pending.add(pending);
                  return pending.catch(() => { record.error = "binding"; }).finally(() => record.pending.delete(pending));
                });
                state.bindings.push(binding.name);
              }
              state.bound = true;
            }
            stage = "renderer";
            const descriptor = await record.scope.bounded(() => record.module.renderer(client), "Renderer descriptor");
            if (descriptor?.id !== record.id || typeof descriptor.version !== "string" || typeof descriptor.expression !== "string") throw new Error("Invalid module renderer descriptor");
            const result = await this.registry.ensurePlugins([descriptor], [target]);
            results.push(...result.results);
            if (result.results.some((item) => item.error)) continue;
            const state = record.clients.get(target.id);
            if (!state.ready || result.injectedTargetIds.has(target.id)) {
              stage = "ready";
              await record.scope.bounded(() => record.module.onReady?.(client), "Module ready");
              state.ready = true;
            }
          } catch (error) {
            if (error?.message === "Module ready timed out" || error?.message === "Target cleanup timed out") { record.scope.abort(); record.error = stage; }
            results.push({ targetId: target.id, pluginId: record.id, stage, error: `Module ${stage} failed` });
          }
        }
      } catch {
        record.scope.abort(); record.error = "host-tick";
        results.push({ pluginId: record.id, stage: "host-tick", error: "Host module synchronization failed" });
      }
    }
    if (!this.modules.length && targets.length) await this.registry.ensurePlugins([], targets);
    return results;
  }

  async removeRecord(record) {
    record.scope.abort();
    const failures = [];
    try { record.module?.cancelPending?.(); } catch { failures.push({ pluginId: record.id, stage: "request-cancellation" }); }
    try { await this.registry.removePlugins([record.id]); } catch { failures.push({ pluginId: record.id, stage: "renderer-cleanup" }); }
    for (const { client, bindings } of record.clients.values()) {
      for (const name of bindings) {
        try { await client.removeBinding(name); } catch { failures.push({ pluginId: record.id, stage: "binding-cleanup" }); }
      }
    }
    record.clients.clear();
    try { await record.scope.bounded(() => Promise.allSettled([...record.pending]), "Pending messages"); }
    catch { failures.push({ pluginId: record.id, stage: "pending-messages" }); }
    try { await record.scope.close(); } catch { failures.push({ pluginId: record.id, stage: "host-cleanup" }); }
    return failures;
  }

  status() {
    return this.modules.map((record) => ({ id: record.id,
      state: record.retiring ? "cleanup-failed" : record.module && !record.scope.signal.aborted ? "active" : "failed",
    }));
  }

  close() {
    if (this.closing) return this.closing;
    for (const record of this.modules) record.scope.abort();
    this.closing = (async () => {
      await this.syncing?.catch(() => {});
      const failures = [];
      for (const record of [...this.modules].reverse()) failures.push(...await this.removeRecord(record));
      this.registry.close();
      return failures;
    })();
    return this.closing;
  }
}
