import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { SettingsRepository } from "../src/settings-repository.mjs";

test("reads fallback settings and atomically persists normalized definitions", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-settings-"));
  const path = join(root, "settings.json");
  try {
    const repository = new SettingsRepository(path, { fallback: [{ name: "Bug", color: "#d95c5c", description: "错误" }] });
    const initial = await repository.read();
    assert.equal(initial.exists, false);
    assert.equal(initial.settings.tags[0].name, "Bug");

    const first = await repository.write([{ name: " Review ", color: "#123456", description: "  人工   复核 " }]);
    assert.equal(first.changed, true);
    assert.deepEqual(first.settings.tags, [{ name: "Review", color: "#123456", description: "人工 复核" }]);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), first.settings);
    assert.equal((await repository.write(first.settings.tags)).changed, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("reports invalid settings without throwing or replacing user data", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-settings-invalid-"));
  const path = join(root, "settings.json");
  try {
    await writeFile(path, "not-json", "utf8");
    const repository = new SettingsRepository(path, { fallback: [] });
    const result = await repository.read();
    assert.equal(result.exists, false);
    assert.match(result.error, /Unable to read tag settings/u);
    assert.equal(await readFile(path, "utf8"), "not-json");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("rejects unsupported settings schema versions without rewriting them", async () => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-settings-future-"));
  const path = join(root, "settings.json");
  const source = `${JSON.stringify({ schemaVersion: 99, tags: [] })}\n`;
  try {
    await writeFile(path, source, "utf8");
    const repository = new SettingsRepository(path, { fallback: [] });
    const result = await repository.read();
    assert.equal(result.exists, false);
    assert.match(result.error, /Unable to read tag settings/u);
    assert.equal(await readFile(path, "utf8"), source);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
