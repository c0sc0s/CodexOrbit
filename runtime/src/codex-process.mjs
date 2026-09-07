import { execFile, spawn } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const defaultRun = promisify(execFile);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class CodexProcess {
  constructor(options = {}) {
    this.port = options.port ?? 9341;
    this.appPath = options.appPath ?? "/Applications/ChatGPT.app";
    this.executable = join(this.appPath, "Contents", "MacOS", "ChatGPT");
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
          if (command.trim().startsWith(this.executable)) return true;
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

  async quitGracefully() {
    if (!(await this.isRunning())) return;
    await this.run("/usr/bin/osascript", ["-e", 'tell application id "com.openai.codex" to quit']);
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (!(await this.isRunning())) return;
      await wait(250);
    }
    throw new Error("Codex 未在 30 秒内正常退出；未强制结束进程");
  }

  async launchWithCdp(discoverTargets) {
    const child = this.spawn(this.executable, [
      "--remote-debugging-address=127.0.0.1",
      `--remote-debugging-port=${this.port}`,
    ], { detached: true, stdio: "ignore" });
    child.unref();
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        if (await this.ownsCdpEndpoint() && (await discoverTargets()).length > 0) return;
      } catch {
        // The endpoint can be temporarily unavailable while Codex starts.
      }
      await wait(250);
    }
    throw new Error("等待 Codex CDP 端口超时");
  }
}
