import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { TodoRepository } from "../../dist/storage/repository.js";

async function store(t) {
  const directory = await mkdtemp(join(tmpdir(), "orbit-todo-test-"));
  const repository = new TodoRepository(directory);
  t.after(async () => { repository.close(); await rm(directory, { recursive: true, force: true }); });
  return { repository, directory };
}
const code = expected => error => error.code === expected;

test("creates nested tasks atomically and replays an identical request without duplicates", async t => {
  const { repository: r } = await store(t);
  const input = { title: "发布", project: "/local/project", requestId: "release", children: [{ title: "验证", children: [{ title: "构建" }] }, { title: "说明" }] };
  const first = r.create(input), replay = r.create(input);
  assert.equal(first.tasks.length, 4);
  assert.deepEqual(replay, { ...first, replayed: true });
  assert.equal(r.list().total, 4);
  assert.equal(first.tasks[2].parentId, first.tasks[1].id);
  assert.equal(first.tasks[2].project, "/local/project");
  assert.throws(() => r.create({ ...input, title: "不同请求" }), code("request_conflict"));
  assert.throws(() => r.create({ title: "回滚", children: [{ title: "有效" }, { title: "" }] }), code("invalid_input"));
  assert.equal(r.list().total, 4);
  assert.equal(r.generation(), 1);
});

test("completion requires finished descendants and reopening a child reopens ancestors", async t => {
  const { repository: r } = await store(t);
  const [root, child, leaf] = r.create({ title: "根", children: [{ title: "子", children: [{ title: "叶" }] }] }).tasks;
  assert.throws(() => r.update(root.id, 1, { status: "done" }), code("children_incomplete"));
  r.update(leaf.id, 1, { status: "done" });
  r.update(child.id, 1, { status: "done" });
  r.update(root.id, 1, { status: "done" });
  r.update(leaf.id, 2, { status: "todo" });
  assert.equal(r.get(root.id).status, "todo");
  assert.equal(r.get(child.id).status, "todo");
  assert.equal(r.get(root.id).revision, 3);
  r.update(leaf.id, 3, { status: "done" }); r.update(child.id, 3, { status: "done" }); r.update(root.id, 3, { status: "done" });
  r.create({ title: "新增子任务", parentId: child.id });
  assert.equal(r.get(root.id).status, "todo");
  assert.equal(r.get(child.id).status, "todo");
});

test("explicit subtree completion is atomic and undo preserves original statuses", async t => {
  const { repository: r } = await store(t);
  const [root, doing, done, deleted] = r.create({ title: "父", children: [{ title: "进行中" }, { title: "已完成" }, { title: "已删除" }] }).tasks;
  r.update(doing.id, 1, { status: "doing" });
  r.update(done.id, 1, { status: "done" });
  r.archive(deleted.id, 1);
  const result = r.complete(root.id, 1, r.generation());
  assert.equal(result.undo.length, 2);
  assert.ok(r.list().items.every(item => item.status === "done"));
  assert.equal(r.get(deleted.id).status, "todo");
  r.undoCompletion(result.undo);
  assert.equal(r.get(root.id).status, "todo");
  assert.equal(r.get(doing.id).status, "doing");
  assert.equal(r.get(done.id).status, "done");
  assert.ok(r.get(deleted.id).archivedAt);
});

test("completion rejects a changed tree and a conflicting undo rolls back completely", async t => {
  const { repository: r } = await store(t);
  const [root] = r.create({ title: "父" }).tasks;
  const generation = r.generation();
  const [child] = r.create({ title: "在确认期间新建的子任务", parentId: root.id }).tasks;
  assert.throws(() => r.complete(root.id, 1, generation), code("conflict"));
  assert.ok(r.list().items.every(item => item.status === "todo"));
  const result = r.complete(root.id, 1, r.generation());
  r.update(child.id, 2, { description: "并发写入" });
  const beforeUndo = r.generation();
  assert.throws(() => r.undoCompletion(result.undo), code("conflict"));
  assert.ok(r.list().items.every(item => item.status === "done"));
  assert.equal(r.generation(), beforeUndo);
  assert.equal(r.get(root.id).revision, 2);
  assert.equal(r.get(child.id).description, "并发写入");
});

