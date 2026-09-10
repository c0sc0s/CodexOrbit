import assert from "node:assert/strict";
import test from "node:test";
import { access, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInstallationManager } from "../../dist/installation/manager.js";
import { withInstallationLock } from "../../dist/installation/lock.js";

async function setup(t) {
  const home = await mkdtemp(join(tmpdir(), "orbit-platform-test-"));
  t.after(() => rm(home, { recursive: true, force: true }));
  const calls = [];
  const manager = createInstallationManager({ home, root: join(home, "orbit"), platform: "darwin", run: async (file, args) => {
    calls.push([file, ...args]);
    if (args[1] !== "--help") throw new Error("Fixture must not start real Codex");
    return { stdout: "Orbit", stderr: "" };
  } });
  return { home, manager, calls };
}
async function fixture(home, id, compatibility = { min: "0.4.1", maxExclusive: "1.0.0" }) {
  const source = join(home, id); await mkdir(source);
  await writeFile(join(source, "package.json"), JSON.stringify({ name: `test-${id}`, version: "1.0.0", type: "module", files: ["orbit-plugin.json", "renderer.js", "service.js"] }));
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify({ schemaVersion: 1, id, version: "1.0.0", runtimeVersion: "1.0.0", orbit: compatibility, renderer: "renderer.js", service: "service.js" }));
  await writeFile(join(source, "renderer.js"), "var CodexPlugin = { activate() { return {}; } };\n");
  await writeFile(join(source, "service.js"), "export function activate() {}\n");
  return source;
}

test("Orbit installs a zero-plugin platform and owns its launcher independently", async t => {
  const { manager } = await setup(t);
  await manager.install();
  const config = await manager.read();
  assert.deepEqual(config.plugins, []);
  assert.deepEqual(config.orbit.packages, {});
  const launcher = await readFile(join(manager.paths.launcherPath, "Contents/MacOS/codex-plugin-loader"), "utf8");
  assert.match(launcher, /orbit\.mjs/);
  assert.doesNotMatch(launcher, /codex-tags/);
  const icon = await readFile(join(manager.paths.launcherPath, "Contents/Resources/icon.icns"));
  assert.equal(icon.subarray(0, 4).toString(), "icns");
  assert.equal(icon.readUInt32BE(4), icon.length);
  assert.match(await readFile(join(manager.paths.launcherPath, "Contents/Info.plist"), "utf8"), /CFBundleIconFile<\/key><string>icon.icns/);
  await access(join(manager.paths.root, config.orbit.runtime.path, "dist/cli.js"));
});

test("two independently installed plugins retain platform, peer files and user data", async t => {
  const { home, manager } = await setup(t); await manager.install();
  const first = await fixture(home, "first"), second = await fixture(home, "second");
  await manager.addPlugin(first); await manager.addPlugin(second);
  const before = await manager.read();
  const data = join(before.orbit.packages.first.dataDirectory, "settings.json");
  await writeFile(data, "private settings");
  await manager.setEnabled("first", false);
  let config = await manager.read();
  assert.equal(config.plugins.find(p => p.id === "first").enabled, false);
  assert.equal(config.plugins.find(p => p.id === "second").enabled, true);
  await manager.uninstallPlugin("first"); config = await manager.read();
  assert.deepEqual(config.orbit.runtime, before.orbit.runtime);
  assert.equal(config.plugins.length, 1);
  await access(join(manager.paths.root, config.orbit.packages.second.path, "renderer.js"));
  await access(manager.paths.launcherPath);
  assert.equal(await readFile(data, "utf8"), "private settings");
  await manager.uninstallPlugin("second", true);
  await assert.rejects(access(before.orbit.packages.second.dataDirectory));
});

test("doctor detects a missing launcher icon and install repairs it without adding plugins", async t => {
  const { manager } = await setup(t);
  await manager.install();
  await rm(join(manager.paths.launcherPath, "Contents/Resources/icon.icns"));
  assert.equal((await manager.doctor()).checks.find(check => check.id === "launcher-icon").ok, false);
  await manager.install();
  assert.equal((await manager.doctor()).checks.find(check => check.id === "launcher-icon").ok, true);
  assert.deepEqual((await manager.read()).plugins, []);
});

