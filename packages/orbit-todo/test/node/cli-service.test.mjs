import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { activate } from "../../dist/service/activate.js";

const binary = resolve("bin/orbit-todo.mjs"), run = promisify(execFile);
async function directory(t) {
  const path = await mkdtemp(join(tmpdir(), "orbit-todo-cli-"));
  t.after(() => rm(path, { recursive: true, force: true })); return path;
}
function command(path, args, input) {
  return JSON.parse(execFileSync(process.execPath, [binary, "--data-dir", path, ...args], { encoding: "utf8", input }));
}

test("CLI supports atomic stdin trees, partial updates and structured failures", async t => {
  const path = await directory(t);
  const created = command(path, ["create", "--stdin"], JSON.stringify({ title: "父任务", children: [{ title: "子任务" }] }));
  const root = created.data.tasks[0];
  assert.equal(created.data.tasks.length, 2);
  const update = command(path, ["update", root.id, "--if-revision", "1", "--stdin"], JSON.stringify({ description: "工作背景", dueDate: null }));
  assert.equal(update.data.description, "工作背景");
  for (const args of [["get", root.id, "--title", "ignored"], ["list", "--limit", "0"], ["update", root.id, "--status", "done"], ["unknown"], ["get", "not-an-id"]]) {
    try { command(path, args); assert.fail("Command should fail"); }
    catch (error) { const result = JSON.parse(error.stdout); assert.equal(result.ok, false); assert.equal(result.error.code, "invalid_input"); }
  }
});

test("two CLI processes competing for one revision produce one winner", async t => {
  const path = await directory(t), task = command(path, ["create", "--title", "原始"]).data.tasks[0];
  const results = await Promise.allSettled(["标题 A", "标题 B"].map(title => run(process.execPath, [binary, "--data-dir", path, "update", task.id, "--if-revision", "1", "--title", title])));
  assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
  const rejected = results.find(result => result.status === "rejected");
  assert.equal(JSON.parse(rejected.reason.stdout).error.code, "conflict");
  assert.equal(command(path, ["get", task.id]).data.revision, 2);
});

test("CLI delete moves a subtree to trash and restore recovers it", async t => {
  const path = await directory(t);
  const root = command(path, ["create", "--stdin"], JSON.stringify({ title: "父任务", children: [{ title: "子任务" }] })).data.tasks[0];
  const deleted = command(path, ["delete", root.id, "--if-revision", "1"]).data;
  assert.equal(command(path, ["list"]).data.total, 0);
  assert.equal(command(path, ["list", "--archived"]).data.total, 2);
  command(path, ["restore", root.id, "--if-revision", String(deleted.revision)]);
  assert.equal(command(path, ["list"]).data.total, 2);
  assert.equal(command(path, ["list", "--archived"]).data.total, 0);
});

test("service observes CLI writes, validates RPC and cleans up its resources", async t => {
  const path = await directory(t), handlers = new Map(), disposers = [], events = [];
  const controller = new AbortController();
  activate({ stateDirectory: path, config: {}, id: "orbit-todo", signal: controller.signal,
    onDispose: callback => disposers.push(callback),
    rpc: { handle: (method, handler) => handlers.set(method, handler) },
    events: { publish: (topic, payload) => events.push({ topic, payload }) },
    clients: { onConnect: () => () => {}, onDisconnect: () => () => {} },
  });
  t.after(async () => { controller.abort(); for (const dispose of disposers.reverse()) await dispose(); });
  command(path, ["create", "--title", "来自 Agent"]);
  await new Promise(resolve => setTimeout(resolve, 1150));
  assert.equal(events.at(-1).topic, "changed");
  assert.deepEqual(Object.keys(events.at(-1).payload), ["generation"]);
  const result = await handlers.get("list")({});
  assert.equal(result.data.items[0].title, "来自 Agent");
  assert.equal((await handlers.get("update")({ id: "invalid" })).error.code, "invalid_input");
  assert.equal((await handlers.get("open")({ id: result.data.items[0].id })).error.code, "not_linked");
});
