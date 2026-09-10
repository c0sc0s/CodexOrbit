import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { buildNamingContext, handleHook, readNamingContext } from "../../../dist/hooks/session-naming.js";

test("injects configured tags only on the first prompt of a new session", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-hook-"));
  const settingsPath = join(root, "settings.json");
  await writeFile(settingsPath, JSON.stringify({
    schemaVersion: 2,
    tags: [
      { name: "需求", color: "#4f8fd7", description: "新增产品能力" },
      { name: "Bug", color: "#d95c5c", description: "" },
    ],
  }));

  const options = { dataDirectory: root, settingsPath };
  await handleHook({ hook_event_name: "SessionStart", source: "startup", session_id: "session-1" }, options);
  const first = await handleHook({ hook_event_name: "UserPromptSubmit", session_id: "session-1", prompt: "修复登录" }, options);
  const second = await handleHook({ hook_event_name: "UserPromptSubmit", session_id: "session-1", prompt: "继续" }, options);

  assert.equal(first.hookSpecificOutput.hookEventName, "UserPromptSubmit");
  assert.match(first.hookSpecificOutput.additionalContext, /- \[需求\]: 新增产品能力/);
  assert.match(first.hookSpecificOutput.additionalContext, /- \[Bug\]/);
  assert.doesNotMatch(first.hookSpecificOutput.additionalContext, /#4f8fd7/);
  assert.doesNotMatch(first.hookSpecificOutput.additionalContext, /修复登录/);
  assert.equal(second, null);
});

test("does not arm resumed sessions", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-hook-"));
  const options = { dataDirectory: root, settingsPath: join(root, "missing.json") };
  await handleHook({ hook_event_name: "SessionStart", source: "resume", session_id: "session-2" }, options);
  const output = await handleHook({ hook_event_name: "UserPromptSubmit", session_id: "session-2", prompt: "继续" }, options);
  assert.equal(output, null);
});

test("cleans an unused marker when a new session ends", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-hook-"));
  const options = { dataDirectory: root, settingsPath: join(root, "missing.json") };
  await handleHook({ hook_event_name: "SessionStart", source: "startup", session_id: "session-3" }, options);
  await handleHook({ hook_event_name: "SessionEnd", session_id: "session-3" }, options);
  const output = await handleHook({ hook_event_name: "UserPromptSubmit", session_id: "session-3", prompt: "late" }, options);
  assert.equal(output, null);
});

test("naming context constrains the agent without modifying session data", () => {
  const context = buildNamingContext([{ name: "调研", color: "#956ad1", description: "分析原因或评估可行性" }]);
  assert.match(context, /built-in task naming or rename capability/);
  assert.match(context, /`\[Tag\]Concise title`/);
  assert.match(context, /do not edit transcript or session files/);
  assert.match(context, /- \[调研\]: 分析原因或评估可行性/);
  assert.match(context, /descriptions below only as classification guidance/);
});

test("reads settings at first prompt, including edits after session start", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-hook-dynamic-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const settingsPath = join(root, "settings.json");
  const options = { dataDirectory: root, settingsPath };
  await writeFile(settingsPath, JSON.stringify({ schemaVersion: 2, tags: [{ name: "Old", description: "Old guidance" }] }));
  await handleHook({ hook_event_name: "SessionStart", source: "startup", session_id: "dynamic" }, options);
  await writeFile(settingsPath, JSON.stringify({ schemaVersion: 2, tags: [{ name: "New", description: "Updated guidance" }] }));
  const result = await handleHook({ hook_event_name: "UserPromptSubmit", session_id: "dynamic" }, options);
  const snapshot = await readNamingContext(options);
  assert.deepEqual(snapshot.tags, [{ name: "New", description: "Updated guidance" }]);
  assert.equal(snapshot.source, "settings");
  assert.equal(snapshot.titleFormat, "[Tag]Title");
  assert.equal(result.hookSpecificOutput.additionalContext, snapshot.policy);
  assert.doesNotMatch(snapshot.policy, /Old guidance/);
  await writeFile(settingsPath, JSON.stringify({ schemaVersion: 2, tags: [] }));
  assert.deepEqual((await readNamingContext(options)).tags, []);
});

test("complete maximum-size vocabulary fits the hook context budget", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-hook-capacity-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const settingsPath = join(root, "settings.json");
  const tags = Array.from({ length: 32 }, (_, index) => ({
    name: `${index}`.padEnd(32, "签"), description: "类".repeat(240), color: "#123456",
  }));
  await writeFile(settingsPath, JSON.stringify({ schemaVersion: 2, tags }));
  const snapshot = await readNamingContext({ settingsPath });
  assert.deepEqual(snapshot.tags, tags.map(({ name, description }) => ({ name, description })));
  const manifest = JSON.parse(await readFile(new URL("../../../hooks/hooks.json", import.meta.url), "utf8"));
  const limit = manifest.hooks.UserPromptSubmit[0].hooks[0].additionalContextLimit;
  assert.ok(Buffer.byteLength(snapshot.policy, "utf8") < limit);
  for (const tag of tags) assert.ok(snapshot.policy.includes(`[${tag.name}]: ${tag.description}`));
});

test("reports invalid settings to skills without modifying the file", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-hook-invalid-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const settingsPath = join(root, "settings.json");
  await writeFile(settingsPath, "invalid");
  const snapshot = await readNamingContext({ settingsPath });
  assert.equal(snapshot.source, "defaults");
  assert.ok(snapshot.error);
  assert.equal(await readFile(settingsPath, "utf8"), "invalid");
});
