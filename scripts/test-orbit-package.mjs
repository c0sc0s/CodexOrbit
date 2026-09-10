import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const run = promisify(execFile);
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const temporary = await mkdtemp(join(tmpdir(), "codex-loader-package-"));
try {
  const { stdout } = await run("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: resolve("packages/orbit") });
  const [packed] = JSON.parse(stdout);
  assert.ok(packed.files.some(({ path }) => path === "examples/hello.js"));
  assert.ok(packed.files.some(({ path }) => path === "dist/index.d.ts"));
  assert.ok(packed.files.some(({ path }) => path === "dist/cli.js"));
  assert.ok(packed.files.some(({ path }) => path === "assets/icon.icns"));
  assert.ok(!packed.files.some(({ path }) => path.startsWith("src/")));
  assert.ok(!packed.files.some(({ path }) => /tag-settings|search-index|sqlite|controller|\.loader-|module-data/.test(path)));
  const consumer = join(temporary, "consumer");
  await run("npm", ["install", "--prefix", consumer, "--ignore-scripts", "--no-audit", "--no-fund", join(temporary, packed.filename)]);
  await run(process.execPath, ["--input-type=module", "-e", `
    import assert from 'node:assert/strict';
    import { PluginHost, CdpClient, createLauncher } from '@c0sc0s/orbit';
    import { readManifest } from '@c0sc0s/orbit/manifest';
    import { daemonStatus } from '@c0sc0s/orbit/daemon';
    for (const value of [PluginHost, CdpClient, createLauncher, readManifest, daemonStatus]) assert.equal(typeof value, 'function');
    assert.ok(import.meta.resolve('@c0sc0s/orbit/cli').endsWith('/dist/cli.js'));
    await assert.rejects(import('@c0sc0s/orbit/dist/host.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
  `], { cwd: consumer });
  const packageRoot = join(consumer, "node_modules", "@c0sc0s", "orbit");
  const { createInstallationManager } = await import(pathToFileURL(join(packageRoot, "dist/installation/manager.js")));
  const platform = createInstallationManager({ home: temporary, root: join(temporary, "platform"), platform: "darwin",
    run: async (file, args, options) => {
      assert.equal(file, process.execPath);
      assert.equal(args[1], "--help", "Standalone platform smoke never launches Codex");
      return run(file, args, options);
    },
  });
  await platform.install();
  assert.deepEqual((await platform.read()).plugins, []);
  await access(platform.paths.launcherPath);
  await access(join(platform.paths.launcherPath, "Contents/Resources/icon.icns"));
  const platformStatus = await run(process.execPath, [join(platform.paths.root, "orbit.mjs"), "status"], { env: { ...process.env, ORBIT_HOME: platform.paths.root } });
  assert.equal(JSON.parse(platformStatus.stdout).installed, true);
  const { stdout: help } = await run(process.execPath, [join(packageRoot, "dist", "cli.js"), "--help"]);
  assert.match(help, /start\|apply\|watch\|status\|remove\|stop/);
  await assert.rejects(run(process.execPath, [join(packageRoot, "dist", "cli.js"), "apply"]));
  const api = await import(pathToFileURL(join(packageRoot, "dist", "index.js")));
  const { readPlugins } = await import(pathToFileURL(join(packageRoot, "dist", "config", "manifest.js")));
  const [plugin] = await readPlugins(join(packageRoot, "examples", "loader.json"));
  let mounted = false;
  const context = vm.createContext({ window: {}, AbortController, setTimeout, clearTimeout, document: {
    createElement: () => ({ style: {}, get isConnected() { return mounted; }, remove() { mounted = false; } }),
    body: { append() { mounted = true; } },
  } });
  await vm.runInContext(plugin.expression, context);
  assert.equal(mounted, true);
  await vm.runInContext(api.buildPluginRemovalExpression("hello"), context);
  assert.equal(mounted, false);
  const { ServiceProcess } = await import(pathToFileURL(join(packageRoot, "dist", "service", "process.js")));
  const service = new ServiceProcess({ entry: join(packageRoot, "examples/service.mjs"), id: "packed", stateDirectory: temporary });
  try {
    await service.ready;
    assert.equal(await service.request("call", { method: "greeting" }), "Hello from packed");
  } finally { await service.close(); }
  console.log("Loader package smoke passed: standalone tarball, CLI, local manifest, activation, isolated service RPC and cleanup without Tags.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
