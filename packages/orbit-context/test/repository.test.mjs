import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, appendFile, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ContextRepository } from "../dist/service/repository.js";

const id = "12345678-1234-1234-1234-123456789abc", signal = () => new AbortController().signal;
const record = text => JSON.stringify({ type: "response_item", payload: { type: "message", role: "user", content: [{ text }] } }) + "\n";
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "orbit-context-test-")), folder = join(root, "sessions", "2026", "10", "26");
  await mkdir(folder, { recursive: true }); t.after(() => rm(root, { recursive: true, force: true }));
  return { root, path: join(folder, `rollout-${id}.jsonl`), repository: new ContextRepository(root) };
}
test("reads active records, waits for complete lines, and refreshes a changed file", async t => {
  const { path, repository } = await fixture(t); await writeFile(path, record("first") + '{"type":');
  let result = await repository.read(id, signal()); assert.equal(result.status, "ready"); assert.equal(result.snapshot.partial, true); assert.equal(result.snapshot.entries[0].records, 1);
  await writeFile(path, record("first") + record("second")); result = await repository.read(id, signal());
  assert.equal(result.snapshot.partial, false); assert.equal(result.snapshot.entries[0].records, 2);
  assert.deepEqual(await repository.read(id, signal()), result);
});
test("does not follow symlinks or accept arbitrary paths and honors cancellation", async t => {
  const { root, path, repository } = await fixture(t); await writeFile(join(root, "outside"), record("secret")); await symlink(join(root, "outside"), path);
  assert.equal((await repository.read(id, signal())).status, "missing");
  await assert.rejects(repository.read("../outside", signal()), /Invalid session/);
  const controller = new AbortController(); controller.abort(); await assert.rejects(repository.read(id, controller.signal), { name: "AbortError" });
});
test("skips oversized and malformed lines with an explicit incomplete flag", async t => {
  const { path, repository } = await fixture(t); await writeFile(path, "x".repeat(4 * 1024 * 1024 + 10) + "\nnot-json\n" + record("retained"));
  const result = await repository.read(id, signal()); assert.equal(result.snapshot.partial, true); assert.equal(result.snapshot.entries[0].records, 1);
  await appendFile(path, record("updated")); assert.equal((await repository.read(id, signal())).snapshot.entries[0].records, 2);
});
