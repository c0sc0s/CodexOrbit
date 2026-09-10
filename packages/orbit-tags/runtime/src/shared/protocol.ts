export interface RuntimeMessage<TType extends string = string, TPayload extends object = Record<string, unknown>> {
  protocolVersion: 1; type: TType; requestId?: number; payload: TPayload;
}
type ParseResult = { ok: true; message: RuntimeMessage } | { ok: false; reason: string };
export const RUNTIME_PROTOCOL_VERSION = 1;

export const RuntimeMessageType = Object.freeze({
  updateCheck: "update.check",
  updateInstall: "update.install",
  updateSnapshot: "update.snapshot",
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

export function createRuntimeMessage<TType extends string, TPayload extends object = Record<string, unknown>>(type: TType, payload: TPayload = {} as TPayload, requestId?: number): RuntimeMessage<TType, TPayload> {
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

export function parseRuntimeMessage(value: unknown): ParseResult {
  let parsed: unknown = value;
  if (typeof parsed === "string") {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { ok: false, reason: "invalid-json" };
    }
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, reason: "invalid-envelope" };
  const candidate = parsed as Record<string, unknown>;
  if (candidate.protocolVersion !== RUNTIME_PROTOCOL_VERSION) return { ok: false, reason: "unsupported-version" };
  if (typeof candidate.type !== "string" || !candidate.type) return { ok: false, reason: "invalid-type" };
  if (candidate.payload === null || typeof candidate.payload !== "object" || Array.isArray(candidate.payload)) return { ok: false, reason: "invalid-payload" };
  if (candidate.requestId !== undefined && !Number.isSafeInteger(candidate.requestId)) return { ok: false, reason: "invalid-request-id" };
  return { ok: true, message: candidate as unknown as RuntimeMessage };
}
