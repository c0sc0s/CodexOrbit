#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createManager } from "../scripts/manager-core.js";
import { parseCliOptions } from "../scripts/cli-options.js";
import { activationHealth } from "../scripts/health.js";

import type { HealthStatus, Health } from "../scripts/health.js";
type PrintResult = HealthStatus & { status?: string | HealthStatus; installation?: { pluginVersion?: string }; health?: Health; checks?: Health["checks"]; ok?: boolean; settingsPreserved?: boolean };
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const args = process.argv.slice(2);
const json = args.includes("--json");

const help = `Orbit Tags ${packageJson.version}

Usage: orbit-tags [command] [options]
Without a command, installs and activates Orbit Tags.

Commands:
  install, enable, on   Register Tags with Orbit and turn it on
  disable, off          Turn UI injection and the naming hook off; keep data
  status                Show runtime, plugin, index, and UI status
  doctor                Diagnose the complete installation without changing it
  update                Install this package version and turn it on
  restore               Alias for disable
  uninstall             Remove owned files; keep tag settings by default

Options:
  --json                 Machine-readable output
  --purge                With uninstall, also remove tag settings
  -h, --help             Show help
  -v, --version          Show version

Recommended:
  npx @c0sc0s/orbit-tags@latest install
  npx @c0sc0s/orbit-tags@latest off
  npx @c0sc0s/orbit-tags@latest on
`;

function print(result: PrintResult) {
  if (json) return console.log(JSON.stringify(result, null, 2));
  if (result.status === "enabled") {
    console.log(`Orbit Tags ${result.installation?.pluginVersion} is enabled.`);
    console.log("Use ~/Applications/Orbit.app to launch with Tags; add it to your Dock. The official entry does not auto-activate Tags.");
    console.log("Next: open Codex → Plugins → Orbit Tags and trust/enable all three hooks (SessionStart, UserPromptSubmit, SessionEnd).");
    console.log("New sessions can then use your tags automatically. Existing sessions are unchanged; the optional initial skill organizes them.");
  } else if (result.status === "incomplete") {
    console.error("Files were installed, but activation is not ready:");
    for (const check of (result.health?.checks ?? []).filter(({ ok }) => !ok)) console.error(`  - ${check.message}`);
    console.error("Run orbit-tags doctor for details; rerun install to retry, or off to disable.");
  } else if (result.status === "disabled") {
    console.log("Orbit Tags is disabled. Tag settings and the local index were preserved.");
  } else if (result.status === "uninstalled") {
    console.log(`Orbit Tags was uninstalled. Settings preserved: ${result.settingsPreserved ? "yes" : "no"}.`);
  } else {
    const health = result.checks ? result : activationHealth(result);
    console.log(health.ok ? "Tags runtime is ready." : "Tags runtime is not fully active (it may be disabled or Codex may be closed).");
    for (const check of health.checks ?? []) console.log(`${check.ok ? "OK" : "--"} ${check.message}`);
    console.log("Hook trust is managed in Codex Plugins and must be reviewed there. Use --json for technical details.");
  }
}

try {
  const { command, purge } = parseCliOptions(args);
  const manager = ["help", "version"].includes(command) ? null : createManager({ packageRoot });
  const mutate = <T>(operation: () => Promise<T>) => operation();
  if (command === "version") console.log(packageJson.version);
  else if (command === "help") console.log(help);
  else if (["install", "enable", "on", "update"].includes(command)) {
    if (!json) console.error("Installing Orbit Tags. If Codex is already open without Tags, quit it first. No automatic restart will occur.");
    const result = await mutate(() => manager!.enable());
    print(result);
    if (result.status !== "enabled") process.exitCode = 1;
  }
  else if (["disable", "off", "restore"].includes(command)) print(await mutate(() => manager!.disable()));
  else if (command === "status") print(await manager!.status());
  else if (command === "doctor") {
    const result = await manager!.doctor();
    print(result);
    if (!result.ok) process.exitCode = 1;
  } else if (command === "uninstall") print(await mutate(() => manager!.uninstall({ purge })));
  else throw new Error(`Unknown command: ${command}`);
} catch (error) {
  if (json) console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "Operation failed" }, null, 2));
  else console.error(`Orbit Tags: ${error instanceof Error ? error.message : "Operation failed"}`);
  process.exitCode = 1;
}
