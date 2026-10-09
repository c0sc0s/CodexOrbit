import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInstallationManager } from "@c0sc0s/orbit/installation";

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("Orbit registers orbit-blur as a renderer-only plugin", async (t) => {
  const home = await mkdtemp(join(tmpdir(), "orbit-blur-register-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const manager = createInstallationManager({
    home,
    root: join(home, "orbit"),
    platform: "darwin",
    run: async (file, args) => {
      if (args[1] !== "--help") throw new Error("Fixture must not start real Codex");
      return { stdout: "Orbit", stderr: "" };
    },
  });
  await manager.install();
  const result = await manager.addPlugin(packageRoot);
  assert.equal(result.status, "registered");
  assert.equal(result.id, "orbit-blur");
  const config = await manager.read();
  const entry = config.plugins.find((plugin) => plugin.id === "orbit-blur");
  assert.ok(entry);
  assert.equal(entry.enabled, true);
  assert.match(entry.entry, /runtime\/dist\/injected\.js$/);
  assert.equal(entry.service, undefined);
});
