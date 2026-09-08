import { execFile } from "node:child_process";
import { readFile, writeFile, rename, rm, realpath } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const run = promisify(execFile);
export async function writeUpdateStatus(directory, state) {
  const path = join(directory, "update-status.json");
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, path);
}

export async function runUpdate({ directory, temporary, npmCli, version }, execute = run) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error("Invalid release version");
  const state = { phase: "updating", latestVersion: version, pid: process.pid, startedAt: Date.now() };
  const options = { cwd: temporary, timeout: 600_000, maxBuffer: 1024 * 1024,
    env: { ...process.env, CODEX_TAGS_INSTALL_DIR: directory, PATH: `${dirname(process.execPath)}\u003a${process.env.PATH ?? ""}` } };
  try {
    await writeUpdateStatus(directory, state);
    // A separate prefix prevents npm from resolving the command to an older local dependency.
    await execute(process.execPath, [npmCli, "install", "--prefix", temporary, "--no-audit", "--no-fund", "--registry=https://registry.npmjs.org", `@c0sc0s/codex-tags@${version}`], options);
    await execute(process.execPath, [join(temporary, "node_modules/@c0sc0s/codex-tags/bin/codex-tags.mjs"), "update"], options);
    const installed = JSON.parse(await readFile(join(directory, "install.json"), "utf8"));
    if ((installed.packageVersion ?? installed.pluginVersion?.split("+")[0]) !== version) throw new Error("Version mismatch");
    await writeUpdateStatus(directory, { ...state, phase: "succeeded", currentVersion: version });
  } catch {
    await writeUpdateStatus(directory, { ...state, phase: "error", error: "install" });
    // The installer may have stopped Loader before failing. Restore the available runtime when possible.
    await execute(process.execPath, [join(directory, "app.mjs"), "apply"], { ...options, timeout: 30_000 }).catch(() => {});
  } finally {
    await rm(join(directory, "update.lock"), { force: true });
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  const [directory, temporary, npmCli, version] = process.argv.slice(2);
  await runUpdate({ directory, temporary, npmCli, version });
}
