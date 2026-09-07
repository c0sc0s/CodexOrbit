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
