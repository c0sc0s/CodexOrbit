import type { RendererContext, RendererPlugin, MaybePromise } from "../sdk/contracts.js";
import type { PluginEndpoint, PluginSummary } from "../protocol/types.js";
import type { createResourceScope as scopeFactory, ResourceScope } from "../lifecycle/resource-scope.js";
import type { createRendererTransport as transportFactory, TransportMessage } from "./transport.js";
interface RendererManifest { apiVersion: number; id: string; version: string; instanceId?: string; owner?: string | null; endpoint?: PluginEndpoint }
interface PluginRecord { id: string; version: string; instanceId?: string; state: string; scope: ResourceScope; instance: RendererPlugin | void | null; transport?: ReturnType<typeof transportFactory> }
interface RendererLoader {
  apiVersion: number; version: string;
  claim(id: string, owner: string): boolean;
  release(id: string, owner: string): Promise<boolean>;
  status(id?: string): PluginSummary[] | PluginSummary | null;
  load(manifest: RendererManifest, activate: (context: RendererContext) => MaybePromise<RendererPlugin | void>, config?: Record<string, unknown>): Promise<PluginSummary | null>;
  unload(id: string): Promise<boolean>;
  deliver(id: string, message: TransportMessage): boolean;
  dispatch(id: string, message: unknown): MaybePromise<unknown>;
  inspect(id: string): unknown;
}
declare global { interface Window { __codexPluginLoader?: RendererLoader } }
// This function is serialized into the renderer; keep it independent of module scope.
export function installLoader(createResourceScope: typeof scopeFactory, version: string, createRendererTransport: typeof transportFactory): RendererLoader {
  const existing = window.__codexPluginLoader;
  if (existing) {
    if (existing.apiVersion === 1 && existing.version === version) return existing;
    if (existing.apiVersion !== 1 || (existing.status() as PluginSummary[]).length) throw new Error("Incompatible Codex Plugin Loader is active; unload its plugins before upgrading");
  }
  const plugins = new Map<string, PluginRecord>();
  const owners = new Map<string, string>();
  const queues = new Map<string, Promise<unknown>>();
  const serialize = <T>(id: string, operation: () => MaybePromise<T>): Promise<T> => {
    const next = (queues.get(id) ?? Promise.resolve()).catch(() => {}).then(operation);
    queues.set(id, next);
    next.finally(() => { if (queues.get(id) === next) queues.delete(id); }).catch(() => {});
    return next;
  };
  const isActive = (record: PluginRecord) => {
    try { return record.instance?.isActive?.() !== false; }
    catch { return false; }
  };
  const summary = (record?: PluginRecord): PluginSummary | null => record ? {
    id: record.id, version: record.version,
    ...(record.instanceId ? { instanceId: record.instanceId } : {}),
    state: record.state === "active" && !isActive(record) ? "inactive" : record.state,
  } : null;
  const clean = async (record: PluginRecord) => {
    record.state = "unloading";
    try { await record.scope.close(); }
    catch { record.state = "cleanup-failed"; throw new Error(`Plugin ${record.id} cleanup failed`); }
  };
  const loader: RendererLoader = {
    apiVersion: 1,
    version,
    claim(id, owner) {
      if (owners.has(id) && owners.get(id) !== owner) return false;
      owners.set(id, owner);
      return true;
    },
    async release(id, owner) {
      if (owners.has(id) && owners.get(id) !== owner) throw new Error("Plugin belongs to another Loader configuration");
      const result = await loader.unload(id);
      owners.delete(id);
      return result;
    },
    status: (id) => id === undefined ? [...plugins.values()].map(record => summary(record)!) : summary(plugins.get(id)),
    load: (manifest, activate, config = {}) => {
      if (!manifest || manifest.apiVersion !== 1 || typeof manifest.id !== "string" || !/^[a-z][a-z0-9.-]{0,63}$/.test(manifest.id)
        || typeof manifest.version !== "string" || !manifest.version || typeof activate !== "function") {
        return Promise.reject(new Error("Invalid plugin contract"));
      }
      return serialize(manifest.id, async () => {
        if (manifest.owner && owners.get(manifest.id) !== manifest.owner) throw new Error("Plugin ownership changed");
        const previous = plugins.get(manifest.id);
        if (summary(previous)?.state === "active" && previous?.version === manifest.version && previous.instanceId === manifest.instanceId) return summary(previous);
        if (previous?.state === "cleanup-failed") throw new Error(`Plugin ${manifest.id} requires a renderer reload after failed cleanup`);
        if (previous) { await clean(previous); plugins.delete(manifest.id); }
        const record: PluginRecord = { id: manifest.id, version: manifest.version, instanceId: manifest.instanceId, state: "loading", scope: createResourceScope(), instance: null };
        plugins.set(manifest.id, record);
        record.transport = createRendererTransport(manifest.endpoint ?? { binding: null, token: null }, record.scope);
        try {
          const activation = Promise.resolve().then(() => activate(Object.freeze({
            id: manifest.id, config, signal: record.scope.signal, onDispose: record.scope.onDispose,
            rpc: record.transport!.rpc, events: record.transport!.events,
          }))).then((instance) => {
            if (typeof instance?.dispose === "function") record.scope.onDispose(() => instance.dispose?.());
            return instance;
          });
          record.instance = await record.scope.bounded(() => activation, "Activation");
          if (record.scope.signal.aborted) throw new Error("Activation cancelled");
          record.state = "active";
          return summary(record);
        } catch (error) {
          await clean(record);
          record.state = error instanceof Error && error.message === "Activation timed out" ? "cleanup-failed" : "failed";
          throw new Error(`Plugin ${manifest.id} activation failed`);
        }
      });
    },
    unload: (id) => {
      plugins.get(id)?.scope.abort();
      return serialize(id, async () => {
      const record = plugins.get(id);
      if (!record) return false;
      if (record.state === "cleanup-failed") throw new Error(`Plugin ${id} requires a renderer reload after failed cleanup`);
      await clean(record);
      plugins.delete(id);
      return true;
      });
    },
    deliver: (id, message) => plugins.get(id)?.transport?.deliver(message) ?? false,
    dispatch: (id, message) => {
      const record = plugins.get(id);
      if (summary(record)?.state !== "active") return false;
      return record?.instance?.handleMessage?.(message) ?? false;
    },
    inspect: (id) => {
      const record = plugins.get(id);
      return record?.state === "active" ? record.instance?.status?.() ?? summary(record) : summary(record);
    },
  };
  window.__codexPluginLoader = Object.freeze(loader);
  return loader;
}
