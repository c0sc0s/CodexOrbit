import assert from "node:assert/strict";
import { mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { SessionSearchIndex } from "../src/search-index.mjs";

const threadId = "12345678-1234-1234-1234-123456789abc";

test("rebuilds stale extraction caches even when transcript timestamps are unchanged", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-tags-reindex-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const sessionPath = join(directory, "session.jsonl");
  const databasePath = join(directory, "search.sqlite");
  const options = { discoverFiles: async () => new Map([[threadId, sessionPath]]) };
  await writeFile(sessionPath, JSON.stringify({ type: "response_item", payload: { role: "user", content: [{ text: "previously missing user text" }] } }));
  const previous = new SessionSearchIndex(databasePath, options);
  await previous.refresh();
  previous.database.exec("DELETE FROM session_messages; PRAGMA user_version = 0;");
  previous.close();
  const current = new SessionSearchIndex(databasePath, options);
  try {
    assert.equal((await current.refresh()).changed, 1);
    assert.equal(current.search({ query: "missing", threadIds: [threadId] }).length, 1);
    assert.equal((await current.refresh()).changed, 0);
  } finally { current.close(); }
});

test("builds an incremental on-disk index and returns bounded snippets", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-tags-search-index-"));
  const sessionPath = join(directory, `${threadId}.jsonl`);
  const databasePath = join(directory, "search.sqlite");
  const files = new Map([[threadId, sessionPath]]);
  const index = new SessionSearchIndex(databasePath, { discoverFiles: async () => new Map(files) });
  try {
    const lines = [
      { type: "event_msg", payload: { type: "item_completed", item: { type: "UserMessage", content: [{ type: "text", text: "这是需要检索的中文关键词" }] } } },
      { type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "这是助手回复" }] } },
    ];
    await writeFile(sessionPath, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, "utf8");
    const firstRefresh = await index.refresh();
    assert.equal(firstRefresh.changed, 1);
    const [result] = index.search({ query: "中文关键词", threadIds: [`local:${threadId}`], limit: 10 });
    assert.equal(result.threadId, `local:${threadId}`);
    assert.equal(result.role, "你");
    assert.equal(result.snippet, "这是需要检索的中文关键词");
    assert.equal(typeof result.score, "number");
  } finally {
    index.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("removes sessions that disappear from discovery", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-tags-search-delete-"));
  const sessionPath = join(directory, `${threadId}.jsonl`);
  const databasePath = join(directory, "search.sqlite");
  const files = new Map([[threadId, sessionPath]]);
  const index = new SessionSearchIndex(databasePath, { discoverFiles: async () => new Map(files) });
  try {
    await writeFile(sessionPath, `${JSON.stringify({ type: "response_item", payload: { type: "message", role: "assistant", content: [{ type: "output_text", text: "删除测试" }] } })}\n`, "utf8");
    await index.refresh();
    assert.equal(index.search({ query: "删除", threadIds: [threadId] }).length, 1);
    files.clear();
    await unlink(sessionPath);
    await index.refresh();
    assert.equal(index.search({ query: "删除", threadIds: [threadId] }).length, 0);
  } finally {
    index.close();
    await rm(directory, { recursive: true, force: true });
  }
});
