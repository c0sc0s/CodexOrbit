import { pathToFileURL } from "node:url";
import { createResourceScope } from "./lifecycle.mjs";
import { assertMessageSize } from "./ipc-protocol.mjs";

const scope = createResourceScope(1000);
const handlers = new Map();
const requests = new Map();
const clients = new Set();
const connectHandlers = new Set();
const disconnectHandlers = new Set();
let activated = false;
const send = (message) => {
  assertMessageSize(message);
  if (process.connected) process.send(message, () => {});
};
const subscribe = (set, callback) => {
  if (typeof callback !== "function") throw new Error("Expected callback");
  set.add(callback);
  const remove = () => { set.delete(callback); };
  scope.onDispose(remove);
  return remove;
};
async function handle(message) {
  const { type, id } = message;
  if (type === "cancel") { requests.get(message.requestId)?.controller.abort(); return; }
  if (type === "activate") {
    if (activated) throw new Error("Service already activated");
    activated = true;
    const imported = await import(pathToFileURL(message.entry).href);
    if (typeof imported.activate !== "function") throw new Error("Expected service activate export");
    const instance = await imported.activate(Object.freeze({
      id: message.pluginId, config: message.config, stateDirectory: message.stateDirectory,
      signal: scope.signal, onDispose: scope.onDispose,
      rpc: Object.freeze({ handle(method, callback) {
        if (typeof method !== "string" || !method || method.length > 128 || handlers.has(method) || typeof callback !== "function") throw new Error("Invalid or duplicate RPC method");
        handlers.set(method, callback);
        scope.onDispose(() => { handlers.delete(method); });
      } }),
      events: Object.freeze({ publish(topic, payload, clientId) {
        if (scope.signal.aborted) return;
        if (typeof topic !== "string" || !topic || topic.length > 128) throw new Error("Invalid event topic");
        if (clientId !== undefined && !clients.has(clientId)) return;
        send({ type: "event", topic, payload, clientId });
      } }),
      clients: Object.freeze({ onConnect: (callback) => subscribe(connectHandlers, callback), onDisconnect: (callback) => subscribe(disconnectHandlers, callback) }),
    }));
    if (typeof instance?.dispose === "function") scope.onDispose(() => instance.dispose());
    return null;
  }
  if (type === "dispose") { scope.abort(); for (const { controller } of requests.values()) controller.abort(); await scope.close(); return null; }
  if (scope.signal.aborted) throw new Error("Service is closing");
  if (type === "connect") { clients.add(message.clientId); for (const callback of connectHandlers) await callback(message.clientId); return null; }
  if (type === "disconnect") { clients.delete(message.clientId); for (const request of requests.values()) if (request.clientId === message.clientId) request.controller.abort(); for (const callback of disconnectHandlers) await callback(message.clientId); return null; }
  if (type !== "call" || !handlers.has(message.method)) throw new Error("Unknown service method");
  if (requests.size >= 128) throw new Error("Too many service requests");
  const controller = new AbortController();
  requests.set(id, { controller, clientId: message.clientId });
  try { return await handlers.get(message.method)(message.payload, { clientId: message.clientId, signal: controller.signal }); }
  finally { requests.delete(id); }
}
process.on("message", (message) => {
  if (!message || typeof message !== "object") return;
  Promise.resolve().then(() => handle(message)).then(
    (value) => {
      if (message.type === "cancel") return;
      try { send({ id: message.id, value: value ?? null }); }
      catch { send({ id: message.id, error: "Invalid or oversized service reply" }); }
    },
    () => { send({ id: message.id, error: "Plugin service request failed" }); },
  ).catch(() => {});
});
// An abruptly terminated daemon must not leave services or open databases behind.
process.on("disconnect", () => { process.exit(0); });
