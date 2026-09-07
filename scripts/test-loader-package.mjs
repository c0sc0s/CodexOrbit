import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import vm from "node:vm";

const run = promisify(execFile);
const temporary = await mkdtemp(join(tmpdir(), "codex-loader-package-"));
try {
  const { stdout } = await run("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: resolve("runtime/src/plugin-loader") });
  const [packed] = JSON.parse(stdout);
  assert.ok(packed.files.some(({ path }) => path === "examples/hello.js"));
  assert.ok(!packed.files.some(({ path }) => /tag-settings|search-index|sqlite|controller|\.loader-|module-data/.test(path)));
  const consumer = join(temporary, "consumer");
  await run("npm", ["install", "--prefix", consumer, "--ignore-scripts", "--no-audit", "--no-fund", join(temporary, packed.filename)]);
  const packageRoot = join(consumer, "node_modules", "@c0sc0s", "codex-plugin-loader");
  const { stdout: help } = await run(process.execPath, [join(packageRoot, "cli.mjs"), "--help"]);
  assert.match(help, /start\|apply\|watch\|status\|remove\|stop/);
  await assert.rejects(run(process.execPath, [join(packageRoot, "cli.mjs"), "apply"]));
  const api = await import(pathToFileURL(join(packageRoot, "index.mjs")));
  const { readPlugins } = await import(pathToFileURL(join(packageRoot, "manifest.mjs")));
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
  const { ServiceProcess } = await import(pathToFileURL(join(packageRoot, "service-process.mjs")));
  const service = new ServiceProcess({ entry: join(packageRoot, "examples/service.mjs"), id: "packed", stateDirectory: temporary });
  try {
    await service.ready;
    assert.equal(await service.request("call", { method: "greeting" }), "Hello from packed");
  } finally { await service.close(); }
  console.log("Loader package smoke passed: standalone tarball, CLI, local manifest, activation, isolated service RPC and cleanup without Tags.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
