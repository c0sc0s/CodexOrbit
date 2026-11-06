import assert from "node:assert/strict";
import test from "node:test";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile, appendFile, rm, symlink, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import Database from "better-sqlite3";
import { WorkspaceRepository } from "../dist/service/repository.js";
import { activate } from "../dist/service/activate.js";
import { currentWorkspace } from "../dist/shared/model.js";

const run = promisify(execFile), id = "12345678-1234-1234-1234-123456789abc", signal = () => new AbortController().signal;
const context = (cwd, turn = "turn-1") => JSON.stringify({ type: "turn_context", timestamp: "2026-11-05T08:00:00Z", payload: { cwd, turn_id: turn, developer_instructions: "PRIVATE INSTRUCTIONS" } }) + "\n";
async function fixture(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "orbit-workspace-test-"))); t.after(() => rm(root, { recursive: true, force: true }));
  const repo = join(root, "repo"), home = join(root, "codex"), sessions = join(home, "sessions"); await mkdir(repo); await mkdir(sessions, { recursive: true });
  const git = async (...args) => (await run("git", ["-C", repo, ...args], { env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" } })).stdout.trim();
  await git("init", "-b", "feat/workspace"); await git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-m", "Initial");
  const rollout = join(sessions, `rollout-${id}.jsonl`); await writeFile(rollout, context(repo));
  const dbPath = join(home, "state_5.sqlite"), db = new Database(dbPath);
  db.exec("CREATE TABLE threads (id TEXT PRIMARY KEY, cwd TEXT, rollout_path TEXT, first_user_message TEXT, git_branch TEXT)");
  db.prepare("INSERT INTO threads VALUES (?, ?, ?, 'PRIVATE BODY', 'obsolete-branch')").run(id, repo, rollout); db.close();
  const desktop = async (applied, pending = null) => writeFile(join(home, ".codex-global-state.json"), JSON.stringify({ "electron-persisted-atom-state": { [`thread-workspace-state-v1:${id}`]: { applied: applied ? { cwd: applied, runtimeWorkspaceRoots: [root] } : null, pending: pending ? { cwd: pending } : null } } }));
  return { root, repo, home, rollout, git, dbPath, desktop, repository: new WorkspaceRepository(home) };
}

test("a turn's execution directory overrides stale catalog metadata and exposes only bounded evidence", async t => {
  const f = await fixture(t), cwd = join(f.root, "other"); await mkdir(cwd);
  await appendFile(f.rollout, JSON.stringify({ type: "response_item", payload: { content: "PRIVATE MESSAGE" } }) + "\n" + context(cwd, "turn-2"));
  const result = await f.repository.read(id, signal());
  assert.equal(result.status, "ready"); assert.equal(result.snapshot.source, "turn"); assert.equal(result.snapshot.directory, cwd);
  assert.equal(result.snapshot.registeredDirectory, f.repo); assert.equal(result.snapshot.lastExecution.turnId, "turn-2");
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|obsolete-branch|developer_instructions/);
});

test("applied cwd is distinct from pending and access roots, and conflicting execution evidence stays visible", async t => {
  const f = await fixture(t), applied = join(f.root, "applied"), pending = join(f.root, "pending"); await mkdir(applied); await mkdir(pending);
  await f.desktop(applied, pending); const result = await f.repository.read(id, signal());
  assert.equal(result.snapshot.source, "applied"); assert.equal(result.snapshot.directory, applied);
  assert.equal(result.snapshot.pendingDirectory, pending); assert.equal(result.snapshot.disagreement, true);
  assert.equal(result.snapshot.lastExecution.cwd, f.repo); assert.notEqual(result.snapshot.directory, f.root);
});

test("explicit shell workdir and its Git branch stay distinct from the default session directory", async t => {
  const f = await fixture(t), worktree = join(f.repo, "workspaces", "anchor-report-tools");
  await f.git("worktree", "add", "-b", "feat/core-http-agent", worktree); await f.desktop(f.repo);
  const tool = cwd => JSON.stringify({ type: "response_item", timestamp: "2026-11-05T08:22:53.505Z", payload: {
    type: "custom_tool_call", name: "exec", input: `const workdir=${JSON.stringify(cwd)}; await tools.exec_command({workdir,cmd:"PRIVATE COMMAND"});`
  } }) + "\n";
  await appendFile(f.rollout, tool(f.repo) + tool(worktree));
  const result = await f.repository.read(id, signal());
  assert.equal(result.snapshot.directory, f.repo); assert.equal(result.snapshot.git.branch, "feat/workspace");
  assert.equal(result.snapshot.toolActivity.recordedAt, "2026-11-05T08:22:53.505Z");
  assert.deepEqual(result.snapshot.toolActivity.directories.map(item => [item.directory, item.git.branch, item.git.worktree]), [[worktree, "feat/core-http-agent", true]]);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|cmd|input|developer_instructions/);
  assert.equal(currentWorkspace(result.snapshot).directory, worktree);
  assert.equal(currentWorkspace(result.snapshot).git.branch, "feat/core-http-agent");
  await appendFile(f.rollout, JSON.stringify({ type: "response_item", timestamp: "2026-11-05T09:00:00Z", payload: {
    type: "custom_tool_call", name: "exec", input: `const paths=${JSON.stringify([f.repo, worktree])}; await Promise.allSettled(paths.map(async workdir => { return await tools.exec_command({workdir,cmd:"PRIVATE COMMAND"}); }));`
  } }) + "\n");
  const updated = (await f.repository.read(id, signal())).snapshot.toolActivity;
  assert.equal(updated.recordedAt, "2026-11-05T09:00:00Z");
  assert.deepEqual(updated.directories.map(item => item.directory), [f.repo, worktree]);
  assert.equal(currentWorkspace((await f.repository.read(id, signal())).snapshot), null);
  for (const payload of [
    { type: "function_call", name: "exec_command", arguments: JSON.stringify({ cmd: "pwd" }) },
    { type: "custom_tool_call", name: "exec", input: 'await tools.exec_command({cmd:"pwd"});' }
  ]) {
    await appendFile(f.rollout, tool(worktree) + JSON.stringify({ type: "response_item", timestamp: "2026-11-05T10:00:00Z", payload }) + "\n");
    const fallback = (await f.repository.read(id, signal())).snapshot;
    assert.deepEqual(fallback.toolActivity.directories, []);
    assert.equal(currentWorkspace(fallback).directory, f.repo); assert.equal(currentWorkspace(fallback).git.branch, "feat/workspace");
  }
});

