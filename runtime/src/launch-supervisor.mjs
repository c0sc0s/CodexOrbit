#!/usr/bin/env node
import { execFile } from "node:child_process";
import { appendFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { CodexProcess } from "./codex-process.mjs";

const run = promisify(execFile);
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const STATE_DIR = process.env.CODEX_TAGS_STATE_DIR ?? dirname(SCRIPT_PATH);
const CONTROLLER_PATH = join(STATE_DIR, "app.mjs");
const LOG_PATH = join(STATE_DIR, "supervisor.log");
const POLL_INTERVAL_MS = 500;
const LAUNCH_SETTLE_MS = 300;

export class CodexLaunchSupervisor {
  constructor(options = {}) {
    this.codexProcess = options.codexProcess ?? new CodexProcess({ port: options.port });
    this.startController = options.startController ?? (() => run(process.execPath, [CONTROLLER_PATH, "start"], {
      maxBuffer: 20 * 1024 * 1024,
    }));
    this.runtimeIsHealthy = options.runtimeIsHealthy ?? (async () => {
      try {
        const { stdout } = await run(process.execPath, [CONTROLLER_PATH, "status"], { maxBuffer: 20 * 1024 * 1024 });
        const status = JSON.parse(stdout);
        return status.cdp === true && Number.isSafeInteger(status.controllerPid) && status.activeVersions?.length > 0 && status.activeVersions.every((version) => version === status.sourceVersion);
      } catch {
        return false;
      }
    });
    this.wait = options.wait ?? wait;
    this.launchSettleMs = options.launchSettleMs ?? LAUNCH_SETTLE_MS;
    this.handledCurrentRun = false;
    this.handledIdentity = null;
  }

  async tick() {
    const running = await this.codexProcess.isRunning();
    if (!running) {
      this.handledCurrentRun = false;
      this.handledIdentity = null;
      return { state: "stopped" };
    }
    const identity = await this.codexProcess.runIdentity?.();
    if (this.handledCurrentRun && identity === this.handledIdentity) return { state: "already-handled" };

    // Mark first so a failed takeover cannot cause a restart loop during the same app run.
    this.handledCurrentRun = true;
    this.handledIdentity = identity;
    await this.wait(this.launchSettleMs);
    if (!(await this.codexProcess.isRunning())) return { state: "closed-during-settle" };

    const [portIsListening, ownsCdpEndpoint, hasCdpLaunchArguments] = await Promise.all([
      this.codexProcess.portIsListening(),
      this.codexProcess.ownsCdpEndpoint(),
      this.codexProcess.hasCdpLaunchArguments(),
    ]);
    if (portIsListening && !ownsCdpEndpoint) {
      return { state: "foreign-port" };
    }

    if (await this.runtimeIsHealthy()) return { state: "already-active" };

    await this.startController();
    this.handledIdentity = await this.codexProcess.runIdentity?.();
    return { state: hasCdpLaunchArguments ? "connected" : "restarted-and-activated" };
  }
}

async function log(message) {
  await appendFile(LOG_PATH, `${new Date().toISOString()} ${message}\n`, { encoding: "utf8", mode: 0o600 });
}

async function watch() {
  const configuredPort = Number(process.env.CODEX_TAGS_CDP_PORT ?? 9341);
  if (!Number.isSafeInteger(configuredPort) || configuredPort < 1024 || configuredPort > 65535) {
    throw new Error("CODEX_TAGS_CDP_PORT must be an integer between 1024 and 65535");
  }
  const supervisor = new CodexLaunchSupervisor({ port: configuredPort });
  let stopping = false;
  process.once("SIGTERM", () => { stopping = true; });
  process.once("SIGINT", () => { stopping = true; });
  await log("launch supervisor started");

  while (!stopping) {
    try {
      const result = await supervisor.tick();
      if (["connected", "restarted-and-activated", "foreign-port", "closed-during-settle"].includes(result.state)) await log(result.state);
    } catch (error) {
      await log(`activation failed: ${error.message}`);
    }
    await wait(POLL_INTERVAL_MS);
  }
  await log("launch supervisor stopped");
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) await watch();
