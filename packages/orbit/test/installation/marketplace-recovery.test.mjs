import assert from "node:assert/strict";
import test from "node:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCodexExtensionManager } from "../../dist/plugins/codex-extension.js";

for (const scenario of ["missing-owned", "foreign", "existing-owned"]) {
  test(`marketplace recovery: ${scenario}`, async t => {
    const root = await mkdtemp(join(tmpdir(), "orbit-marketplace-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const source = join(root, "plugins/new/1");
    await mkdir(join(source, ".codex-plugin"), { recursive: true });
    await writeFile(join(source, ".codex-plugin/plugin.json"), JSON.stringify({ name: "fixture" }));
    const oldRoot = scenario === "foreign" ? join(root, "foreign") : join(root, "marketplaces/old");
    if (scenario === "existing-owned") await mkdir(oldRoot, { recursive: true });
    let broken = true;
    const mutations = [];
    const manager = createCodexExtensionManager(root, async (_file, args) => {
      if (args[1] === "marketplace" && args[2] === "list") {
        if (broken) throw Object.assign(new Error("Cannot list"), { stderr: `Error: failed to load marketplace(s):\n- \`fixture-market\` at ${oldRoot}: marketplace root does not contain a supported manifest\n` });
        return { stdout: '{"marketplaces":[]}', stderr: "" };
      }
      mutations.push(args);
      if (args[1] === "marketplace" && args[2] === "remove") broken = false;
      return { stdout: "{}", stderr: "" };
    }, "/fake/codex");
    const previous = { plugins: [], orbit: { packages: {} } };
    const next = { plugins: [{ id: "new", enabled: true }], orbit: { packages: { new: {
      path: "plugins/new/1", manifest: { legacyIds: ["old"], codex: { name: "fixture", marketplace: "fixture-market" } },
    } } } };
    if (scenario === "missing-owned") {
      await manager.reconcile(previous, next);
      assert.deepEqual(mutations[0], ["plugin", "marketplace", "remove", "fixture-market", "--json"]);
      assert.ok(mutations.some(args => args[1] === "add"));
    } else {
      await assert.rejects(manager.reconcile(previous, next), /Cannot list/);
      assert.deepEqual(mutations, []);
    }
  });
}