test("metadata refreshes after append, ignores unfinished records and preserves the selected source on missing directories", async t => {
  const f = await fixture(t); assert.equal((await f.repository.read(id, signal())).snapshot.lastExecution.turnId, "turn-1");
  await appendFile(f.rollout, context(f.repo, "turn-2").trimEnd());
  assert.equal((await f.repository.read(id, signal())).snapshot.lastExecution.turnId, "turn-1");
  await appendFile(f.rollout, "\n"); assert.equal((await f.repository.read(id, signal())).snapshot.lastExecution.turnId, "turn-2");
  await f.desktop(join(f.root, "deleted")); assert.equal((await f.repository.read(id, signal())).status, "directory-missing");
});

test("missing or oversized metadata is explicitly catalog-only, and external rollout symlinks are rejected", async t => {
  const f = await fixture(t); await writeFile(f.rollout, context(f.repo) + JSON.stringify({ type: "response_item", payload: "x".repeat(8 * 1024 * 1024) }) + "\n");
  assert.equal((await f.repository.read(id, signal())).snapshot.source, "catalog");
  const outside = join(f.root, `outside-${id}.jsonl`); await writeFile(outside, context("/wrong")); await rm(f.rollout); await symlink(outside, f.rollout);
  assert.equal((await f.repository.read(id, signal())).snapshot.source, "catalog");
});

test("Git is read from the selected worktree, including detached HEAD and nested directories", async t => {
  const f = await fixture(t), worktree = join(f.root, "worktree"); await f.git("worktree", "add", "--detach", worktree);
  const nested = join(worktree, "packages", "app"); await mkdir(nested, { recursive: true }); await appendFile(f.rollout, context(nested));
  const result = await f.repository.read(id, signal()); assert.equal(result.snapshot.git.root, worktree); assert.equal(result.snapshot.git.worktree, true);
  assert.equal(result.snapshot.git.branch, null); assert.match(result.snapshot.git.commit, /^[a-f0-9]{40,64}$/u);
});

test("invalid and aborted requests fail closed and the service exposes only a read method", async t => {
  const f = await fixture(t); await assert.rejects(f.repository.read("../invalid", signal()), /Invalid session/);
  const abort = new AbortController(); abort.abort(); await assert.rejects(f.repository.read(id, abort.signal));
  const handlers = new Map(); activate({ rpc: { handle: (name, handler) => handlers.set(name, handler) } });
  assert.deepEqual([...handlers.keys()], ["workspace.read"]);
  await assert.rejects(handlers.get("workspace.read")({ directory: f.repo }, { signal: signal() }), /Invalid session/);
});
