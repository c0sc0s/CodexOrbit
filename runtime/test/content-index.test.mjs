import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { extractConversationText } from "../src/content-index.mjs";

test("indexes only user and assistant conversation text", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-sidebar-content-"));
  const path = join(directory, "session.jsonl");
  const lines = [
    { type: "session_meta", payload: { base_instructions: { text: "不要索引系统说明" } } },
    { type: "event_msg", payload: { type: "item_completed", item: { type: "UserMessage", content: [{ type: "text", text: "包装说明 ## My request: 搜索正文关键词" }] } } },
    { type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "这是助手回复" }] } },
    { type: "response_item", payload: { type: "function_call_output", output: { text: "不要索引工具输出" } } },
  ];
  await writeFile(path, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf8");
  try {
    assert.deepEqual(await extractConversationText(path), [
      { role: "你", text: "搜索正文关键词" },
      { role: "Codex", text: "这是助手回复" },
    ]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
