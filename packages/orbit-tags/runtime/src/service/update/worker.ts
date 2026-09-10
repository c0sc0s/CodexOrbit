import { execFile } from "node:child_process";
import { readFile, writeFile, rename, rm, realpath } from "node:fs/promises";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";

const run = promisify(execFile);
export async function writeUpdateStatus(directory: string, state: object) {
  const path = join(directory, "update-status.json");
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state), { mode: 0o600 });
  await rename(temporary, path);
}

export async function runUpdate(
  { directory, temporary, version }: { directory: string; temporary: string; version: string },
  execute = run,
) {
  if (!/^\d+\.\d+\.\d+$/u.test(version)) throw new Error("Invalid release version");
  const state = {
    phase: "updating",
    latestVersion: version,
    pid: process.pid,
    startedAt: Date.now(),
  };
  const options = {
    cwd: temporary,
    timeout: 600_000,
    maxBuffer: 1024 * 1024,
    env: {
      ...process.env,
      CODEX_TAGS_INSTALL_DIR: directory,
      PATH: `${dirname(process.execPath)}\u003a${process.env.PATH ?? ""}`,
    },
  };
  try {
    await writeUpdateStatus(directory, state);
    const ownership = JSON.parse(await readFile(join(directory, "install.json"), "utf8"));
    if (typeof ownership.platformRoot !== "string")
      throw new Error("Migrate this plugin to Orbit before updating");
    await execute(
      process.execPath,
      [
        join(ownership.platformRoot, "orbit.mjs"),
        "plugin",
        "install",
        `@c0sc0s/orbit-tags@${version}`,
      ],
      { ...options, env: { ...options.env, ORBIT_HOME: ownership.platformRoot } },
    );
    const installed = JSON.parse(await readFile(join(directory, "install.json"), "utf8"));
    if ((installed.packageVersion ?? installed.pluginVersion?.split("+")[0]) !== version)
      throw new Error("Version mismatch");
    await writeUpdateStatus(directory, { ...state, phase: "succeeded", currentVersion: version });
  } catch {
    await writeUpdateStatus(directory, { ...state, phase: "error", error: "install" });
  } finally {
    await rm(join(directory, "update.lock"), { force: true });
    await rm(temporary, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  const [directory, temporary, version] = process.argv.slice(2);
  await runUpdate({ directory, temporary, version });
}