test("plugin identity migration preserves data and disabled state and accepts legacy commands", async t => {
  const { home, manager } = await setup(t); await manager.install();
  const source = await fixture(home, "old-name");
  await manager.addPlugin(source);
  const before = (await manager.read()).orbit.packages["old-name"];
  await writeFile(join(before.dataDirectory, "settings.json"), "preserved");
  await manager.setEnabled("old-name", false);
  const manifest = JSON.parse(await readFile(join(source, "orbit-plugin.json"), "utf8"));
  manifest.id = "new-name"; manifest.legacyIds = ["old-name"];
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify(manifest));
  await manager.addPlugin(source);
  const after = await manager.read();
  assert.deepEqual(Object.keys(after.orbit.packages), ["new-name"]);
  assert.equal(after.plugins[0].id, "new-name");
  assert.equal(after.plugins[0].enabled, false);
  assert.equal(after.orbit.packages["new-name"].dataDirectory, before.dataDirectory);
  await manager.setEnabled("old-name", true);
  assert.equal((await manager.read()).plugins[0].enabled, true);
  await manager.uninstallPlugin("old-name");
  assert.deepEqual((await manager.read()).plugins, []);
  assert.equal(await readFile(join(before.dataDirectory, "settings.json"), "utf8"), "preserved");
});

test("legacy identities cannot claim another package or an unmanaged module", async t => {
  const { home, manager } = await setup(t); await manager.install();
  await manager.addPlugin(await fixture(home, "owner"));
  const source = await fixture(home, "claimant");
  const manifest = JSON.parse(await readFile(join(source, "orbit-plugin.json"), "utf8"));
  manifest.legacyIds = ["owner"];
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify(manifest));
  const before = await manager.read();
  await assert.rejects(manager.addPlugin(source), /another package/);
  assert.deepEqual(await manager.read(), before);
  manifest.legacyIds = ["unmanaged"];
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify(manifest));
  before.plugins.push({ id: "unmanaged", entry: "manual.js", enabled: true });
  await writeFile(manager.paths.configPath, JSON.stringify(before));
  await assert.rejects(manager.addPlugin(source), /unmanaged module/);
  assert.deepEqual(await manager.read(), before);
});

test("official extension migration restores its old marketplace when registration fails", async t => {
  const { home } = await setup(t);
  let marketplace, installed = false, failNext = false;
  const manager = createInstallationManager({ home, root: join(home, "extensions"), platform: "linux", codexBinary: "/fake/codex",
    run: async (file, args) => {
      if (file === process.execPath) return { stdout: "Orbit", stderr: "" };
      let result = {};
      if (args[1] === "marketplace") {
        if (args[2] === "list") result = { marketplaces: marketplace ? [{ name: "fixture-market", root: marketplace }] : [] };
        if (args[2] === "remove") marketplace = undefined;
        if (args[2] === "add") {
          if (failNext) { failNext = false; throw new Error("Registration failed"); }
          marketplace = args[3];
        }
      } else if (args[1] === "list") result = { installed: installed ? [{ pluginId: "fixture@fixture-market" }] : [] };
      else if (args[1] === "add") installed = true;
      else if (args[1] === "remove") installed = false;
      return { stdout: JSON.stringify(result), stderr: "" };
    },
  });
  await manager.install();
  const source = await fixture(home, "old-extension");
  await mkdir(join(source, ".codex-plugin"));
  await writeFile(join(source, ".codex-plugin/plugin.json"), JSON.stringify({ name: "fixture", version: "1.0.0" }));
  const pkg = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  pkg.files.push(".codex-plugin");
  await writeFile(join(source, "package.json"), JSON.stringify(pkg));
  const manifest = JSON.parse(await readFile(join(source, "orbit-plugin.json"), "utf8"));
  manifest.codex = { name: "fixture", marketplace: "fixture-market" };
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify(manifest));
  await manager.addPlugin(source);
  const before = await manager.read(), oldMarketplace = marketplace;
  manifest.id = "new-extension"; manifest.legacyIds = ["old-extension"];
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify(manifest));
  failNext = true;
  await assert.rejects(manager.addPlugin(source), /Registration failed/);
  assert.deepEqual(await manager.read(), before);
  assert.equal(marketplace, oldMarketplace);
  assert.equal(installed, true);
  await manager.addPlugin(source);
  assert.equal(marketplace, join(manager.paths.root, "marketplaces/new-extension"));
  assert.deepEqual(Object.keys((await manager.read()).orbit.packages), ["new-extension"]);
  assert.equal(installed, true);
});

