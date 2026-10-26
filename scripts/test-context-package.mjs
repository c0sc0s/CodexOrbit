import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, access, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { createInstallationManager } from "../packages/orbit/dist/installation/manager.js";

const run = promisify(execFile), temporary = await mkdtemp(join(tmpdir(), "orbit-context-package-"));
try {
  const packed = JSON.parse((await run("npm", ["pack", "--json", "--ignore-scripts", "--cache", join(temporary, "npm-cache"), "--pack-destination", temporary], { cwd: resolve("packages/orbit-context"), maxBuffer: 4 * 1024 * 1024 })).stdout)[0];
  const files = packed.files.map(file => file.path);
  for (const file of ["orbit-plugin.json", "runtime/injected.js", "dist/service/activate.js", "dist/service/repository.js", "dist/shared/model.js", "README.md", "LICENSE"]) assert.ok(files.includes(file), `Missing Context payload: ${file}`);
  assert.ok(!files.some(file => /(?:^|\/)(?:node_modules|src|test|\.git)(?:\/|$)|\.(?:jsonl|sqlite|log)$/u.test(file)));
  const unpacked = join(temporary, "package");
  await run("tar", ["-xf", join(temporary, packed.filename), "-C", temporary]);
  await symlink(resolve("node_modules"), join(temporary, "node_modules"));
  const platform = createInstallationManager({ home: temporary, root: join(temporary, "orbit"), applicationsRoot: join(temporary, "Applications"), manageExtensions: false });
  await platform.install(); await platform.addPlugin(unpacked);
  const metadata = JSON.parse(await readFile(join(unpacked, "package.json"), "utf8"));
  assert.equal(metadata.license, "MIT");
  assert.equal(metadata.repository.directory, "packages/orbit-context");
  const config = await platform.read(), snapshot = join(platform.paths.root, config.orbit.packages["orbit-context"].path);
  assert.deepEqual(config.plugins.map(plugin => plugin.id), ["orbit-context"]);
  assert.ok((await readFile(join(snapshot, "runtime/injected.js"), "utf8")).includes("Context usage:"));
  await assert.rejects(access(join(snapshot, "node_modules/@c0sc0s/orbit-tags")));
  const { activate } = await import(pathToFileURL(join(snapshot, "dist/service/activate.js")));
  const handlers = new Map(); activate({ rpc: { handle: (name, handler) => handlers.set(name, handler) } });
  await assert.rejects(handlers.get("context.read")({ sessionId: "../invalid" }, { signal: new AbortController().signal }), /Invalid session/);
  await platform.setEnabled("orbit-context", false); await platform.uninstallPlugin("orbit-context"); assert.equal((await platform.read()).plugins.length, 0);
  console.log("Context package smoke passed: packed payload, standalone service, no Tags runtime, plugin lifecycle.");
} finally { await rm(temporary, { recursive: true, force: true }); }
