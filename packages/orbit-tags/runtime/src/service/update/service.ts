import { spawn } from "node:child_process";
import { access, copyFile, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { writeUpdateStatus } from "./worker.js";

export function isRelease(version: unknown): version is string {
  return typeof version === "string" && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version);
}
export function isNewer(candidate: unknown, current: unknown) {
  if (!isRelease(candidate) || !isRelease(current)) return false;
  const left = candidate.split(".").map(Number),
    right = current.split(".").map(Number);
  for (let index = 0; index < 3; index += 1)
    if (left[index] !== right[index]) return left[index] > right[index];
  return false;
}
const readJson = async (path: string) => JSON.parse(await readFile(path, "utf8"));
const alive = (pid: number) => {
  if (!Number.isSafeInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error instanceof Error && "code" in error && error.code === "EPERM";
  }
};

export interface UpdateState {
  phase: string;
  currentVersion: string;
  latestVersion?: string;
  error?: string;
  pid?: number;
  startedAt?: number;
}
export class UpdateService {
  directory: string;
  installedVersion?: string;
  publish: (status: UpdateState) => void;
  fetchMetadata: typeof fetch;
  state: UpdateState;
  checkedAt: number;
  starting = false;
  pending: Promise<UpdateState> | null = null;
  constructor(
    directory: string,
    publish: (status: UpdateState) => void,
    {
      fetchMetadata = fetch,
      currentVersion,
    }: { fetchMetadata?: typeof fetch; currentVersion?: string } = {},
  ) {
    this.installedVersion = currentVersion;
    this.directory = directory;
    this.publish = publish;
    this.fetchMetadata = fetchMetadata;
    this.state = { phase: "idle", currentVersion: "" };
    this.checkedAt = 0;
  }
  emit(next: Partial<UpdateState>) {
    this.state = { ...this.state, ...next };
    this.publish(this.state);
    return this.state;
  }
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
    const currentVersion =
      this.installedVersion ??
      installed.packageVersion ??
      installed.pluginVersion?.split("+")[0] ??
      "";
    this.emit({ ...disk, currentVersion });
  }
  async check(force = false) {
    if (this.pending) return this.pending;
    if (this.starting || this.state.phase === "updating") return this.state;
    if (!force && Date.now() - this.checkedAt < 4 * 60 * 60 * 1000) return this.emit({});
    this.pending = this.performCheck().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }
  async performCheck() {
    this.emit({ phase: "checking", error: "" });
    try {
      const response = await this.fetchMetadata(
        "https://registry.npmjs.org/@c0sc0s%2Forbit-tags/latest",
        { signal: AbortSignal.timeout(10_000), redirect: "error" },
      );
      if (!response.ok) throw new Error("Registry unavailable");
      const metadata = await response.json();
      if (!isRelease(metadata.version) || !isRelease(this.state.currentVersion))
        throw new Error("Invalid version");
      this.checkedAt = Date.now();
      return this.emit({
        phase: isNewer(metadata.version, this.state.currentVersion) ? "available" : "current",
        latestVersion: metadata.version,
      });
    } catch {
      return this.emit({ phase: "error", error: "check" });
    }
  }
  async install() {
    if (
      this.starting ||
      this.state.phase !== "available" ||
      !isNewer(this.state.latestVersion, this.state.currentVersion)
    )
      return;
    this.starting = true;
    const lock = join(this.directory, "update.lock");
    let owned = false,
      temporary;
    try {
      const previous = await readJson(lock).catch(() => null);
      if (previous && !alive(previous.pid)) await rm(lock, { force: true });
      await writeFile(lock, JSON.stringify({ pid: process.pid }), { flag: "wx", mode: 0o600 });
      owned = true;
      temporary = await mkdtemp(join(tmpdir(), "codex-tags-update-"));
      const worker = join(temporary, "worker.mjs");
      // Keep worker code outside the installation that the CLI replaces.
      await copyFile(new URL("./worker.js", import.meta.url), worker);
      await writeUpdateStatus(this.directory, {
        phase: "updating",
        latestVersion: this.state.latestVersion,
        pid: process.pid,
        startedAt: Date.now(),
      });
      const child = spawn(
        process.execPath,
        [worker, this.directory, temporary, this.state.latestVersion!],
        { detached: true, stdio: "ignore" },
      );
      await new Promise<void>((resolve, reject) => {
        child.once("spawn", resolve);
        child.once("error", reject);
      });
      child.unref();
      await writeFile(lock, JSON.stringify({ pid: child.pid }), { mode: 0o600 });
      this.emit({ phase: "updating", error: "" });
    } catch {
      if (owned) await rm(lock, { force: true });
      if (temporary) await rm(temporary, { recursive: true, force: true });
      if (owned) await writeUpdateStatus(this.directory, { phase: "error", error: "start" });
      this.emit({ phase: "error", error: "start" });
    } finally {
      this.starting = false;
    }
  }
}
