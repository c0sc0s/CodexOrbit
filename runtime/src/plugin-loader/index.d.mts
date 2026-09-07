export type MaybePromise<T> = T | Promise<T>;
export interface PluginDescriptor { id: string; version: string; expression: string; instanceId?: string }
export interface PluginSource { id: string; version: string; source: string; apiVersion?: 1; config?: Record<string, unknown>; owner?: string | null }
export interface PluginEntry { id: string; version: string; entry: string; service?: string; enabled?: boolean; config?: Record<string, unknown> }
export interface LoaderManifest { path: string; root: string; plugins: PluginEntry[] }
export interface Target { id: string; type?: string; url?: string; webSocketDebuggerUrl: string }
export interface BindingCall { name: string; payload: string; executionContextId: number }
export interface ResourceContext {
  id: string; config: Record<string, unknown>; signal: AbortSignal;
  onDispose(dispose: () => MaybePromise<void>): void;
}
export interface RendererContext extends ResourceContext {
  rpc: { call<T = unknown>(method: string, payload?: unknown, options?: { signal?: AbortSignal; timeoutMs?: number }): Promise<T> };
  events: { subscribe(topic: string, handler: (payload: unknown) => MaybePromise<void>): () => void };
}
export interface RendererPlugin {
  dispose?(): MaybePromise<void>;
  isActive?(): boolean;
  status?(): unknown;
  handleMessage?(message: unknown): MaybePromise<unknown>;
}
export interface ServiceContext extends ResourceContext {
  stateDirectory: string;
  rpc: { handle(method: string, handler: (payload: unknown, request: { clientId: string; signal: AbortSignal }) => MaybePromise<unknown>): void };
  events: { publish(topic: string, payload: unknown, clientId?: string): void };
  clients: {
    onConnect(handler: (clientId: string) => MaybePromise<void>): () => void;
    onDisconnect(handler: (clientId: string) => MaybePromise<void>): () => void;
  };
}
export interface PluginResult { targetId?: string; pluginId: string | null; status?: unknown; injected?: boolean; stage?: string; error?: string }
export interface CleanupFailure { pluginId: string; stage: string }
export declare const LOADER_VERSION: string;
export declare function buildLoaderExpression(): string;
export declare function buildPluginExpression(plugin: PluginSource): string;
export declare function buildPluginMessageExpression(id: string, message: unknown): string;
export declare function buildPluginRemovalExpression(id: string): string;
export declare function isCodexRendererTarget(target: unknown): boolean;
export declare function findCodexApp(): { appPath: string; executable: string } | null;
export declare class CdpClient {
  static connect(target: Target, options?: { createSocket?: (url: string) => WebSocket }): Promise<CdpClient>;
  constructor(target: Target, socket: WebSocket);
  readonly target: Target;
  readonly connected: boolean;
  readonly generation: number;
  command(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
  evaluate(expression: string, executionContextId?: number): Promise<unknown>;
  addBinding(name: string, handler: (params: BindingCall) => MaybePromise<unknown>): Promise<void>;
  removeBinding(name: string): Promise<void>;
  close(): void;
}
export declare class PluginTargetRegistry {
  constructor(options: { port?: number; owner?: string | null; ownsEndpoint(): Promise<boolean>; connect?: (target: Target) => Promise<CdpClient> });
  readonly owner: string | null;
  discover(): Promise<Target[]>;
  client(target: Target): Promise<CdpClient>;
  evaluate(target: Target, expression: string): Promise<unknown>;
  prune(targets: Target[]): void;
  ensurePlugins(plugins: PluginDescriptor[], targets?: Target[]): Promise<{ targets: Target[]; results: PluginResult[]; injectedTargetIds: Set<string> }>;
  removePlugins(ids: string[]): Promise<void>;
  close(): void;
}
export declare class PluginHost {
  constructor(options: { registry: PluginTargetRegistry; manifest: LoaderManifest });
  start(): Promise<void>;
  sync(): Promise<PluginResult[]>;
  status(): { id: string; state: "active" | "failed" | "cleanup-failed" }[];
  close(): Promise<CleanupFailure[]>;
}
export declare class CodexProcess {
  constructor(options?: { port?: number; appPath?: string; executable?: string });
  isRunning(): Promise<boolean>;
  hasCdpLaunchArguments(): Promise<boolean>;
  ownsCdpEndpoint(): Promise<boolean>;
  portIsListening(): Promise<boolean>;
  cdpIsReady(discover: () => Promise<Target[]>): Promise<boolean>;
  waitForCdp(discover: () => Promise<Target[]>, timeoutMs?: number): Promise<void>;
  launchWithCdp(discover: () => Promise<Target[]>): Promise<void>;
}
export declare function createLauncher(options: { launcherPath: string; nodePath: string; cliPath: string; configPath: string; port?: number; logPath: string; iconPath?: string; bundleId?: string }): Promise<string>;
