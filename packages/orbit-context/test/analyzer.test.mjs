import assert from "node:assert/strict";
import test from "node:test";
import { ContextAnalyzer } from "../dist/service/analyzer.js";

const item = (type, values = {}) => ({ type: "response_item", payload: { type, ...values } });
const message = (role, text) => item("message", { role, content: [{ type: "input_text", text }] });
const usage = (input = 1000, cached = 800, output = 100) => ({ input_tokens: input, cached_input_tokens: cached, output_tokens: output, total_tokens: input + output });
const count = (value = usage()) => ({ type: "event_msg", timestamp: "2026-10-26T04:00:00Z", payload: { type: "token_count", info: { model_context_window: 10000, last_token_usage: value, total_token_usage: usage(900000, 1000, 50000) } } });
const total = snapshot => snapshot.entries.reduce((sum, entry) => sum + entry.tokens, 0);

test("measures the latest request, excludes duplicate events and never returns source content", () => {
  const analyzer = new ContextAnalyzer();
  analyzer.accept({ type: "session_meta", payload: { base_instructions: { text: "private base prompt" } } });
  analyzer.accept({ type: "turn_context", payload: { model: "test-model" } });
  analyzer.accept(item("additional_tools", { tools: [{ name: "exec", description: "private schema" }] }));
  analyzer.accept(message("developer", "private instructions<skills_instructions>private skill catalog</skills_instructions>"));
  analyzer.accept(message("user", "<INSTRUCTIONS>private repository rules</INSTRUCTIONS>private user message"));
  analyzer.accept(item("function_call", { call_id: "a", name: "exec", arguments: "private arguments" }));
  analyzer.accept(item("function_call_output", { call_id: "a", output: "private tool output" }));
  analyzer.accept({ type: "event_msg", payload: { type: "user_message", message: "private user message" } });
  analyzer.accept(count());
  const result = analyzer.snapshot("test");
  assert.equal(result.usage.total, 1100); assert.equal(result.usage.cached, 800); assert.equal(result.window, 10000);
  assert.equal(total(result), 1100); assert.equal(result.model, "test-model");
  assert.deepEqual(new Set(result.entries.map(entry => entry.category)), new Set(["system", "tools", "skills", "conversation", "results", "unknown"]));
  assert.equal(result.entries.find(entry => entry.label === "用户消息").records, 1);
  assert.ok(!JSON.stringify(result).includes("private"));
});

test("freezes composition at the measurement and coalesces duplicate usage representations", () => {
  const analyzer = new ContextAnalyzer(); analyzer.accept(message("user", "Before measurement"));
  analyzer.accept({ type: "token_usage_record", timestamp: "now", payload: { usage: usage() } });
  analyzer.accept(item("function_call_output", { output: "New tool output" })); analyzer.accept(count());
  let result = analyzer.snapshot("test");
  assert.ok(!result.entries.some(entry => entry.category === "results")); assert.equal(result.pendingRecords, 1); assert.equal(result.window, 10000);
  analyzer.accept(count(usage(1200))); result = analyzer.snapshot("test");
  assert.ok(result.entries.some(entry => entry.category === "results")); assert.equal(result.pendingRecords, 0); assert.equal(total(result), 1300);
});

test("compaction replaces history and invalidates the preceding measurement", () => {
  const analyzer = new ContextAnalyzer(); analyzer.accept(message("user", "old".repeat(1000))); analyzer.accept(count());
  analyzer.accept({ type: "compacted", payload: { replacement_history: [{ type: "message", role: "user", content: [{ type: "input_text", text: "new summary" }] }] } });
  let result = analyzer.snapshot("test"); assert.equal(result.usage, null); assert.equal(result.compactions, 1); assert.ok(result.estimatedTokens < 10);
  analyzer.accept(count(usage(100, 50, 10))); result = analyzer.snapshot("test"); assert.equal(total(result), 110); assert.equal(result.partial, false);
  analyzer.accept({ type: "compacted", payload: { message: "local summary" } });
  result = analyzer.snapshot("test"); assert.equal(result.partial, true); assert.equal(result.entries[0].label, "压缩摘要");
});

test("large estimates are explicitly normalized to the measured budget, including zero", () => {
  const analyzer = new ContextAnalyzer(); analyzer.accept(message("user", "中".repeat(300))); analyzer.accept(message("assistant", "a".repeat(1000)));
  analyzer.accept(count(usage(20, 10, 2))); let result = analyzer.snapshot("test");
  assert.equal(total(result), 22); assert.equal(result.scaled, true); assert.ok(result.estimatedTokens > 22);
  analyzer.accept(count(usage(0, 0, 0))); result = analyzer.snapshot("test"); assert.equal(total(result), 0); assert.equal(result.usage.total, 0);
});

test("missing counters stay unknown and images/encrypted reasoning are not tokenized as text", () => {
  const analyzer = new ContextAnalyzer();
  analyzer.accept(item("reasoning", { encrypted_content: "encrypted".repeat(2000) }));
  analyzer.accept(item("message", { role: "user", content: [{ type: "input_image", image_url: "data:image/png;base64,abcdef" }] }));
  analyzer.accept(item("function_call_output", { output: JSON.stringify([{ type: "image", data: "a".repeat(20000) }]) }));
  analyzer.accept(count({ input_tokens: 10, output_tokens: 2, total_tokens: 12 }));
  const result = analyzer.snapshot("test"); assert.equal(result.usage.cached, null); assert.equal(result.estimatedTokens, 0); assert.equal(result.entries[0].category, "unknown");
  analyzer.accept(count({ input_tokens: -1, output_tokens: 1 })); assert.equal(analyzer.snapshot("test").usage.total, 12);
});

test("tool cardinality and reply sizes stay bounded", () => {
  const analyzer = new ContextAnalyzer();
  for (let i = 0; i < 1500; i++) analyzer.accept(item("function_call", { name: `tool_${i}`, arguments: "argument", call_id: String(i) }));
  const result = analyzer.snapshot("test"); assert.ok(result.entries.length <= 201); assert.ok(JSON.stringify(result).length < 100000);
});

test("namespace definitions break down into individual tools without counting the namespace twice", () => {
  const analyzer = new ContextAnalyzer();
  const declaration = item("additional_tools", { tools: [{ type: "namespace", name: "functions", description: "Tools", tools: [{ type: "custom", name: "exec", description: "Run code" }, { type: "function", name: "wait", parameters: {} }] }] });
  analyzer.accept(declaration); const first = analyzer.snapshot("test"); analyzer.accept(declaration);
  assert.deepEqual(analyzer.snapshot("test").entries, first.entries);
  assert.ok(first.entries.some(entry => entry.label === "functions.exec"));
  assert.ok(first.entries.some(entry => entry.label === "functions.wait"));
  assert.equal(first.entries.length, 3);
});
