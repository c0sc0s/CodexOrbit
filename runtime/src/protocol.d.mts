export const RUNTIME_PROTOCOL_VERSION: 1;

export const RuntimeMessageType: Readonly<{
  hello: "hello";
  searchRequest: "search.request";
  searchResult: "search.result";
  settingsGet: "settings.get";
  settingsSnapshot: "settings.snapshot";
  settingsUpdate: "settings.update";
  settingsError: "settings.error";
  runtimeStatus: "runtime.status";
  catalogSnapshot: "catalog.snapshot";
  navigationOpen: "navigation.open";
}>;

export interface RuntimeMessage<TType extends string = string, TPayload extends Record<string, unknown> = Record<string, unknown>> {
  protocolVersion: 1;
  type: TType;
  requestId?: number;
  payload: TPayload;
}

export function createRuntimeMessage<TType extends string, TPayload extends Record<string, unknown>>(
  type: TType,
  payload?: TPayload,
  requestId?: number,
): RuntimeMessage<TType, TPayload>;

export function parseRuntimeMessage(value: unknown):
  | { ok: true; message: RuntimeMessage }
  | { ok: false; reason: "invalid-json" | "invalid-envelope" | "unsupported-version" | "invalid-type" | "invalid-payload" | "invalid-request-id" };
