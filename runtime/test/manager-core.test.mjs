import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { RUNTIME_VERSION } from "../src/tags-plugin.mjs";
import { createManager } from "../../scripts/manager-core.mjs";

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("installer creates a self-contained runtime and local Codex marketplace", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-manager-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const calls = [];
  let pluginInstalled = false;
  let marketplaceRegistered = false;
  const run = async (_file, args) => {
    calls.push(args);
    if (_file === "/bin/launchctl" && args[0] === "print") throw Object.assign(new Error("not loaded"), { code: 113 });
    if (args[0]?.endsWith("app.mjs")) {
      if (args[1] === "status") return { stdout: JSON.stringify({ cdp: false, activeVersions: [] }), stderr: "" };
      return { stdout: "ok", stderr: "" };
    }
    if (args[0] === "plugin" && args[1] === "list") {
      return {
        stdout: JSON.stringify({
          installed: pluginInstalled ? [{ pluginId: "codex-tags@codex-tags-cli", enabled: true, version: "0.5.0+codex.20260907144500", source: { path: manager.paths.marketplacePluginRoot } }] : [],
        }),
        stderr: "",
      };
    }
    if (args[0] === "plugin" && args[1] === "marketplace" && args[2] === "list") {
      return { stdout: JSON.stringify({ marketplaces: marketplaceRegistered ? [{ name: "codex-tags-cli", root: join(root, "state", "plugin-marketplace") }] : [] }), stderr: "" };
    }
    if (args[0] === "plugin" && args[1] === "marketplace" && args[2] === "add") marketplaceRegistered = true;
    if (args[0] === "plugin" && args[1] === "add") pluginInstalled = true;
    if (args[0] === "plugin" && args[1] === "remove") pluginInstalled = false;
    return { stdout: "{}", stderr: "" };
  };
  const manager = createManager({
    home: root,
    packageRoot,
    installRoot: join(root, "state"),
    applicationsRoot: join(root, "applications"),
    launchAgentsRoot: join(root, "LaunchAgents"),
    platform: "darwin",
    codexBinary: process.execPath,
    findApp: () => ({ appPath: "/Applications/Test.app" }),
    healthTimeoutMs: 0,
    run,
  });

  const installation = await manager.installRuntime();
  assert.equal(installation.status, "installed");
  const installedState = await manager.status();
  assert.equal(installedState.supervisor.installed, false);
  assert.equal(installedState.supervisor.loaded, false);
  await access(join(manager.paths.installRoot, "app.mjs"));
  await assert.rejects(access(join(manager.paths.installRoot, "launch-supervisor.mjs")));
  await access(join(manager.paths.marketplacePluginRoot, "hooks", "hooks.json"));
  const skillsRoot = join(manager.paths.marketplacePluginRoot, "skills");
  const skillNames = [];
  for (const name of await readdir(skillsRoot)) {
    try { await access(join(skillsRoot, name, "SKILL.md")); skillNames.push(name); } catch {}
  }
  assert.deepEqual(skillNames.sort(), ["doctor", "initial", "rename"]);
  const settingsPath = join(root, "skill-settings.json");
  await writeFile(settingsPath, JSON.stringify({ schemaVersion: 2, tags: [{ name: "Example", description: "Example tasks" }] }));
  const { stdout: namingJson } = await promisify(execFile)(process.execPath, [
    join(manager.paths.marketplacePluginRoot, "hooks", "session-naming.mjs"), "--context",
  ], { env: { ...process.env, CODEX_TAGS_SETTINGS_PATH: settingsPath } });
  assert.deepEqual(JSON.parse(namingJson).tags, [{ name: "Example", description: "Example tasks" }]);
  const launcher = await readFile(join(manager.paths.launcherPath, "Contents", "MacOS", "codex-plugin-loader"), "utf8");
  assert.match(launcher, /plugin-loader\/cli\.mjs/u);
  assert.match(launcher, /loader\.json/u);
  assert.doesNotMatch(launcher, /app\.mjs/u);
  const loaderConfig = JSON.parse(await readFile(join(manager.paths.installRoot, "loader.json"), "utf8"));
  assert.deepEqual(loaderConfig.plugins, [{ id: "codex-tags", entry: "dist/injected.js", service: "tags-service.mjs", version: RUNTIME_VERSION, config: { dataDirectory: manager.paths.installRoot } }]);
  const marketplace = JSON.parse(await readFile(join(manager.paths.marketplaceRoot, ".agents", "plugins", "marketplace.json"), "utf8"));
  assert.equal(marketplace.name, "codex-tags-cli");
  assert.equal(marketplace.plugins[0].name, "codex-tags");

  const firstPlugin = await manager.installCodexPlugin();
  assert.equal(firstPlugin.installed, true);
  await manager.installCodexPlugin();
  assert.equal(calls.filter((args) => args[0] === "plugin" && args[1] === "marketplace" && args[2] === "add").length, 1);
  assert.equal(calls.filter((args) => args[0] === "plugin" && args[1] === "add").length, 2);

  await writeFile(join(manager.paths.installRoot, "settings.json"), "{}\n");
  const incomplete = await manager.enable();
  assert.equal(incomplete.status, "incomplete");
  assert.equal(incomplete.health.ok, false);
  assert.equal(calls.some((args) => args[0] === "bootstrap"), false);
  await access(join(manager.paths.launcherPath, "Contents", "Resources", "icon.icns"));
  const disabled = await manager.disable();
  assert.equal(disabled.status, "disabled");
  await access(join(manager.paths.installRoot, "settings.json"));
  const removed = await manager.uninstall();
  assert.equal(removed.settingsPreserved, true);
  await access(join(manager.paths.installRoot, "settings.json"));
  await assert.rejects(access(join(manager.paths.installRoot, "app.mjs")));
  await manager.uninstall({ purge: true });
  await assert.rejects(access(join(manager.paths.installRoot, "settings.json")));
});

test("package exposes the public codex-tags executable", async () => {
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  assert.equal(manifest.private, undefined);
  assert.equal(manifest.bin["codex-tags"], "bin/codex-tags.mjs");
  assert.equal(manifest.publishConfig.access, "public");
});

test("removes the legacy launch supervisor without registering a replacement", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "codex-tags-launch-agent-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  let loaded = true;
  const run = async (file, args) => {
    assert.equal(file, "/bin/launchctl");
    assert.notEqual(args[0], "bootstrap");
    if (args[0] === "bootout") loaded = false;
    if (args[0] === "print") {
      if (!loaded) throw Object.assign(new Error("not loaded"), { code: 113 });
      return { stdout: "pid = 1234\n", stderr: "" };
    }
    return { stdout: "", stderr: "" };
  };
  const manager = createManager({
    packageRoot,
    installRoot: join(root, "state"),
    applicationsRoot: join(root, "applications"),
    launchAgentsRoot: join(root, "LaunchAgents"),
    platform: "darwin",
    userId: 501,
    run,
  });

  await mkdir(dirname(manager.paths.launchAgentPath), { recursive: true });
  await mkdir(manager.paths.installRoot, { recursive: true });
  await writeFile(manager.paths.launchAgentPath, "legacy");
  await writeFile(join(manager.paths.installRoot, "launch-supervisor.mjs"), "legacy");

  const removed = await manager.removeLaunchSupervisor();
  assert.equal(removed.installed, false);
  assert.equal(loaded, false);
  await assert.rejects(access(join(manager.paths.installRoot, "launch-supervisor.mjs")));
  await assert.rejects(access(manager.paths.launchAgentPath));
});
