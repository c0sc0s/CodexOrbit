export const RUNTIME_VERSION = "0.1.2";
export const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export const categories = {
  system: { label: "系统提示词", color: "#b9a3f5" },
  tools: { label: "工具定义", color: "#73cce6" },
  skills: { label: "技能", color: "#9baac3" },
  results: { label: "工具结果", color: "#e5a2c9" },
  conversation: { label: "会话内容", color: "#9faef7" },
  unknown: { label: "未归因", color: "#9b9ba4" },
  free: { label: "剩余空间", color: "#77777f" },
} as const;
export type Category = keyof typeof categories;
export interface ContextEntry { id: string; category: Exclude<Category, "free">; label: string; tokens: number; records: number }
export interface Usage { input: number; cached: number | null; output: number; total: number }
export interface ContextSnapshot {
  sessionId: string;
  model: string | null;
  window: number | null;
  usage: Usage | null;
  measuredAt: string | null;
  entries: ContextEntry[];
  estimatedTokens: number;
  scaled: boolean;
  compactions: number;
  partial: boolean;
  pendingRecords: number;
}
export type ContextResult = { status: "ready"; snapshot: ContextSnapshot } | { status: "missing" | "unavailable" | "too-large" };
export function localSessionId(value: string | null): string | null {
  const id = value?.startsWith("local:") ? value.slice("local:".length) : value;
  return id && SESSION_ID.test(id) ? id.toLowerCase() : null;
}
export function sessionFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    for (const part of url.pathname.split("/").reverse()) if (SESSION_ID.test(part)) return part.toLowerCase();
  } catch { /* Desktop memory routing resolves through the selected sidebar identity. */ }
  return null;
}
export function formatTokens(value: number): string {
  return value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : String(Math.round(value));
}
