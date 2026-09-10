import type { MaybePromise, RpcOptions } from "../sdk/contracts.js";
import type { PluginEndpoint } from "../protocol/types.js";
import type { ResourceScope } from "../lifecycle/resource-scope.js";
type Reply = { type: "reply"; token?: string; id: number; error?: string; value?: unknown };
type EventMessage = { type: "event"; token?: string; topic: string; payload?: unknown };
export type TransportMessage = Reply | EventMessage;
// Serialized with the Loader; no module-scope dependencies are available in the renderer.
export function createRendererTransport(endpoint: PluginEndpoint, scope: ResourceScope) {
  const pending = new Map<number, { finish(error?: unknown, value?: unknown): void; cancel(reason: string): void }>();
  const subscribers = new Map<string, Set<(payload: unknown) => MaybePromise<unknown>>>();
  let sequence = 0;
  const send = (message: Record<string, unknown>) => {
    const encoded = JSON.stringify({ ...message, token: endpoint.token });
    if (new TextEncoder().encode(encoded).byteLength > 65_536) throw new Error("RPC request exceeds 64 KiB");
    const binding = (window as unknown as Record<string, unknown>)[endpoint.binding ?? ""];
    if (typeof binding !== "function") throw new Error("Plugin service is unavailable");
    binding(encoded);
  };
  const transport = {
    rpc: Object.freeze({ call<T = unknown>(method: string, payload: unknown = null, options: RpcOptions = {}): Promise<T> {
      if (scope.signal.aborted || options.signal?.aborted) return Promise.reject(new Error("RPC cancelled"));
      if (typeof method !== "string" || !method || method.length > 128) return Promise.reject(new Error("Invalid RPC method"));
      if (pending.size >= 128) return Promise.reject(new Error("Too many pending RPC requests"));
      const timeoutMs = options.timeoutMs ?? 10_000;
      if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) return Promise.reject(new Error("RPC timeout must be between 1 and 30000 ms"));
      const id = ++sequence;
      return new Promise<unknown>((resolve, reject) => {
        const finish = (error?: unknown, value?: unknown) => {
          if (!pending.delete(id)) return;
          clearTimeout(timer);
          options.signal?.removeEventListener("abort", abort);
          error ? reject(error) : resolve(value);
        };
        const cancel = (reason: string) => {
          try { send({ type: "cancel", id }); } catch {}
          finish(new Error(reason));
        };
        const abort = () => cancel("RPC cancelled");
        const timer = setTimeout(() => cancel("RPC timed out"), timeoutMs);
        pending.set(id, { finish, cancel });
        options.signal?.addEventListener("abort", abort, { once: true });
        try { send({ type: "call", id, method, payload, timeoutMs }); } catch (error) { finish(error); }
      }) as Promise<T>;
    } }),
    events: Object.freeze({ subscribe(topic: string, handler: (payload: unknown) => MaybePromise<unknown>) {
      if (scope.signal.aborted) throw new Error("Plugin is closing");
      if (typeof topic !== "string" || !topic || typeof handler !== "function") throw new Error("Invalid event subscription");
      const handlers = subscribers.get(topic) ?? new Set();
      subscribers.set(topic, handlers);
      handlers.add(handler);
      return () => { handlers.delete(handler); if (!handlers.size) subscribers.delete(topic); };
    } }),
    deliver(message: TransportMessage) {
      if (scope.signal.aborted || message?.token !== endpoint.token) return false;
      if (message.type === "reply") {
        const request = pending.get(message.id);
        request?.finish(message.error ? new Error(message.error) : null, message.value);
        return Boolean(request);
      }
      if (message.type === "event") {
        for (const handler of subscribers.get(message.topic) ?? []) Promise.resolve().then(() => { if (!scope.signal.aborted) return handler(message.payload); }).catch(() => {});
        return true;
      }
      return false;
    },
  };
  scope.onDispose(() => {
    for (const request of [...pending.values()]) request.cancel("Plugin unloaded");
    subscribers.clear();
  });
  return transport;
}
