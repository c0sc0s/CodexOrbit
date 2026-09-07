#!/usr/bin/env node
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { CodexProcess } from "./codex-process.mjs";
import { RUNTIME_VERSION, buildRemovalExpression } from "./inject-expression.mjs";
import { PluginTargetRegistry } from "./plugin-loader/index.mjs";
import { setPluginEnabled } from "./plugin-loader/manifest.mjs";
import { daemonPaths, daemonStatus } from "./plugin-loader/daemon.mjs";
import { isOwnedControllerCommand, parseControllerPid } from "./controller-state.mjs";
import { SessionSearchIndex } from "./search-index.mjs";
import { SessionCatalog } from "./session-catalog.mjs";
import { SettingsRepository } from "./settings-repository.mjs";

const run = promisify(execFile);
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const STATE_DIR = process.env.CODEX_TAGS_STATE_DIR ?? dirname(SCRIPT_PATH);
const PORT = Number(process.env.CODEX_TAGS_CDP_PORT ?? 9341);
const configPath = join(STATE_DIR, "loader.json");
const loaderCli = join(dirname(SCRIPT_PATH), "plugin-loader", "cli.mjs");
const paths = daemonPaths(configPath, PORT);
const codexProcess = new CodexProcess({ port: PORT });
const targetRegistry = new PluginTargetRegistry({ port: PORT, ownsEndpoint: () => codexProcess.ownsCdpEndpoint() });
const settingsRepository = new SettingsRepository(join(STATE_DIR, "settings.json"));
const SEARCH_DATABASE_PATH = join(STATE_DIR, "search.sqlite");

async function runLoader(command, ...args) {
  const result = await run(process.execPath, [loaderCli, command, "--config", configPath, "--port", String(PORT), ...args], { maxBuffer: 8 * 1024 * 1024 });
  if (result.stdout.trim()) console.log(result.stdout.trim());
}

async function stopLegacyController() {
  const path = join(STATE_DIR, "controller.pid");
  let pid;
  try { pid = parseControllerPid(await readFile(path, "utf8")); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  const owned = async () => {
    if (!pid) return false;
    try {
      const { stdout } = await run("/bin/ps", ["-p", String(pid), "-o", "command="]);
      return isOwnedControllerCommand(stdout, SCRIPT_PATH);
    } catch { return false; }
  };
  if (await owned()) {
    process.kill(pid, "SIGTERM");
    const deadline = Date.now() + 5000;
    while (await owned()) {
      if (Date.now() >= deadline) throw new Error("Legacy Tags controller did not stop");
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  await rm(path, { force: true });
}

async function removeTags() {
  if (await codexProcess.ownsCdpEndpoint()) {
    for (const target of await targetRegistry.discover()) await targetRegistry.evaluate(target, buildRemovalExpression());
  }
}

async function status() {
  const ready = await codexProcess.cdpIsReady(() => targetRegistry.discover());
  const controllerPid = (await daemonStatus(paths)).pid;
  const codexRunning = await codexProcess.isRunning();
  const activeVersions = [];
  const activeWindows = [];
  if (ready) {
    for (const target of await targetRegistry.discover()) {
      activeVersions.push(await targetRegistry.evaluate(target, "window.__codexSidebarTags?.version ?? null"));
      activeWindows.push(await targetRegistry.evaluate(target, "window.__codexSidebarTags?.status?.() ?? null"));
    }
  }
  let searchIndex = null;
  try {
    const index = new SessionSearchIndex(SEARCH_DATABASE_PATH, { readOnly: true });
    searchIndex = index.status();
    index.close();
  } catch (error) {
    searchIndex = { error: error.message };
  }
  const tagSettingsState = await settingsRepository.read();
  const tagSettings = tagSettingsState.exists ? tagSettingsState.settings : null;
  const catalogState = await new SessionCatalog().read();
  const catalog = { complete: catalogState.complete, count: catalogState.items.length, error: catalogState.error };
  console.log(JSON.stringify({ codexRunning, cdp: ready, controllerPid, sourceVersion: RUNTIME_VERSION, activeVersions, activeWindows, searchIndex, catalog, tagSettings, tagSettingsError: tagSettingsState.error }, null, 2));
}

const command = process.argv[2] ?? "status";
try {
  if (command === "status") await status();
  else if (["start", "apply", "restore", "purge"].includes(command)) {
    await stopLegacyController();
    if (command === "apply") await runLoader("stop");
    if (command === "restore" || command === "purge") await runLoader("remove", "--plugin", "codex-tags");
    await removeTags();
    if (command === "start" || command === "apply") {
      await setPluginEnabled(configPath, "codex-tags", true);
      await runLoader("start", ...(command === "apply" ? ["--attach"] : []));
    }
    if (command === "purge" && await codexProcess.ownsCdpEndpoint()) {
      for (const target of await targetRegistry.discover()) await targetRegistry.evaluate(target, `
        localStorage.removeItem("codex-sidebar-tags-config-v1");
        localStorage.removeItem("codex-sidebar-tags-index-v1");
      `);
    }
  } else throw new Error(`Unknown Tags adapter command: ${command}`);
} finally { targetRegistry.close(); }
