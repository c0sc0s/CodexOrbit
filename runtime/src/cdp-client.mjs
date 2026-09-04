export class CdpClient {
  static async connect(target) {
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error(`CDP websocket open timed out for target ${target.id}`));
      }, 3000);
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new Error(`CDP websocket open failed for target ${target.id}`));
      }, { once: true });
    });
    return new CdpClient(target, socket);
  }

  constructor(target, socket) {
    this.target = target;
    this.socket = socket;
    this.nextCommandId = 1;
    this.pendingCommands = new Map();
    this.bindingHandlers = new Map();
    socket.addEventListener("message", (event) => this.#handleMessage(event.data));
    socket.addEventListener("close", () => this.#rejectPending(new Error(`CDP target ${target.id} disconnected`)));
    socket.addEventListener("error", () => this.#rejectPending(new Error(`CDP target ${target.id} failed`)));
  }

  get connected() {
    return this.socket.readyState === WebSocket.OPEN;
  }

  async command(method, params = {}, timeoutMs = 15_000) {
    if (!this.connected) throw new Error(`CDP target ${this.target.id} is not connected`);
    const id = this.nextCommandId;
    this.nextCommandId += 1;
    return await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingCommands.delete(id);
        reject(new Error(`${method} timed out for target ${this.target.id}`));
      }, timeoutMs);
      this.pendingCommands.set(id, { resolve, reject, timer, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, executionContextId) {
    const params = { expression, awaitPromise: true, returnByValue: true };
    if (Number.isSafeInteger(executionContextId)) params.contextId = executionContextId;
    const response = await this.command("Runtime.evaluate", params);
    if (response?.exceptionDetails) {
      const description = response.exceptionDetails.exception?.description ?? response.exceptionDetails.text;
      throw new Error(description ?? `Runtime.evaluate failed for target ${this.target.id}`);
    }
    return response?.result?.value;
  }

  async addBinding(name, handler) {
    this.bindingHandlers.set(name, handler);
    await this.command("Runtime.enable");
    await this.command("Runtime.addBinding", { name });
  }

  close() {
    this.socket.close();
  }

  #handleMessage(rawMessage) {
    let message;
    try {
      message = JSON.parse(rawMessage);
    } catch {
      return;
    }
    if (message.id !== undefined) {
      const pending = this.pendingCommands.get(message.id);
      if (!pending) return;
      this.pendingCommands.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(`${pending.method} failed: ${message.error.message ?? "unknown CDP error"}`));
      else pending.resolve(message.result);
      return;
    }
    if (message.method !== "Runtime.bindingCalled") return;
    const handler = this.bindingHandlers.get(message.params?.name);
    if (!handler) return;
    Promise.resolve(handler(message.params)).catch(() => {});
  }

  #rejectPending(error) {
    for (const { reject, timer } of this.pendingCommands.values()) {
      clearTimeout(timer);
      reject(error);
    }
    this.pendingCommands.clear();
  }
}
