import { execFile, execFileSync, spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const defaultRun = promisify(execFile);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export function findCodexApp() {
  for (const appPath of ["/Applications/Codex.app", join(homedir(), "Applications", "Codex.app"), "/Applications/ChatGPT.app"]) {
    try {
      const plist = join(appPath, "Contents", "Info.plist");
      const read = (key) => execFileSync("/usr/bin/plutil", ["-extract", key, "raw", plist], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 2000 }).trim();
      if (read("CFBundleIdentifier") !== "com.openai.codex") continue;
      const executable = read("CFBundleExecutable");
      if (!/^[A-Za-z0-9_-]+$/u.test(executable)) continue;
      return { appPath, executable: join(appPath, "Contents", "MacOS", executable) };
    } catch { /* Uninstalled or unrelated applications are not candidates. */ }
  }
  return null;
}

export class CodexProcess {
  constructor(options = {}) {
    this.port = options.port ?? 9341;
    const detected = options.appPath ? null : findCodexApp();
    this.appPath = options.appPath ?? detected?.appPath ?? "/Applications/Codex.app";
    this.executable = options.executable ?? detected?.executable ?? join(this.appPath, "Contents", "MacOS", "ChatGPT");
    this.run = options.run ?? defaultRun;
    this.spawn = options.spawn ?? spawn;
  }

  async isRunning() {
    const { stdout } = await this.run("/bin/ps", ["-axo", "command="]);
    return stdout.split("\n").some((command) => {
      const value = command.trim();
      return value === this.executable || value.startsWith(`${this.executable} `);
    });
  }

  async hasCdpLaunchArguments() {
    const { stdout } = await this.run("/bin/ps", ["-axo", "command="]);
    return stdout.split("\n").some((command) => {
      const value = command.trim();
      const isCodex = value === this.executable || value.startsWith(`${this.executable} `);
      return isCodex && value.includes(`--remote-debugging-port=${this.port}`);
    });
  }

  async ownsCdpEndpoint() {
    let stdout;
    try {
      ({ stdout } = await this.run("/usr/sbin/lsof", [
        "-nP", `-iTCP:${this.port}`, "-sTCP:LISTEN", "-t",
      ]));
    } catch (error) {
      if (error.code === 1) return false;
      throw error;
    }

    for (const value of stdout.trim().split(/\s+/u)) {
      let pid = Number(value);
      for (let depth = 0; Number.isSafeInteger(pid) && pid > 0 && depth < 8; depth += 1) {
        try {
          const [{ stdout: command }, { stdout: parent }] = await Promise.all([
            this.run("/bin/ps", ["-p", String(pid), "-o", "command="]),
            this.run("/bin/ps", ["-p", String(pid), "-o", "ppid="]),
          ]);
          if (command.trim() === this.executable || command.trim().startsWith(`${this.executable} `)) return true;
          pid = Number(parent.trim());
        } catch {
          break;
        }
      }
    }
    return false;
  }

  async portIsListening() {
    try {
      const { stdout } = await this.run("/usr/sbin/lsof", ["-nP", `-iTCP:${this.port}`, "-sTCP:LISTEN", "-t"]);
      return stdout.trim().length > 0;
    } catch (error) {
      if (error.code === 1) return false;
      throw error;
    }
  }

  async cdpIsReady(discoverTargets) {
    try {
      return await this.ownsCdpEndpoint() && (await discoverTargets()).length > 0;
    } catch {
      return false;
    }
  }

  async waitForCdp(discoverTargets, timeoutMs = 30_000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await this.cdpIsReady(discoverTargets)) return;
      await wait(250);
    }
    throw new Error("等待 Codex CDP 端口超时");
  }

  async launchWithCdp(discoverTargets) {
    if (await this.isRunning()) throw new Error("Codex is already running without Tags. Quit Codex completely, then open Codex Tags.app. The running app was not restarted.");
    const child = this.spawn(this.executable, [
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${this.port}`,
    ], { detached: true, stdio: "ignore" });
    child.unref();
    await this.waitForCdp(discoverTargets);
  }
}
