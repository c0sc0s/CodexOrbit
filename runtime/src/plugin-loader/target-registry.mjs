import { CdpClient } from "./cdp-client.mjs";
import { buildLoaderExpression, buildPluginRemovalExpression } from "./expressions.mjs";

export function isCodexRendererTarget(target) {
  return target?.type === "page" && typeof target.url === "string" && target.url.startsWith("app://-")
    && typeof target.webSocketDebuggerUrl === "string";
}

/** Owns reusable CDP connections and rejects unowned/non-loopback targets. */
export class PluginTargetRegistry {
  constructor({ port = 9341, ownsEndpoint, connect = CdpClient.connect, owner = null }) {
    if (!Number.isSafeInteger(port) || port < 1024 || port > 65535 || typeof ownsEndpoint !== "function") throw new Error("Invalid CDP endpoint configuration");
    this.port = port;
    this.owner = owner;
    this.ownsEndpoint = ownsEndpoint;
    this.connect = connect;
    this.clients = new Map();
  }

  async assertOwnership() {
    if (!(await this.ownsEndpoint())) {
      this.close();
      throw new Error(`CDP endpoint 127.0.0.1:${this.port} is not owned by Codex`);
    }
  }

  async discover() {
    await this.assertOwnership();
    const response = await fetch(`http://127.0.0.1:${this.port}/json/list`, {
      redirect: "error", signal: AbortSignal.timeout(800),
    });
    if (!response.ok) throw new Error(`CDP discovery failed: HTTP ${response.status}`);
    const targets = await response.json();
    if (!Array.isArray(targets)) throw new Error("Invalid CDP target list");
    return targets.filter(isCodexRendererTarget);
  }

  async client(target) {
    const url = new URL(target.webSocketDebuggerUrl);
    if (url.protocol !== "ws:" || url.hostname !== "127.0.0.1" || Number(url.port) !== this.port
      || url.username || url.password) throw new Error("CDP target must use the owned loopback endpoint");
    await this.assertOwnership();
    const previous = this.clients.get(target.id);
    if (previous?.connected && previous.target.webSocketDebuggerUrl === target.webSocketDebuggerUrl) { await previous.useIsolatedWorld?.(); return previous; }
    previous?.close();
    const client = await this.connect(target);
    this.clients.set(target.id, client);
    await client.useIsolatedWorld?.();
    return client;
  }

  async evaluate(target, expression) {
    return (await this.client(target)).evaluate(expression);
  }

  prune(targets) {
    const ids = new Set(targets.map(({ id }) => id));
    for (const [id, client] of this.clients) {
      if (!ids.has(id)) { client.close(); this.clients.delete(id); }
    }
  }

  close() {
    for (const client of this.clients.values()) client.close();
    this.clients.clear();
  }

  async claimPlugin(target, id) {
    await this.evaluate(target, `${buildLoaderExpression()}; true`);
    if (this.owner && !(await this.evaluate(target, `window.__codexPluginLoader.claim(${JSON.stringify(id)}, ${JSON.stringify(this.owner)})`))) throw new Error("Plugin owner conflict");
  }

  async ensurePlugins(plugins, targets) {
    await this.assertOwnership();
    targets ??= await this.discover();
    if (!targets.length) throw new Error("No Codex renderer found");
    const results = [];
    const injectedTargetIds = new Set();
    await Promise.all(targets.map(async (target) => {
      try { await this.evaluate(target, `${buildLoaderExpression()}; true`); }
      catch { results.push({ targetId: target.id, pluginId: null, stage: "bootstrap", error: "Loader bootstrap failed" }); return; }
      for (const plugin of plugins) {
        let stage = "inspect";
        try {
          if (this.owner && !(await this.evaluate(target, `window.__codexPluginLoader.claim(${JSON.stringify(plugin.id)}, ${JSON.stringify(this.owner)})`))) throw new Error("Plugin owner conflict");
          const state = await this.evaluate(target, `window.__codexPluginLoader.status(${JSON.stringify(plugin.id)})`);
          let injected = false;
          if (state?.state !== "active" || state.version !== plugin.version || (plugin.instanceId && state.instanceId !== plugin.instanceId)) {
            stage = "activate";
            await this.evaluate(target, plugin.expression);
            injectedTargetIds.add(target.id);
            injected = true;
          }
          stage = "status";
          const status = await this.evaluate(target, `window.__codexPluginLoader.inspect(${JSON.stringify(plugin.id)})`);
          results.push({ targetId: target.id, pluginId: plugin.id, status, injected });
        } catch {
          results.push({ targetId: target.id, pluginId: plugin.id, error: `Plugin ${stage} failed`, stage });
        }
      }
    }));
    return { targets, results, injectedTargetIds };
  }

  async removePlugins(ids) {
    const targets = await this.discover();
    const failures = [];
    await Promise.all(targets.map(async (target) => {
      for (const id of ids) {
        try { await this.evaluate(target, this.owner ? `window.__codexPluginLoader?.release ? window.__codexPluginLoader.release(${JSON.stringify(id)}, ${JSON.stringify(this.owner)}) : (${buildPluginRemovalExpression(id)})` : buildPluginRemovalExpression(id)); }
        catch { failures.push(`${target.id}/${id}`); }
      }
    }));
    if (failures.length) throw new Error(`Plugin removal failed: ${failures.join(", ")}`);
  }
}