test("cycles and excessive depth fail without partial moves or creations", async t => {
  const { repository: r } = await store(t);
  const [root, child] = r.create({ title: "根", children: [{ title: "子" }] }).tasks;
  assert.throws(() => r.update(root.id, 1, { parentId: child.id }), code("cycle"));
  assert.throws(() => r.update(root.id, 1, { parentId: root.id }), code("cycle"));
  let input = { title: "leaf" };
  for (let i = 0; i < 16; i++) input = { title: `level-${i}`, children: [input] };
  assert.throws(() => r.create(input), code("limit_exceeded"));
  assert.equal(r.list().total, 2);
  assert.equal(r.get(root.id).parentId, null);
  assert.equal(r.get(root.id).revision, 1);
});

test("independent connections reject stale edits and preserve the winning fields", async t => {
  const { repository: r, directory } = await store(t);
  const other = new TodoRepository(directory); t.after(() => other.close());
  const [task] = r.create({ title: "原始标题" }).tasks;
  const before = other.get(task.id);
  r.update(task.id, task.revision, { description: "人工补充" });
  assert.throws(() => other.update(task.id, before.revision, { title: "Agent 修改" }), code("conflict"));
  const latest = other.get(task.id);
  other.update(task.id, latest.revision, { title: "Agent 修改" });
  assert.equal(r.get(task.id).description, "人工补充");
  assert.equal(r.get(task.id).title, "Agent 修改");
});

test("subtree restore preserves previously archived descendants and rejects orphan restores", async t => {
  const { repository: r } = await store(t);
  const [root, child, sibling] = r.create({ title: "根", children: [{ title: "独立归档" }, { title: "随父归档" }] }).tasks;
  r.archive(child.id, 1);
  r.archive(root.id, 1);
  assert.equal(r.list().total, 0);
  assert.equal(r.list({ archived: true }).total, 3);
  assert.throws(() => r.archive(sibling.id, 2, true), code("parent_archived"));
  r.archive(root.id, 2, true);
  assert.equal(r.list().total, 2);
  assert.ok(r.get(child.id).archivedAt);
  assert.equal(r.get(sibling.id).archivedAt, null);
  r.archive(child.id, 2, true);
  assert.equal(r.list().total, 3);
});

test("restoring an unfinished subtree reopens a completed parent", async t => {
  const { repository: r } = await store(t);
  const [root, child] = r.create({ title: "根", children: [{ title: "子" }] }).tasks;
  r.archive(child.id, 1);
  r.update(root.id, 1, { status: "done" });
  r.archive(child.id, 2, true);
  assert.equal(r.get(root.id).status, "todo");
});

test("bounded summaries omit descriptions; filters and dates are validated", async t => {
  const { repository: r } = await store(t);
  const [task] = r.create({ title: "任务", description: "查找这段背景", project: "Orbit", dueDate: "2026-10-19" }).tasks;
  const page = r.list({ query: "背景", project: "Orbit", limit: 1 });
  assert.equal(page.total, 1);
  assert.ok(!("description" in page.items[0]));
  assert.equal(r.list({ offset: 1 }).items.length, 0);
  assert.throws(() => r.list({ limit: 201 }), code("invalid_input"));
  assert.throws(() => r.update(task.id, 1, { dueDate: "2026-02-30" }), code("invalid_input"));
  assert.throws(() => r.update(task.id, 1, { status: "unknown" }), code("invalid_input"));
  assert.throws(() => r.update(task.id, undefined, { title: "新标题" }), code("invalid_input"));
  assert.equal(r.get(task.id).revision, 1);
});
