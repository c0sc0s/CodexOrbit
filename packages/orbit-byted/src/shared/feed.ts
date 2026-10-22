export const MAX_ITEMS = 500;
export const MAX_FEED_BYTES = 700 * 1024;
export interface FeedItem {
  id: string;
  title: string;
  url: string;
  status: string;
  details: string[];
  meter?: { label: string; value: number };
}
export interface FeedResult { items: FeedItem[]; complete: boolean }
export function boundFeed(result: FeedResult): FeedResult {
  const encoder = new TextEncoder(), items: FeedItem[] = [];
  let bytes = 128;
  for (const item of result.items) {
    bytes += encoder.encode(JSON.stringify(item)).byteLength + 1;
    if (bytes > MAX_FEED_BYTES) return { items, complete: false };
    items.push(item);
  }
  return result;
}
export type FailureCode = "cli-missing" | "auth" | "permission" | "network" | "data" | "storage";
export interface FeedSnapshot extends FeedResult {
  generation: string;
  revision: number;
  updatedAt: number | null;
  refreshing: boolean;
  error: FailureCode | null;
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid object");
  return value as Record<string, unknown>;
}
export function text(value: unknown, limit = 512): string {
  if (typeof value !== "string" || !value.trim()) throw new Error("Invalid text");
  return value.trim().slice(0, limit);
}
export function identifier(value: unknown): string {
  if (typeof value === "number" && !Number.isSafeInteger(value)) throw new Error("Invalid identifier");
  const result = String(value);
  if (!/^\d{1,20}$/u.test(result)) throw new Error("Invalid identifier");
  return result;
}
export function safeUrl(value: unknown, hosts: readonly string[]): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && hosts.includes(url.hostname);
  } catch { return false; }
}
export function isFeedResult(value: unknown, hosts: readonly string[]): value is FeedResult {
  try {
    const result = record(value);
    return typeof result.complete === "boolean" && Array.isArray(result.items) && result.items.length <= MAX_ITEMS && result.items.every(value => {
      const item = record(value);
      if (item.meter !== undefined) {
        const meter = record(item.meter);
        if (typeof meter.label !== "string" || !meter.label.trim() || meter.label.length > 40 ||
          typeof meter.value !== "number" || !Number.isFinite(meter.value) || meter.value < 0 || meter.value > 100) return false;
      }
      return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 128 &&
        typeof item.title === "string" && item.title.length > 0 && item.title.length <= 512 &&
        typeof item.status === "string" && item.status.length <= 80 && safeUrl(item.url, hosts) &&
        Array.isArray(item.details) && item.details.length <= 5 && item.details.every(v => typeof v === "string" && v.length <= 200);
    }) && new Set(result.items.map(value => record(value).id)).size === result.items.length;
  } catch { return false; }
}
export function isFeedSnapshot(value: unknown, hosts: readonly string[]): value is FeedSnapshot {
  if (!isFeedResult(value, hosts)) return false;
  const snapshot = value as unknown as Record<string, unknown>;
  return typeof snapshot.generation === "string" && snapshot.generation.length <= 64 &&
    Number.isSafeInteger(snapshot.revision) && (snapshot.revision as number) >= 0 && typeof snapshot.refreshing === "boolean" &&
    (snapshot.updatedAt === null || typeof snapshot.updatedAt === "number" && Number.isFinite(snapshot.updatedAt) && snapshot.updatedAt > 0) &&
    (snapshot.error === null || ["cli-missing", "auth", "permission", "network", "data", "storage"].includes(snapshot.error as string));
}
