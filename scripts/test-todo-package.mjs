import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile), temporary = await mkdtemp(join(tmpdir(), "orbit-todo-package-"));
try {
  const pack = async workspace => JSON.parse((await run("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: resolve("packages", workspace), maxBuffer: 4 * 1024 * 1024 })).stdout)[0];
  const orbit = await pack("orbit"), todo = await pack("orbit-todo");
  const paths = todo.files.map(file => file.path);
  for (const path of ["bin/orbit-todo.mjs", "dist/cli/main.js", "dist/storage/repository.js", "dist/service/activate.js", "runtime/injected.js", "skills/todo/SKILL.md", ".codex-plugin/plugin.json", "orbit-plugin.json"])
    assert.ok(paths.includes(path), `Missing Todo payload: ${path}`);
  assert.ok(!paths.some(path => /(?:^|\/)(?:node_modules|src|test|\.git)(?:\/|$)|\.(?:sqlite|log)$/u.test(path)));
  const consumer = join(temporary, "consumer");
  await run("npm", ["install", "--prefix", consumer, "--ignore-scripts", "--no-audit", "--no-fund", "--cache", join(temporary, "npm-cache"), join(temporary, orbit.filename), join(temporary, todo.filename)], { timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
  const packageRoot = join(consumer, "node_modules/@c0sc0s/orbit-todo");
  const { createInstallationManager } = await import(pathToFileURL(join(consumer, "node_modules/@c0sc0s/orbit/dist/installation/manager.js")));
  const platform = createInstallationManager({ home: temporary, root: join(temporary, "orbit"), applicationsRoot: join(temporary, "Applications"), manageExtensions: false });
  await platform.install();
  await platform.addPlugin(packageRoot);
  const config = await platform.read(), record = config.orbit.packages["orbit-todo"];
  const snapshot = join(platform.paths.root, record.path), executable = join(snapshot, "bin/orbit-todo.mjs");
  const info = JSON.parse((await run(process.execPath, [executable, "info"])).stdout);
  assert.equal(info.data.dataDirectory, record.dataDirectory);
  const created = JSON.parse((await run(process.execPath, [executable, "create", "--title", "Packed Todo", "--request-id", "package-test"])).stdout);
  const listing = JSON.parse((await run(process.execPath, [executable, "list"])).stdout);
  assert.equal(listing.data.items[0].id, created.data.tasks[0].id);
  await import(pathToFileURL(join(snapshot, "dist/service/activate.js")));
  const { TodoRepository } = await import(pathToFileURL(join(snapshot, "dist/storage/repository.js")));
  const repository = new TodoRepository(record.dataDirectory);
  assert.equal(repository.list().total, 1); repository.close();
  await platform.setEnabled("orbit-todo", false);
  await platform.uninstallPlugin("orbit-todo");
  assert.equal((await platform.read()).plugins.length, 0);
  assert.ok(await readFile(join(record.dataDirectory, "tasks.sqlite")));
  console.log("Todo package smoke passed: packed CLI, SQLite, service, skill, assigned data directory and isolated plugin lifecycle.");
} finally { await rm(temporary, { recursive: true, force: true }); }
