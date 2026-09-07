import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildPluginExpression } from "./expressions.mjs";
import { resolvePluginEntry } from "./manifest.mjs";
import { ServiceProcess } from "./service-process.mjs";

/** Adapts the business SDK to the host's private target lifecycle. */
export async function createServiceModule(entry, { root, stateDirectory, owner, onDispose }) {
  const source = await readFile(await resolvePluginEntry(root, entry.entry), "utf8");
  const clients = new Map();
  const binding = `__codexPlugin_${entry.id.replaceAll(/[^a-z0-9]/g, "_")}_${randomBytes(6).toString("hex")}`;
  const deliver = async (state, message) => {
    if (!state.client.connected || state.client.generation !== state.generation || clients.get(state.client.target.id) !== state) return;
    return state.client.evaluate(`window.__codexPluginLoader?.deliver(${JSON.stringify(entry.id)}, ${JSON.stringify({ ...message, token: state.token })})`, state.contextId);
  };
  const service = entry.service ? new ServiceProcess({
    entry: await resolvePluginEntry(root, entry.service), id: entry.id, config: entry.config ?? {}, stateDirectory,
    onEvent: (message) => Promise.allSettled([...clients.values()].filter((state) => message.clientId === undefined || state.token === message.clientId).map((state) => deliver(state, message))),
  }) : null;
  onDispose(() => service?.close());
  await service?.ready;
  const disconnect = async (id) => {
    const state = clients.get(id);
    if (!state) return;
    clients.delete(id);
    for (const request of state.pending.values()) request.abort();
    await service?.request("disconnect", { clientId: state.token }, { timeoutMs: 1000 }).catch(() => {});
  };
  return {
    cancelPending() { for (const state of clients.values()) for (const controller of state.pending.values()) controller.abort(); },
    tick() { if (service?.closed) throw new Error("Plugin service exited"); },
    async renderer(client) {
      if (service?.closed) throw new Error("Plugin service exited; restart the module");
      const status = await client.evaluate(`window.__codexPluginLoader?.status(${JSON.stringify(entry.id)})`);
      if (clients.has(client.target.id) && status?.state !== "active") await disconnect(client.target.id);
      let state = clients.get(client.target.id);
      if (!state) {
        state = { client, token: randomBytes(24).toString("hex"), generation: client.generation, contextId: client.worldContextId, pending: new Map() };
        clients.set(client.target.id, state);
      }
      return state.descriptor ??= { id: entry.id, version: entry.version, instanceId: state.token, expression: buildPluginExpression({
        ...entry, source, owner, endpoint: { binding, token: state.token },
      }) };
    },
    bindings: service ? [{ name: binding, async handle(client, params) {
      const state = clients.get(client.target.id);
      if (!state || state.client !== client || state.generation !== client.generation || typeof params.payload !== "string" || Buffer.byteLength(params.payload) > 65_536) return;
      let request;
      try { request = JSON.parse(params.payload); } catch { return; }
      if (request?.token !== state.token || !Number.isSafeInteger(request.id) || request.id < 1) return;
      if (state.contextId !== undefined && state.contextId !== params.executionContextId) return;
      state.contextId = params.executionContextId;
      if (request.type === "cancel") { state.pending.get(request.id)?.abort(); return; }
      if (request.type !== "call" || !Number.isFinite(request.timeoutMs) || request.timeoutMs < 1 || request.timeoutMs > 30_000 || typeof request.method !== "string" || request.method.length > 128 || state.pending.has(request.id)) return;
      if (state.pending.size >= 128) { await deliver(state, { type: "reply", id: request.id, error: "Too many pending RPC requests" }); return; }
      const controller = new AbortController();
      state.pending.set(request.id, controller);
      try {
        const value = await service.request("call", { method: request.method, payload: request.payload, clientId: state.token }, { signal: controller.signal, timeoutMs: request.timeoutMs });
        await deliver(state, { type: "reply", id: request.id, value });
      } catch { await deliver(state, { type: "reply", id: request.id, error: "Plugin service request failed" }); }
      finally { state.pending.delete(request.id); }
    } }] : [],
    onReady: (client) => service?.request("connect", { clientId: clients.get(client.target.id).token }),
    onTargetRemoved: disconnect,
    async dispose() { for (const id of [...clients.keys()]) await disconnect(id); },
  };
}
