import assert from "node:assert/strict";
import test from "node:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { findCodexCli } from "../../dist/platform/codex-cli.js";
import { createCodexExtensionManager } from "../../dist/plugins/codex-extension.js";

for (const layout of ["nested", "legacy", "both", "missing", "invalid"]) {
  test(`bundled Codex CLI discovery: ${layout}`, async t => {
    const root = await mkdtemp(join(tmpdir(), "orbit-codex-cli-"));
    t.after(() => rm(root, { recursive: true, force: true }));
    const appPath = join(root, "Codex.app");
    const nested = join(appPath, "Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex");
    const legacy = join(appPath, "Contents/Resources/codex");
    async function executable(path) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    }
    if (["nested", "both", "invalid"].includes(layout)) await executable(nested);
    if (["legacy", "both", "invalid"].includes(layout)) await executable(legacy);
    if (layout === "invalid") {
      await chmod(nested, 0o644);
      assert.equal(findCodexCli(appPath), legacy);
      await rm(nested);
      await mkdir(nested);
      assert.equal(findCodexCli(appPath), legacy);
      await chmod(legacy, 0o644);
    }
    assert.equal(findCodexCli(appPath),
      layout === "nested" || layout === "both" ? nested : layout === "legacy" ? legacy : null);
  });
}

test("official extension commands preserve an explicit CLI override", async () => {
  const manager = createCodexExtensionManager("/fixture/orbit", async (file, args) => {
    assert.equal(file, "/fixture/custom-codex");
    assert.deepEqual(args, ["plugin", "list", "--json"]);
    return { stdout: '{"installed":[]}', stderr: "" };
  }, "/fixture/custom-codex");
  assert.equal((await manager.command(["plugin", "list", "--json"])).stdout, '{"installed":[]}');
});
