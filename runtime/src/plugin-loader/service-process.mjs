import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertMessageSize } from "./ipc-protocol.mjs";

/** One process per service bounds failures even when plugin code blocks the event loop. */
export class ServiceProcess {
  constructor({ entry, id, config = {}, stateDirectory, timeoutMs = 10_000, shutdownMs = 1500, onEvent = () => {} }) {
    this.timeoutMs = timeoutMs;
    this.shutdownMs = shutdownMs;
    this.pending = new Map();
    this.sequence = 0;
    this.closed = false;
    this.child = fork(fileURLToPath(new URL("./service-worker.mjs", import.meta.url)), [], {
      stdio: ["ignore", "ignore", "ignore", "ipc"], execArgv: [], serialization: "json",
    });
    this.exited = new Promise((resolve) => this.child.once("exit", resolve));
    this.child.on("error", () => this.fail());
    this.child.on("exit", () => this.fail());
    this.child.on("message", (message) => {
      if (this.closed || !message || typeof message !== "object") return;
      if (message.type === "event") { Promise.resolve().then(() => onEvent(message)).catch(() => {}); return; }
      const pending = this.pending.get(message.id);
      if (!pending) return;
      message.error ? pending.finish(new Error(message.error)) : pending.finish(null, message.value);
    });
    this.ready = this.request("activate", { entry, pluginId: id, config, stateDirectory });
  }

  fail() {
    this.closed = true;
    for (const pending of [...this.pending.values()]) pending.finish(new Error("Plugin service unavailable"));
  }

  request(type, payload = {}, { signal, timeoutMs = this.timeoutMs } = {}) {
    if (this.closed || !this.child.connected) return Promise.reject(new Error("Plugin service unavailable"));
    if (signal?.aborted) return Promise.reject(new Error("Service request cancelled"));
    if (this.pending.size >= 128) return Promise.reject(new Error("Too many pending service requests"));
    const id = ++this.sequence;
    const message = { ...payload, type, id };
    try { assertMessageSize(message); } catch (error) { return Promise.reject(error); }
    return new Promise((resolve, reject) => {
      const finish = (error, value) => {
        if (!this.pending.delete(id)) return;
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
        error ? reject(error) : resolve(value);
      };
      const cancel = (reason) => {
        if (this.child.connected) this.child.send({ type: "cancel", requestId: id }, () => {});
        finish(new Error(reason));
      };
      const abort = () => cancel("Service request cancelled");
      const timer = setTimeout(() => cancel("Service request timed out"), Math.min(30_000, Math.max(1, timeoutMs)));
      this.pending.set(id, { finish });
      signal?.addEventListener("abort", abort, { once: true });
      this.child.send(message, (error) => { if (error) finish(new Error("Plugin service disconnected")); });
    });
  }

  close() {
    this.closing ??= (async () => {
      if (!this.closed) await this.request("dispose", {}, { timeoutMs: this.shutdownMs }).catch(() => {});
      this.fail();
      if (this.child.exitCode === null && this.child.signalCode === null) this.child.kill("SIGKILL");
      await this.exited;
    })();
    return this.closing;
  }
}
