export type MaybePromise<T> = T | Promise<T>;
export interface PluginEntry { id: string; version: string; entry: string; service?: string; enabled?: boolean; config?: Record<string, unknown> }
export interface ResourceContext {
  id: string; config: Record<string, unknown>; signal: AbortSignal;
  onDispose(dispose: () => MaybePromise<unknown>): void;
}
export interface RpcOptions { signal?: AbortSignal; timeoutMs?: number }
export interface RendererContext extends ResourceContext {
  rpc: { call<T = unknown>(method: string, payload?: unknown, options?: RpcOptions): Promise<T> };
  events: { subscribe(topic: string, handler: (payload: unknown) => MaybePromise<unknown>): () => void };
}
export interface RendererPlugin {
  dispose?(): MaybePromise<unknown>;
  isActive?(): boolean;
  status?(): unknown;
  handleMessage?(message: unknown): MaybePromise<unknown>;
}
export interface ServiceContext extends ResourceContext {
  stateDirectory: string;
  rpc: { handle(method: string, handler: (payload: unknown, request: { clientId: string; signal: AbortSignal }) => MaybePromise<unknown>): void };
  events: { publish(topic: string, payload: unknown, clientId?: string): void };
  clients: {
    onConnect(handler: (clientId: string) => MaybePromise<unknown>): () => void;
    onDisconnect(handler: (clientId: string) => MaybePromise<unknown>): () => void;
  };
}
