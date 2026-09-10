import assert from "node:assert/strict";
import test from "node:test";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";
import { createManager } from "../../../dist/scripts/manager-core.js";
import { createInstallationManager } from "@c0sc0s/orbit/installation";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
async function setup(t, manageExtensions = false) {
  const home = await mkdtemp(join(tmpdir(), "orbit-tags-platform-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  let marketplace = null, installed = false;
  const calls = [];
  const options = { home, packageRoot, installRoot: join(home, "data"), platformRoot: join(home, "orbit"),
    platform: "darwin", codexBinary: "/fake/codex", manageExtensions,
    run: async (file, args) => {
      calls.push([file, ...args]);
      if (args[1] === "--help") return { stdout: "Orbit", stderr: "" };
      if (file !== "/fake/codex") throw new Error("No real app lifecycle operations in fixtures");
      if (args[0] === "plugin" && args[1] === "list") return { stdout: JSON.stringify({ installed: installed ? [{ pluginId: "codex-tags@codex-tags-cli" }] : [] }), stderr: "" };
      if (args[1] === "marketplace") {
        if (args[2] === "list") return { stdout: JSON.stringify({ marketplaces: marketplace ? [{ name: "codex-tags-cli", root: marketplace }] : [] }), stderr: "" };
        if (args[2] === "add") marketplace = args[3];
        if (args[2] === "remove") marketplace = null;
      } else if (args[1] === "add") installed = true;
      else if (args[1] === "remove") installed = false;
      return { stdout: "{}", stderr: "" };
    },
  };
  return { home, options, calls, manager: createManager(options), platform: createInstallationManager({ ...options, root: options.platformRoot, packageRoot: undefined }) };
}

test("Tags registers through Orbit and uninstall preserves the platform and settings", async t => {
  const { manager, platform } = await setup(t);
  await manager.installRuntime();
  const before = await platform.read();
  assert.equal(before.plugins[0].id, "orbit-tags");
  assert.match(before.plugins[0].service, /dist\/runtime\/src\/service\/activate.js$/);
  const settings = join(manager.paths.installRoot, "settings.json");
  await writeFile(settings, '{"schemaVersion":2,"tags":[]}');
  await manager.disable();
  assert.equal((await platform.read()).plugins[0].enabled, false);
  await manager.uninstall();
  const after = await platform.read();
  assert.deepEqual(after.plugins, []);
  assert.deepEqual(after.orbit.runtime, before.orbit.runtime);
  await access(manager.paths.launcherPath);
  assert.equal(await readFile(settings, "utf8"), '{"schemaVersion":2,"tags":[]}');
});

test("Orbit owns official naming-extension registration and removal", async t => {
  const { manager, calls } = await setup(t, true);
  await manager.installRuntime();
  await access(join(manager.paths.marketplacePluginRoot, "hooks/session-naming.mjs"));
  await access(join(manager.paths.marketplacePluginRoot, "orbit-installation.json"));
  assert.ok(calls.some(call => call[0] === "/fake/codex" && call[2] === "add"));
  await manager.disable();
  assert.ok(calls.some(call => call[0] === "/fake/codex" && call[2] === "remove"));
});

test("Tags cannot recursively purge a migrated external data directory", async t => {
  const { manager, platform } = await setup(t);
  await manager.installRuntime();
  await assert.rejects(manager.uninstall({ purge: true }), /external data/);
  assert.equal((await platform.read()).plugins.length, 1);
});

test("package keeps public compatibility aliases while declaring an Orbit plugin", async () => {
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  const plugin = JSON.parse(await readFile(join(packageRoot, "orbit-plugin.json"), "utf8"));
  assert.equal(manifest.bin["codex-tags"], "bin/codex-tags.mjs");
  assert.equal(manifest.bin["orbit-tags"], manifest.bin["codex-tags"]);
  assert.equal(plugin.id, "orbit-tags");
  assert.equal(plugin.version, manifest.version);
});

test("installed naming hooks read the platform-assigned data directory", async t => {
  const { manager, platform } = await setup(t);
  await manager.installRuntime();
  const record = (await platform.read()).orbit.packages["orbit-tags"];
  await writeFile(join(record.dataDirectory, "settings.json"), JSON.stringify({ schemaVersion: 2, tags: [{ name: "Example", color: "#123456", description: "Example work" }] }));
  const hook = await import(pathToFileURL(join(platform.paths.root, record.path, "hooks/session-naming.mjs")));
  const context = await hook.readNamingContext();
  assert.equal(context.settingsPath, join(record.dataDirectory, "settings.json"));
  assert.equal(context.tags[0].name, "Example");
});

test("a foreign marketplace is never removed during failed registration recovery", async t => {
  const { options, platform } = await setup(t, true);
  const mutations = [];
  const manager = createManager({ ...options, run: async (file, args, settings) => {
    if (args[0] === "plugin" && args[1] === "marketplace" && args[2] === "list") return { stdout: JSON.stringify({ marketplaces: [{ name: "codex-tags-cli", root: "/another-owner" }] }), stderr: "" };
    if (args.includes("remove")) mutations.push(args);
    return options.run(file, args, settings);
  } });
  await assert.rejects(manager.installRuntime(), /registered elsewhere|another installation/);
  assert.deepEqual(mutations, []);
  assert.deepEqual((await platform.read()).plugins, []);
});
