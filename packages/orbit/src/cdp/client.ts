import type { MaybePromise } from "../sdk/contracts.js";
import type { Target, BindingCall } from "../protocol/types.js";
interface PendingCommand { resolve(value: unknown): void; reject(error: unknown): void; timer: ReturnType<typeof setTimeout>; method: string }
interface CdpMessage { id?: number; method?: string; result?: unknown; error?: { message?: string }; params?: BindingCall }
interface EvaluationResult { exceptionDetails?: { exception?: { description?: string }; text?: string }; result?: { value?: unknown } }

export class CdpClient {
  nextCommandId: number;
  pendingCommands: Map<number, PendingCommand>;
  bindingHandlers: Map<string, (params: BindingCall) => MaybePromise<unknown>>;
  generation: number;
  closed: boolean;
  worldContextId?: number;
  worldPending?: Promise<void> | null;
  static async connect(target: Target, { createSocket = (url: string) => new WebSocket(url) } = {}) {
    const socket = createSocket(target.webSocketDebuggerUrl);
    await new Promise<void>((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        socket.removeEventListener("open", onOpen);
        socket.removeEventListener("error", onError);
        socket.removeEventListener("close", onClose);
        if (error) { socket.close(); reject(error); } else resolve();
      };
      const onOpen = () => finish();
      const onError = () => finish(new Error(`CDP websocket open failed for target ${target.id}`));
      const onClose = () => finish(new Error(`CDP websocket closed before opening for target ${target.id}`));
      const timer = setTimeout(() => finish(new Error(`CDP websocket open timed out for target ${target.id}`)), 3000);
      socket.addEventListener("open", onOpen);
      socket.addEventListener("error", onError);
      socket.addEventListener("close", onClose);
    });
    return new CdpClient(target, socket);
  }

  constructor(readonly target: Target, readonly socket: WebSocket) {
    this.nextCommandId = 1;
    this.pendingCommands = new Map();
    this.bindingHandlers = new Map();
    this.generation = 0;
    this.closed = false;
    socket.addEventListener("message", (event) => this.#handleMessage(event.data));
    socket.addEventListener("close", () => this.#rejectPending(new Error(`CDP target ${target.id} disconnected`)));
    socket.addEventListener("error", () => this.#rejectPending(new Error(`CDP target ${target.id} failed`)));
  }

  get connected() {
    return !this.closed && this.socket.readyState === 1;
  }

  async command<T = unknown>(method: string, params: Record<string, unknown> = {}, timeoutMs = 15_000): Promise<T> {
    if (!this.connected) throw new Error(`CDP target ${this.target.id} is not connected`);
    const id = this.nextCommandId;
    this.nextCommandId += 1;
    return await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`${method} timed out for target ${this.target.id}`));
      }, timeoutMs);
      this.pendingCommands.set(id, { resolve, reject, timer, method });
      try { this.socket.send(JSON.stringify({ id, method, params })); }
      catch (error) { clearTimeout(timer); this.pendingCommands.delete(id); reject(error); }
    }) as T;
  }

  async useIsolatedWorld() {
    if (this.worldContextId !== undefined) return;
    this.worldPending ??= (async () => {
      const generation = this.generation;
      await this.command("Runtime.enable");
      const { frameTree } = await this.command<{ frameTree: { frame: { id: string } } }>("Page.getFrameTree");
      const { executionContextId } = await this.command<{ executionContextId: number }>("Page.createIsolatedWorld", {
        frameId: frameTree.frame.id, worldName: "codex-plugin-loader", grantUniveralAccess: false,
      });
      if (this.generation !== generation) throw new Error("Renderer changed during world creation");
      this.worldContextId = executionContextId;
    })().finally(() => { this.worldPending = null; });
    await this.worldPending;
  }

  async evaluate<T = unknown>(expression: string, executionContextId = this.worldContextId): Promise<T> {
    const params: Record<string, unknown> = { expression, awaitPromise: true, returnByValue: true };
    if (Number.isSafeInteger(executionContextId)) params.contextId = executionContextId;
    const response = await this.command<EvaluationResult>("Runtime.evaluate", params);
    if (response?.exceptionDetails) {
      const description = response.exceptionDetails.exception?.description ?? response.exceptionDetails.text;
      throw new Error(description ?? `Runtime.evaluate failed for target ${this.target.id}`);
    }
    return response?.result?.value as T;
  }

  async addBinding(name: string, handler: (params: BindingCall) => MaybePromise<unknown>) {
    await this.command("Runtime.enable");
    await this.command("Runtime.addBinding", { name, ...(this.worldContextId === undefined ? {} : { executionContextName: "codex-plugin-loader" }) });
    this.bindingHandlers.set(name, handler);
  }

  async removeBinding(name: string) {
    this.bindingHandlers.delete(name);
    if (this.connected) await this.command("Runtime.removeBinding", { name });
  }

  close() {
    this.closed = true;
    this.bindingHandlers.clear();
    this.#rejectPending(new Error(`CDP target ${this.target.id} closed`));
    this.socket.close();
  }

  #handleMessage(rawMessage: string) {
    let message: CdpMessage;
    try {
      message = JSON.parse(rawMessage);
    } catch {
      return;
    }
    if (!message || typeof message !== "object") return;
    if (message.id !== undefined) {
      const pending = this.pendingCommands.get(message.id);
      if (!pending) return;
      this.pendingCommands.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${pending.method} failed: ${message.error.message ?? "unknown CDP error"}`));
      else pending.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.executionContextsCleared" || (message.method === "Runtime.executionContextDestroyed" && message.params?.executionContextId === this.worldContextId)) {
      this.generation += 1;
      this.worldContextId = undefined;
    }
    if (message.method !== "Runtime.bindingCalled") return;
    const params = message.params;
    if (!params) return;
    const handler = this.bindingHandlers.get(params.name);
    if (!handler) return;
    Promise.resolve().then(() => handler(params)).catch(() => {});
  }

  #rejectPending(error: Error) {
    for (const { reject, timer } of this.pendingCommands.values()) {
      clearTimeout(timer);
      reject(error);
    }
    this.pendingCommands.clear();
  }
}
