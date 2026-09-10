export type ServiceRequest =
  | { type: "activate"; id: number; entry: string; pluginId: string; config: Record<string, unknown>; stateDirectory: string }
  | { type: "cancel"; requestId: number }
  | { type: "dispose"; id: number }
  | { type: "connect" | "disconnect"; id: number; clientId: string }
  | { type: "call"; id: number; method: string; payload?: unknown; clientId: string };
export type ServiceEvent = { type: "event"; topic: string; payload: unknown; clientId?: string };
export type ServiceReply = { type?: "reply"; id: number; error?: string; value?: unknown };
export function assertMessageSize(value: unknown) {
  if (Buffer.byteLength(JSON.stringify(value) ?? "null") > 1024 * 1024) throw new Error("Service message exceeds 1 MiB");
}
