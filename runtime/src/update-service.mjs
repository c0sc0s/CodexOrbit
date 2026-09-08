import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { writeUpdateStatus } from "./update-worker.mjs";

export function isRelease(version) { return typeof version === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version); }
export function isNewer(candidate, current) {
  if (!isRelease(candidate) || !isRelease(current)) return false;
  const left = candidate.split(".").map(Number), right = current.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) if (left[index] !== right[index]) return left[index] > right[index];
  return false;
}
const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const alive = (pid) => { if (!Number.isSafeInteger(pid) || pid <= 0) return false; try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; } };

export class UpdateService {
  constructor(directory, publish, { fetchMetadata = fetch } = {}) {
    this.directory = directory; this.publish = publish; this.fetchMetadata = fetchMetadata;
    this.state = { phase: "idle", currentVersion: "" }; this.checkedAt = 0;
  }
  emit(next) { this.state = { ...this.state, ...next }; this.publish(this.state); return this.state; }
  async refresh() {
    let disk = await readJson(join(this.directory, "update-status.json")).catch(() => null);
    if (disk?.phase === "updating") {
      const lock = await readJson(join(this.directory, "update.lock")).catch(() => null);
      if (!alive(lock?.pid ?? disk.pid)) {
        // Completion and process exit can occur between reading the status and checking the PID.
        disk = await readJson(join(this.directory, "update-status.json"));
        if (disk.phase === "updating") {
          disk = { ...disk, phase: "error", error: "interrupted" };
          await writeUpdateStatus(this.directory, disk);
        }
      }
    }
    const installed = await readJson(join(this.directory, "install.json")).catch(() => ({}));
    const currentVersion = installed.packageVersion ?? installed.pluginVersion?.split("+")[0] ?? "";
    this.emit({ ...disk, currentVersion });
  }
  async check(force = false) {
    if (this.pending) return this.pending;
    if (this.starting || this.state.phase === "updating") return this.state;
    if (!force && Date.now() - this.checkedAt < 4 * 60 * 60 * 1000) return this.emit({});
    this.pending = this.performCheck().finally(() => { this.pending = null; });
    return this.pending;
  }
  async performCheck() {
    this.emit({ phase: "checking", error: "" });
    try {
      const response = await this.fetchMetadata("https://registry.npmjs.org/@c0sc0s%2Fcodex-tags/latest", { signal: AbortSignal.timeout(10_000), redirect: "error" });
      if (!response.ok) throw new Error("Registry unavailable");
      const metadata = await response.json();
      if (!isRelease(metadata.version) || !isRelease(this.state.currentVersion)) throw new Error("Invalid version");
      this.checkedAt = Date.now();
      return this.emit({ phase: isNewer(metadata.version, this.state.currentVersion) ? "available" : "current", latestVersion: metadata.version });
    } catch { return this.emit({ phase: "error", error: "check" }); }
  }
  async install() {
    if (this.starting || this.state.phase !== "available" || !isNewer(this.state.latestVersion, this.state.currentVersion)) return;
    this.starting = true;
    const lock = join(this.directory, "update.lock");
    let owned = false, temporary;
    try {
      const previous = await readJson(lock).catch(() => null);
      if (previous && !alive(previous.pid)) await rm(lock, { force: true });
      await writeFile(lock, JSON.stringify({ pid: process.pid }), { flag: "wx", mode: 0o600 }); owned = true;
      const npmCli = await this.findNpm();
      temporary = await mkdtemp(join(tmpdir(), "codex-tags-update-"));
      const worker = join(temporary, "worker.mjs");
      // Keep worker code outside the installation that the CLI replaces.
      await copyFile(new URL("./update-worker.mjs", import.meta.url), worker);
      await writeUpdateStatus(this.directory, { phase: "updating", latestVersion: this.state.latestVersion, pid: process.pid, startedAt: Date.now() });
      const child = spawn(process.execPath, [worker, this.directory, temporary, npmCli, this.state.latestVersion], { detached: true, stdio: "ignore" });
      await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
      child.unref();
      await writeFile(lock, JSON.stringify({ pid: child.pid }), { mode: 0o600 });
      this.emit({ phase: "updating", error: "" });
    } catch {
      if (owned) await rm(lock, { force: true });
      if (temporary) await rm(temporary, { recursive: true, force: true });
      if (owned) await writeUpdateStatus(this.directory, { phase: "error", error: "start" });
      this.emit({ phase: "error", error: "start" });
    } finally { this.starting = false; }
  }
  async findNpm() {
    const candidates = [join(dirname(process.execPath), "npm"), ...(process.env.PATH ?? "").split(":").filter(Boolean).map((path) => join(path, "npm"))];
    for (const candidate of candidates) {
      try { const path = await realpath(candidate); if (path.endsWith("/npm-cli.js")) { await access(path); return path; } } catch { /* Try the next Node installation. */ }
    }
    throw new Error("npm unavailable");
  }
}
