import type { ContextEntry, ContextSnapshot, Usage } from "../shared/model.js";

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : {};
const text = (value: unknown): string => typeof value === "string" ? value : "";
const count = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const name = (value: unknown, fallback: string) => /^[a-zA-Z0-9_.:/-]{1,100}$/u.test(text(value)) ? text(value) : fallback;

// The rollout does not expose the model tokenizer or the final serialized request.
export function estimateTokens(value: string): number {
  let ascii = 0, other = 0;
  for (const character of value) { if (character.codePointAt(0)! <= 127) ascii++; else other++; }
  return Math.ceil(ascii / 4 + other / 1.5);
}
function readUsage(value: unknown): Usage | null {
  const item = object(value), input = count(item.input_tokens), output = count(item.output_tokens);
  if (input === null || output === null) return null;
  const total = count(item.total_tokens) ?? input + output;
  if (total < input + output) return null;
  const cached = count(item.cached_input_tokens);
  return { input, output, total, cached: cached !== null && cached <= input ? cached : null };
}

function outputText(value: unknown): string {
  if (typeof value === "string") {
    if (/"type"\s*:\s*"(?:image|input_image|image_url|audio|input_audio)"/u.test(value)) {
      try { return outputText(JSON.parse(value)); } catch { return value; }
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(outputText).join("\n");
  const item = object(value);
  if (["image", "input_image", "image_url", "audio", "input_audio", "output_audio"].includes(text(item.type))) return "";
  if (typeof item.text === "string") return item.text;
  if (Array.isArray(item.content)) return outputText(item.content);
  return value === null || value === undefined ? "" : JSON.stringify(value);
}

export class ContextAnalyzer {
  private base = new Map<string, ContextEntry>();
  private history = new Map<string, ContextEntry>();
  private calls = new Map<string, string>();
  private measured: ContextEntry[] | null = null;
  private usage: Usage | null = null;
  private model: string | null = null;
  private measuredModel: string | null = null;
  private window: number | null = null;
  private measuredWindow: number | null = null;
  private measuredAt: string | null = null;
  private compactions = 0;
  private partial = false;
  private pending = 0;
  private usageRecord: string | null = null;

  markPartial(): void { this.partial = true; }
  private add(category: ContextEntry["category"], label: string, value: string, target = this.history): void {
    const tokens = estimateTokens(value);
    if (!tokens) return;
    // Arbitrary tool names cannot grow a renderer response without bound.
    if (target.size >= 200 && !target.has(`${category}:${label}`)) label = "其他";
    const id = `${category}:${label}`, previous = target.get(id);
    target.set(id, { id, category, label, tokens: (previous?.tokens ?? 0) + tokens, records: (previous?.records ?? 0) + 1 });
  }
  private instructions(value: string, fallback: string, category: "system" | "conversation"): void {
    let remaining = value;
    for (const [pattern, label, kind] of [
      [/<skills_instructions>[\s\S]*?<\/skills_instructions>/gu, "技能目录", "skills"],
      [/<skill>[\s\S]*?<\/skill>/gu, "已加载技能", "skills"],
      [/<INSTRUCTIONS>[\s\S]*?<\/INSTRUCTIONS>/gu, "AGENTS.md", "system"],
      [/<environment_context>[\s\S]*?<\/environment_context>/gu, "工作环境", "system"],
    ] as const) remaining = remaining.replace(pattern, match => { this.add(kind, label, match); return ""; });
    this.add(category, fallback, remaining);
  }
  private tools(values: unknown, prefix = "", depth = 0): void {
    for (const value of Array.isArray(values) ? values : []) {
      const definition = object(value), label = name(prefix + name(definition.name ?? object(definition.function).name, "other"), "其他工具");
      const nested = definition.type === "namespace" && Array.isArray(definition.tools) && depth < 3;
      if (nested) this.tools(definition.tools, `${label}.`, depth + 1);
      this.base.delete(`tools:${label}`);
      this.add("tools", label, JSON.stringify(nested ? { ...definition, tools: [] } : definition), this.base);
    }
  }
  private item(value: unknown): void {
    const item = object(value), kind = text(item.type);
    if (kind === "additional_tools") {
      this.tools(item.tools);
      return;
    }
    if (kind === "message") {
      const content = (Array.isArray(item.content) ? item.content : []).map(part => text(object(part).text)).join("\n");
      if (item.role === "system" || item.role === "developer") this.instructions(content, item.role === "system" ? "系统指令" : "应用指令", "system");
      else if (item.role === "user") this.instructions(content, "用户消息", "conversation");
      else if (item.role === "assistant") this.add("conversation", "助手消息", content);
    } else if (kind === "function_call" || kind === "custom_tool_call") {
      const tool = name(item.name, "其他工具");
      if (typeof item.call_id === "string") {
        if (this.calls.size >= 4096) this.calls.delete(this.calls.keys().next().value!);
        this.calls.set(item.call_id, tool);
      }
      this.add("conversation", `调用 · ${tool}`, text(item.arguments) || text(item.input));
    } else if (kind === "function_call_output" || kind === "custom_tool_call_output") {
      const tool = this.calls.get(text(item.call_id)) ?? "其他工具";
      this.add("results", tool, outputText(item.output));
    }
    // Opaque reasoning and multimodal payloads belong to the unallocated residual.
  }
  accept(value: unknown): void {
    const record = object(value), payload = object(record.payload);
    if (record.type === "session_meta") {
      this.base.delete("system:Agent 提示词");
      this.add("system", "Agent 提示词", text(object(payload.base_instructions).text), this.base);
      this.window = count(payload.context_window) || this.window;
    } else if (record.type === "turn_context") {
      this.model = text(payload.model).slice(0, 100) || this.model;
    } else if (record.type === "response_item") {
      this.item(payload); this.pending++;
    } else if (record.type === "compacted") {
      this.history.clear(); this.calls.clear(); this.compactions++; this.pending = 0;
      this.usage = null; this.measured = null; this.measuredAt = null; this.usageRecord = null;
      if (Array.isArray(payload.replacement_history)) payload.replacement_history.forEach(item => this.item(item));
      else { this.add("conversation", "压缩摘要", text(payload.message)); this.partial = true; }
    } else if (record.type === "event_msg" && payload.type === "task_started") {
      this.window = count(payload.model_context_window) || this.window;
    } else if (record.type === "token_usage_record" || record.type === "event_msg" && payload.type === "token_count") {
      const info = object(payload.info);
      this.window = count(info.model_context_window) || this.window;
      const usage = readUsage(record.type === "token_usage_record" ? payload.usage : info.last_token_usage);
      if (!usage) return;
      const signature = JSON.stringify(usage);
      // Newer rollouts emit a token_usage_record and then repeat it in token_count.
      if (record.type === "event_msg" && this.usageRecord === signature) { this.usageRecord = null; this.measuredWindow = this.window; return; }
      this.usageRecord = record.type === "token_usage_record" ? signature : null;
      this.usage = usage; this.measuredAt = text(record.timestamp) || null; this.measuredModel = this.model; this.measuredWindow = this.window;
      this.measured = [...this.base.values(), ...this.history.values()].map(entry => ({ ...entry })); this.pending = 0;
    }
  }
  snapshot(sessionId: string): ContextSnapshot {
    const entries = (this.measured ?? [...this.base.values(), ...this.history.values()]).map(entry => ({ ...entry }));
    const estimatedTokens = entries.reduce((sum, entry) => sum + entry.tokens, 0);
    const budget = this.usage?.total ?? estimatedTokens, scaled = estimatedTokens > budget;
    if (scaled) {
      let assigned = 0;
      const weights = entries.map(entry => entry.tokens);
      let cumulative = 0;
      entries.forEach((entry, index) => {
        cumulative += weights[index]; const end = Math.round(cumulative / estimatedTokens * budget);
        entry.tokens = end - assigned; assigned = end;
      });
    } else if (budget > estimatedTokens) entries.push({ id: "unknown:residual", category: "unknown", label: "未记录内容 / 编码差异", tokens: budget - estimatedTokens, records: 0 });
    return { sessionId, model: this.measured ? this.measuredModel : this.model, window: this.measured ? this.measuredWindow : this.window, usage: this.usage, measuredAt: this.measuredAt,
      entries: entries.filter(entry => entry.tokens > 0), estimatedTokens, scaled, compactions: this.compactions, partial: this.partial, pendingRecords: this.pending };
  }
}
