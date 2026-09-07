import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const temporary = await mkdtemp(join(tmpdir(), "codex-tags-package-"));
try {
  const { stdout } = await run("npm", ["pack", "--json", "--pack-destination", temporary], { cwd: resolve("."), maxBuffer: 8 * 1024 * 1024 });
  const [packed] = JSON.parse(stdout);
  const paths = packed.files.map(({ path }) => path);
  for (const path of ["bin/codex-tags.mjs", "scripts/health.mjs", "scripts/cli-options.mjs", "scripts/lifecycle-lock.mjs", "runtime/dist/injected.js", "hooks/hooks.json", "skills/doctor/SKILL.md", "skills/initial/SKILL.md", "skills/rename/SKILL.md"]) assert.ok(paths.includes(path), `Missing package payload: ${path}`);
  assert.ok(!paths.some((path) => /(?:^|\/)(?:node_modules|\.git|previews)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|\.(?:log|sqlite|pid|tgz)$/u.test(path)));
  const consumer = join(temporary, "consumer");
  await run("npm", ["install", "--prefix", consumer, "--ignore-scripts", "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", join(temporary, packed.filename)], { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
  const packageRoot = join(consumer, "node_modules", "@c0sc0s", "codex-tags");
  const executable = join(packageRoot, "bin", "codex-tags.mjs");
  const help = await run(process.execPath, [executable, "--help"]);
  assert.match(help.stdout, /install/u);
  await assert.rejects(run(process.execPath, [executable, "off", "--purge"]));
  const { createManager } = await import(pathToFileURL(join(packageRoot, "scripts", "manager-core.mjs")).href);
  const manager = createManager({
    packageRoot, home: temporary, installRoot: join(temporary, "runtime"),
    applicationsRoot: join(temporary, "Applications"), platform: "darwin",
    run: async (file, args) => {
      assert.equal(file, "/bin/launchctl", "Package smoke must not invoke real app lifecycle commands");
      if (args[0] === "print") throw Object.assign(new Error("No simulated launch agent"), { code: 113 });
      assert.equal(args[0], "bootout");
      return { stdout: "", stderr: "" };
    },
  });
  await manager.installRuntime();
  await import(pathToFileURL(join(manager.paths.installRoot, "runtime-target-registry.mjs")).href);
  await import(pathToFileURL(join(manager.paths.marketplacePluginRoot, "runtime", "src", "plugin-loader", "index.mjs")).href);
  const { SessionSearchIndex } = await import(pathToFileURL(join(manager.paths.installRoot, "search-index.mjs")).href);
  const index = new SessionSearchIndex(join(temporary, "probe.sqlite"));
  assert.equal(index.status().indexedSessions, 0);
  index.close();
  await access(join(manager.paths.marketplacePluginRoot, "scripts", "health.mjs"));
  const hook = JSON.parse((await run(process.execPath, [join(manager.paths.marketplacePluginRoot, "hooks", "session-naming.mjs"), "--context"], { env: { ...process.env, CODEX_TAGS_SETTINGS_PATH: join(temporary, "absent-settings.json") } })).stdout);
  assert.deepEqual(hook.tags.map(({ name }) => name), ["Feature", "Bug", "Design", "Research"]);
  const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
  console.log(`Package smoke passed: ${manifest.name}@${manifest.version}; hoisted dependencies, standalone runtime, plugin payload, native SQLite, CLI validation.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
