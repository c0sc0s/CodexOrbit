import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { SessionCatalog } from "../src/session-catalog.mjs";

test("catalog reads all active local sessions and real timestamps without sidebar state", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-catalog-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const db = new Database(join(root, "state_5.sqlite"));
  db.exec("CREATE TABLE threads (id TEXT, title TEXT, name TEXT, updated_at INTEGER, archived INTEGER)");
  db.prepare("INSERT INTO threads VALUES (?, ?, ?, ?, ?)").run("1", "old", "[Bug]Current title", 500, 0);
  db.prepare("INSERT INTO threads VALUES (?, ?, ?, ?, ?)").run("2", "archived", null, 600, 1);
  db.close();
  const result = await new SessionCatalog(root).read();
  assert.equal(result.complete, true);
  assert.deepEqual(result.items, [{ threadId: "1", raw: "[Bug]Current title", updatedAt: 500000, pinned: null, projectId: null }]);
});

test("catalog fails visibly when Codex changes the private schema", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-catalog-schema-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  assert.equal((await new SessionCatalog(root).read()).complete, false);
  const db = new Database(join(root, "state_99.sqlite"));
  db.exec("CREATE TABLE changed (id TEXT)");
  db.close();
  assert.equal((await new SessionCatalog(root).read()).complete, false);
});

for (const legacy of [false, true]) {
  test(`catalog excludes internal agents without hiding standalone sessions (${legacy ? "legacy" : "current"} schema)`, async (context) => {
    const root = await mkdtemp(join(tmpdir(), "codex-tags-catalog-sources-"));
    context.after(() => rm(root, { recursive: true, force: true }));
    const db = new Database(join(root, "state_5.sqlite"));
    db.exec(`CREATE TABLE threads (id TEXT, title TEXT, updated_at INTEGER, archived INTEGER, source TEXT${legacy ? "" : ", thread_source TEXT"})`);
    const rows = [
      ["user", "vscode", "user"],
      ["standalone", "vscode", "agent_created_thread"],
      ["voice", "vscode", "realtime_voice"],
      ["cli", "cli", null],
      ["unknown", "future-source", null],
      ["malformed", "{invalid", null],
      ["missing", null, null],
      ["child", JSON.stringify({ subagent: { thread_spawn: { parent_thread_id: "user" } } }), "subagent"],
      ["review", JSON.stringify({ subagent: { other: "guardian_review" } }), "guardian_review"],
      ["plain-child", "subagent", null],
      ["encoded-child", JSON.stringify("subagent"), null],
      ...(!legacy ? [["new-child", "vscode", "subagent"], ["new-review", "vscode", "guardian_review"]] : []),
    ];
    const insert = db.prepare(`INSERT INTO threads VALUES (?, ?, 1, 0, ?${legacy ? "" : ", ?"})`);
    for (const [id, source, threadSource] of rows) insert.run(...[id, "[Bug]Same title", source, ...(!legacy ? [threadSource] : [])]);
    db.close();
    const result = await new SessionCatalog(root).read();
    assert.equal(result.complete, true);
    assert.deepEqual(result.items.map(({ threadId }) => threadId), ["cli", "malformed", "missing", "standalone", "unknown", "user", "voice"]);
    assert.ok(result.items.every((item) => !("source" in item) && !("threadSource" in item)));
  });
}
