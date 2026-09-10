import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import Database from "better-sqlite3";
import { SessionCatalog } from "../../../dist/runtime/src/service/catalog/session-catalog.js";

async function setup(context) {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-catalog-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const db = new Database(join(root, "state_5.sqlite"));
  db.exec("CREATE TABLE threads (id TEXT, title TEXT, name TEXT, updated_at INTEGER, archived INTEGER, thread_source TEXT)");
  const add = (id, source = "user", archived = 0) => db.prepare("INSERT INTO threads VALUES (?, 'old', '[Bug]Current title', 500, ?, ?)").run(id, archived, source);
  const state = {
    "local-projects": { project: {} }, "pinned-thread-ids": [], "projectless-thread-ids": [],
    "thread-project-assignments": {}, "sidebar-project-thread-orders": {},
  };
  const save = () => writeFile(join(root, ".codex-global-state.json"), JSON.stringify(state));
  return { root, db, add, state, save };
}

test("catalog uses sidebar membership regardless of expansion, age or subagent provenance", async (context) => {
  const { root, db, add, state, save } = await setup(context);
  for (const [id, source, archived] of [
    ["user", "user"], ["promoted", "subagent"], ["standalone", "agent_created_thread"],
    ["old-user", null], ["voice", "realtime_voice"], ["review", "guardian_review"],
    ["child", "subagent"], ["orphan", null], ["archived", "user", 1],
  ]) add(id, source, archived);
  db.close();
  state["pinned-thread-ids"] = ["local:promoted"];
  state["projectless-thread-ids"] = ["standalone", "voice", "review"];
  state["sidebar-project-thread-orders"] = { project: { threadIds: ["user", "old-user", "archived"] } };
  await save();
  const catalog = new SessionCatalog(root);
  const result = await catalog.read();
  assert.equal(result.complete, true);
  assert.deepEqual(result.items.map(r => r.threadId), ["old-user", "promoted", "standalone", "user"]);
  assert.equal(result.items.find(r => r.threadId === "promoted").pinned, true);
  assert.equal(result.items.find(r => r.threadId === "old-user").projectId, "project");
  assert.equal(result.items[0].raw, "[Bug]Current title");
  assert.equal(result.items[0].updatedAt, 500000);
  state["electron-persisted-atom-state"] = { "sidebar-collapsed-sections-v1": ["project", "pinned"] };
  await save();
  assert.deepEqual(await catalog.read(), result);
  state["pinned-thread-ids"] = [];
  await save();
  assert.ok(!(await catalog.read()).items.some(r => r.threadId === "promoted"));
});

test("explicit project assignments supersede stale ordering and deleted projects", async (context) => {
  const { root, db, add, state, save } = await setup(context);
  add("moved"); add("deleted"); db.close();
  state["sidebar-project-thread-orders"] = { project: { threadIds: ["moved", "deleted"] } };
  state["local-projects"].next = {};
  state["thread-project-assignments"] = {
    moved: { projectKind: "local", projectId: "next" }, deleted: { projectKind: "local", projectId: "missing" },
  };
  await save();
  const result = await new SessionCatalog(root).read();
  assert.equal(result.complete, true);
  assert.deepEqual(result.items.map(r => [r.threadId, r.projectId]), [["moved", "next"]]);
});

test("missing or malformed membership never falls back to the entire historical database", async (context) => {
  const { root, db, add } = await setup(context);
  add("orphan"); db.close();
  const catalog = new SessionCatalog(root);
  assert.equal((await catalog.read()).complete, false);
  await writeFile(join(root, ".codex-global-state.json"), '{}');
  assert.equal((await catalog.read()).complete, false);
  await writeFile(join(root, ".codex-global-state.json"), '{invalid');
  assert.equal((await catalog.read()).complete, false);
});
