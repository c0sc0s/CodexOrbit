import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const temporary = await mkdtemp(join(tmpdir(), "codex-tags-package-"));
try {
  const orbit = JSON.parse((await run("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: resolve("packages/orbit") })).stdout)[0];
  const { stdout } = await run("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: resolve("packages/orbit-tags"), maxBuffer: 8 * 1024 * 1024 });
  const [packed] = JSON.parse(stdout);
  const paths = packed.files.map(({ path }) => path);
  for (const path of ["bin/codex-tags.mjs", "dist/scripts/health.js", "dist/scripts/cli-options.js", "dist/scripts/lifecycle-lock.js", "runtime/dist/injected.js", "hooks/hooks.json", "skills/doctor/SKILL.md", "skills/initial/SKILL.md", "skills/rename/SKILL.md"]) assert.ok(paths.includes(path), `Missing package payload: ${path}`);
  assert.ok(!paths.some((path) => /(?:^|\/)(?:node_modules|\.git|previews)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:log|sqlite|pid|tgz)$/u.test(path)));
  const consumer = join(temporary, "consumer");
  await run("npm", ["install", "--prefix", consumer, "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", join(temporary, orbit.filename), join(temporary, packed.filename)], { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  const packageRoot = join(consumer, "node_modules", "@c0sc0s", "orbit-tags");
  const executable = join(packageRoot, "bin", "codex-tags.mjs");
  await run(process.execPath, ["--input-type=module", "-e", `
    import { readNamingContext } from ${JSON.stringify(pathToFileURL(join(packageRoot, "hooks", "session-naming.mjs")).href)};
    if (typeof readNamingContext !== 'function') throw new Error('Missing hook API');
  `], { timeout: 5000 });
  const help = await run(process.execPath, [executable, "--help"]);
  assert.match(help.stdout, /install/u);
  await assert.rejects(run(process.execPath, [executable, "off", "--purge"]));
  const { createManager } = await import(pathToFileURL(join(packageRoot, "dist", "scripts", "manager-core.js")).href);
  const manager = createManager({
    packageRoot, home: temporary, installRoot: join(temporary, "runtime"),
    applicationsRoot: join(temporary, "Applications"), platformRoot: join(temporary, "orbit"), platform: "darwin", manageExtensions: false,
    run: async (file, args) => {
      assert.equal(file, process.execPath);
      assert.equal(args[1], "--help", "Package smoke must not invoke real app lifecycle commands");
      return { stdout: "", stderr: "" };
    },
  });
  await manager.installRuntime();
  const config = JSON.parse(await readFile(join(manager.paths.platformRoot, "loader.json"), "utf8"));
  const payload = join(manager.paths.platformRoot, config.orbit.packages["orbit-tags"].path);
  await import(pathToFileURL(join(payload, "dist/runtime/src/host/target-registry.js")).href);
  await import(pathToFileURL(join(payload, "node_modules", "@c0sc0s", "orbit", "dist", "index.js")).href);
  const { SessionSearchIndex } = await import(pathToFileURL(join(payload, "dist/runtime/src/service/search/search-index.js")).href);
  const index = new SessionSearchIndex(join(temporary, "probe.sqlite"));
  assert.equal(index.status().indexedSessions, 0);
  index.close();
  await access(join(payload, "dist", "scripts", "health.js"));
  const hook = JSON.parse((await run(process.execPath, [join(payload, "hooks", "session-naming.mjs"), "--context"], { env: { ...process.env, CODEX_TAGS_SETTINGS_PATH: join(temporary, "absent-settings.json") } })).stdout);
  assert.deepEqual(hook.tags.map(({ name }) => name), ["Feature", "Bug", "Design", "Research"]);
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  if (process.platform === "darwin") {
    const orbitRoot = join(consumer, "node_modules/@c0sc0s/orbit");
    const { createInstallationManager } = await import(pathToFileURL(join(orbitRoot, "dist/installation/manager.js")));
    const { findCodexApp } = await import(pathToFileURL(join(orbitRoot, "dist/platform/codex-process.js")));
    const app = findCodexApp();
    if (app) {
    const cli = join(app.appPath, "Contents/Resources/codex");
    const codexHome = join(temporary, "codex-home");
    await mkdir(codexHome);
    const isolatedRun = (file, args, options) => run(file, args, { ...options,
      env: { ...process.env, ...options?.env, CODEX_HOME: codexHome },
    });
    const platform = createInstallationManager({ home: temporary, root: join(temporary, "fresh-orbit"),
      applicationsRoot: join(temporary, "fresh-applications"), codexBinary: cli, run: isolatedRun,
    });
    await platform.install();
    assert.deepEqual((await platform.read()).plugins, []);
    await platform.addPlugin(packageRoot);
    let registered = JSON.parse((await isolatedRun(cli, ["plugin", "list", "--json"])).stdout);
    assert.ok(registered.installed.some(plugin => plugin.pluginId === "codex-tags@codex-tags-cli"));
    await platform.setEnabled("orbit-tags", false);
    await platform.setEnabled("orbit-tags", true);
    await platform.uninstallPlugin("orbit-tags");
    const oldRoot = join(platform.paths.root, "marketplaces/codex-tags");
    await mkdir(join(oldRoot, ".agents/plugins"), { recursive: true });
    await writeFile(join(oldRoot, ".agents/plugins/marketplace.json"), JSON.stringify({ name: "codex-tags-cli", plugins: [] }));
    await isolatedRun(cli, ["plugin", "marketplace", "add", oldRoot, "--json"]);
    await rm(oldRoot, { recursive: true });
    await platform.addPlugin(packageRoot);
    registered = JSON.parse((await isolatedRun(cli, ["plugin", "marketplace", "list", "--json"])).stdout);
    assert.equal(registered.marketplaces.find(market => market.name === "codex-tags-cli").root,
      join(platform.paths.root, "marketplaces/orbit-tags"));
    await platform.uninstallPlugin("orbit-tags");
    console.log("Real official CLI onboarding passed: isolated Codex home, empty Orbit, Tags add/disable/enable/uninstall and stale-marketplace recovery.");
    } else {
      console.log("Real official CLI onboarding skipped: Codex desktop is not installed on this host.");
    }
  }
  console.log(`Package smoke passed: ${manifest.name}@${manifest.version}; hoisted dependencies, standalone runtime, plugin payload, native SQLite, CLI validation.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
