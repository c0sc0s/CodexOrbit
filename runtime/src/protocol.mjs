export const RUNTIME_PROTOCOL_VERSION = 1;

export const RuntimeMessageType = Object.freeze({
  hello: "hello",
  searchRequest: "search.request",
  searchResult: "search.result",
  settingsGet: "settings.get",
  settingsSnapshot: "settings.snapshot",
  settingsUpdate: "settings.update",
  settingsError: "settings.error",
  runtimeStatus: "runtime.status",
  catalogSnapshot: "catalog.snapshot",
  navigationOpen: "navigation.open",
});

export function createRuntimeMessage(type, payload = {}, requestId) {
  if (typeof type !== "string" || !type) throw new TypeError("Runtime message type must be a non-empty string");
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Runtime message payload must be an object");
  if (requestId !== undefined && !Number.isSafeInteger(requestId)) throw new TypeError("Runtime message requestId must be a safe integer");
  return {
    protocolVersion: RUNTIME_PROTOCOL_VERSION,
    type,
    ...(requestId === undefined ? {} : { requestId }),
    payload,
  };
}

export function parseRuntimeMessage(value) {
  let candidate = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate);
    } catch {
      return { ok: false, reason: "invalid-json" };
    }
  }
  if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return { ok: false, reason: "invalid-envelope" };
  if (candidate.protocolVersion !== RUNTIME_PROTOCOL_VERSION) return { ok: false, reason: "unsupported-version" };
  if (typeof candidate.type !== "string" || !candidate.type) return { ok: false, reason: "invalid-type" };
  if (candidate.payload === null || typeof candidate.payload !== "object" || Array.isArray(candidate.payload)) return { ok: false, reason: "invalid-payload" };
  if (candidate.requestId !== undefined && !Number.isSafeInteger(candidate.requestId)) return { ok: false, reason: "invalid-request-id" };
  return { ok: true, message: candidate };
}
