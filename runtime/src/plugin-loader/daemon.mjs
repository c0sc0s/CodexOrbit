import { execFile, fork } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, open, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL("cli.mjs", import.meta.url));

export function daemonPaths(configPath, port) {
  const owner = createHash("sha256").update(`${resolve(configPath)}:${port}`).digest("hex").slice(0, 24);
  const root = join(dirname(configPath), `.loader-${owner}`);
  return { owner, root, lease: join(root, "owner.json"), log: join(root, "loader.log"), status: join(root, "status.json") };
}

export async function readOwner(paths) {
  try {
    if ((await lstat(paths.lease)).isSymbolicLink()) throw new Error("Loader ownership file must not be a symlink");
    const record = JSON.parse(await readFile(paths.lease, "utf8"));
    if (!Number.isSafeInteger(record?.pid) || record.pid <= 0 || typeof record.token !== "string") throw new Error("Invalid Loader ownership record");
    return record;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

function isAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error.code === "ESRCH") return false; throw error; }
}

export async function daemonStatus(paths) {
  const record = await readOwner(paths);
  if (!record || !isAlive(record.pid)) return { running: false, pid: null };
  let stdout;
  try { ({ stdout } = await run("/bin/ps", ["-p", String(record.pid), "-o", "command="])); }
  catch (error) { if (!isAlive(record.pid)) return { running: false, pid: null }; throw error; }
  const owned = record.scriptPath === cliPath && typeof record.command === "string"
    && record.command.startsWith(`${cliPath} `) && stdout.trim().endsWith(record.command);
  return { running: owned, pid: owned ? record.pid : null, conflict: !owned, phase: record.phase };
}

/** Exclusive ownership refuses live conflicts and reports stale leases without racing their replacement. */
export async function acquireOwner(paths) {
  await mkdir(paths.root, { recursive: true, mode: 0o700 });
  if ((await lstat(paths.root)).isSymbolicLink()) throw new Error("Loader state directory must not be a symlink");
  const token = randomUUID();
  let handle;
  try { handle = await open(paths.lease, "wx", 0o600); }
  catch (error) {
    if (error.code !== "EEXIST") throw error;
    const previous = await readOwner(paths);
    if (!previous || isAlive(previous.pid)) throw new Error("A Loader for this configuration is already running or starting");
    throw new Error(`Stale Loader ownership file: ${paths.lease}. After confirming that process ${previous.pid} has exited, remove only that file and retry.`);
  }
  try {
    await handle.writeFile(JSON.stringify({ pid: process.pid, token, phase: "starting", scriptPath: cliPath, command: process.argv.slice(1).join(" ") }));
  } finally { await handle.close(); }
  return token;
}

export async function claimOwner(paths, token, phase = "starting") {
  if ((await readOwner(paths))?.token !== token) throw new Error("Loader startup ownership changed");
  const next = `${paths.lease}.${token}`;
  await writeFile(next, JSON.stringify({ pid: process.pid, token, phase, scriptPath: cliPath, command: process.argv.slice(1).join(" ") }), { mode: 0o600 });
  await rename(next, paths.lease);
}

export async function releaseOwner(paths, token) {
  if ((await readOwner(paths))?.token === token) await rm(paths.lease, { force: true });
}

export async function startDaemon({ configPath, port, paths }) {
  const status = await daemonStatus(paths);
  if (status.running && status.phase === "running") return { status: "already-running", pid: status.pid };
  const token = await acquireOwner(paths);
  let log;
  let child;
  try {
    log = await open(paths.log, "a", 0o600);
    child = fork(cliPath, ["watch", "--config", configPath, "--port", String(port), "--token", token], {
      detached: true, stdio: ["ignore", log.fd, log.fd, "ipc"],
    });
    const result = await new Promise((resolveReady, reject) => {
      const timer = setTimeout(() => done(new Error("Loader startup timed out; see loader.log")), 30_000);
      const done = (error, value) => {
        clearTimeout(timer);
        child.removeListener("error", onError);
        child.removeListener("exit", onExit);
        child.removeListener("message", onMessage);
        if (error) reject(error); else resolveReady(value);
      };
      const onError = () => done(new Error("Loader process could not start"));
      const onExit = () => done(new Error("Loader exited before readiness; see loader.log"));
      const onMessage = (message) => { if (message?.type === "ready") done(null, message.result); };
      child.once("error", onError);
      child.once("exit", onExit);
      child.on("message", onMessage);
    });
    child.disconnect();
    child.unref();
    return { status: "running", pid: child.pid, results: result };
  } catch (error) {
    if (child?.pid) {
      child.kill("SIGTERM");
      // Keep ownership until the child exits, so a retry cannot overlap its cleanup.
      if (child.exitCode === null && child.signalCode === null) await new Promise((resolveExit) => {
        const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
        child.once("exit", () => { clearTimeout(timer); resolveExit(); });
      });
    }
    await releaseOwner(paths, token);
    throw error;
  } finally { await log?.close(); }
}

export async function stopDaemon(paths) {
  const status = await daemonStatus(paths);
  if (status.conflict) throw new Error("Loader ownership conflicts with another live process; it was not stopped");
  if (!status.running) return;
  process.kill(status.pid, "SIGTERM");
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (!(await daemonStatus(paths)).running) return;
    await delay(50);
  }
  throw new Error("Loader did not stop; no files were replaced");
}


export async function writeHostStatus(paths, token, modules) {
  if ((await readOwner(paths))?.token !== token) throw new Error("Loader status ownership changed");
  const next = `${paths.status}.${token}`;
  await writeFile(next, JSON.stringify({ token, modules }), { mode: 0o600 });
  await rename(next, paths.status);
}

export async function readHostStatus(paths) {
  const owner = await readOwner(paths);
  if (!owner) return null;
  try {
    const status = JSON.parse(await readFile(paths.status, "utf8"));
    return status.token === owner.token ? status.modules : null;
  } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