test("incompatibility and concurrent mutation preserve authoritative configuration", async t => {
  const { home, manager } = await setup(t); await manager.install();
  const config = await readFile(manager.paths.configPath, "utf8");
  const incompatible = await fixture(home, "incompatible", { min: "9.0.0", maxExclusive: "10.0.0" });
  await assert.rejects(manager.addPlugin(incompatible), /requires Orbit/);
  assert.equal(await readFile(manager.paths.configPath, "utf8"), config);
  await withInstallationLock(manager.paths.configPath, async () => {
    await assert.rejects(manager.update(), /Another Orbit/);
  });
  assert.equal(await readFile(manager.paths.configPath, "utf8"), config);
});

test("runtime updates retain a rollback target and failed staging leaves it untouched", async t => {
  const { home, manager } = await setup(t); await manager.install();
  const first = (await manager.read()).orbit.runtime;
  await manager.update();
  const second = (await manager.read()).orbit.runtime;
  assert.notEqual(first.path, second.path);
  await manager.rollback(); assert.deepEqual((await manager.read()).orbit.runtime, first);
  const broken = join(home, "broken"); await mkdir(broken);
  await writeFile(join(broken, "package.json"), JSON.stringify({ name: "other", version: "0.4.1" }));
  await assert.rejects(manager.update(broken), /Expected a built Orbit/);
  assert.deepEqual((await manager.read()).orbit.runtime, first);
});

test("rejects symlink roots and plugin entries escaping their package", async t => {
  const { home, manager } = await setup(t); await manager.install();
  const link = join(home, "link"); await symlink(manager.paths.root, link);
  await assert.rejects(createInstallationManager({ home, root: link }).install(), /symlink/);
  const source = await fixture(home, "escape");
  await rm(join(source, "renderer.js")); await symlink(manager.paths.configPath, join(source, "renderer.js"));
  await assert.rejects(manager.addPlugin(source), /owned directory|symlink/);
});

test("failed active-runtime replacement restores configuration and restarts the previous owner", async t => {
  const { home, manager } = await setup(t); await manager.install();
  const before = await manager.read();
  let running = true;
  const starts = [];
  const replacement = createInstallationManager({ home, root: manager.paths.root, platform: "linux",
    getDaemonStatus: async () => ({ running, pid: running ? 1234 : null }),
    run: async (_file, args) => {
      if (args[1] === "stop") running = false;
      if (args[1] === "start") {
        starts.push(args[0]);
        if (!args[0].includes(before.orbit.runtime.path)) throw new Error("Candidate failed readiness");
        running = true;
      }
      return { stdout: "{}", stderr: "" };
    },
  });
  await assert.rejects(replacement.update(), /Candidate failed readiness/);
  assert.deepEqual(await replacement.read(), before);
  assert.equal(running, true);
  assert.equal(starts.length, 2);
});

test("extension recovery failure still restarts the preceding running Orbit", async t => {
  const { home, manager } = await setup(t); await manager.install();
  const before = await manager.read();
  const source = await fixture(home, "broken-extension");
  const manifest = JSON.parse(await readFile(join(source, "orbit-plugin.json"), "utf8"));
  manifest.codex = { name: "fixture", marketplace: "fixture-market" };
  await writeFile(join(source, "orbit-plugin.json"), JSON.stringify(manifest));
  let running = true, starts = 0;
  const recovery = createInstallationManager({ home, root: manager.paths.root, platform: "linux", codexBinary: "/fake/codex",
    getDaemonStatus: async () => ({ running, pid: running ? 1234 : null }),
    run: async (_file, args) => {
      if (args[0] === "plugin") throw new Error("Marketplace unavailable");
      if (args[1] === "stop") running = false;
      if (args[1] === "start") { running = true; starts++; }
      return { stdout: "{}", stderr: "" };
    },
  });
  await assert.rejects(recovery.addPlugin(source), AggregateError);
  assert.deepEqual(await manager.read(), before);
  assert.equal(running, true);
  assert.equal(starts, 1);
});
