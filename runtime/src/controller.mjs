#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { CdpClient } from "./cdp-client.mjs";
import { CodexProcess, findCodexApp } from "./codex-process.mjs";
import { ControllerRouter } from "./controller-router.mjs";
import { buildRuntimeMessageExpression, RUNTIME_BINDING, RUNTIME_VERSION } from "./inject-expression.mjs";
import { isOwnedControllerCommand, parseControllerPid } from "./controller-state.mjs";
import { createRuntimeMessage, RuntimeMessageType } from "./protocol.mjs";
import { SessionSearchIndex } from "./search-index.mjs";
import { SessionCatalog } from "./session-catalog.mjs";
import { SettingsRepository } from "./settings-repository.mjs";
import { RuntimeTargetRegistry } from "./runtime-target-registry.mjs";

process.umask(0o077);

const run = promisify(execFile);
const configuredPort = Number(process.env.CODEX_TAGS_CDP_PORT ?? 9341);
if (!Number.isSafeInteger(configuredPort) || configuredPort < 1024 || configuredPort > 65535) throw new Error("CODEX_TAGS_CDP_PORT must be an integer between 1024 and 65535");
const PORT = configuredPort;
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const STATE_DIR = process.env.CODEX_TAGS_STATE_DIR ?? dirname(SCRIPT_PATH);
const PID_PATH = join(STATE_DIR, "controller.pid");
const LOG_PATH = join(STATE_DIR, "controller.log");
const SEARCH_DATABASE_PATH = join(STATE_DIR, "search.sqlite");
const SETTINGS_PATH = join(STATE_DIR, "settings.json");
const INDEX_REFRESH_INTERVAL_MS = 30_000;
const settingsRepository = new SettingsRepository(SETTINGS_PATH);
const codexProcess = new CodexProcess({ port: PORT });
const targetRegistry = new RuntimeTargetRegistry({
  port: PORT,
  ownsEndpoint: () => codexProcess.ownsCdpEndpoint(),
  settingsRepository,
});

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function apply() {
  const { results } = await targetRegistry.ensureInjected(await settingsRepository.read());
  return results;
}

async function readControllerPid() {
  try {
    return parseControllerPid(await readFile(PID_PATH, "utf8"));
  } catch { return null; }
}

async function isOwnedController(pid) {
  try {
    const { stdout } = await run("/bin/ps", ["-p", String(pid), "-o", "command="]);
    return isOwnedControllerCommand(stdout, SCRIPT_PATH);
  } catch {
    return false;
  }
}

async function stopController() {
  const pid = await readControllerPid();
  if (pid !== null && await isOwnedController(pid)) {
    try { process.kill(pid, "SIGTERM"); } catch {}
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline && await isOwnedController(pid)) await wait(50);
    if (await isOwnedController(pid)) throw new Error("The controller did not stop. No files were removed; retry after it exits.");
  }
  await rm(PID_PATH, { force: true });
}

async function spawnController() {
  await stopController();
  const output = openSync(LOG_PATH, "a");
  const child = spawn(process.execPath, [SCRIPT_PATH, "watch"], {
    detached: true,
    stdio: ["ignore", output, output],
  });
  child.unref();
  closeSync(output);
}

async function start() {
  if (!findCodexApp()) throw new Error("Install the official Codex desktop app before activating Tags.");
  await mkdir(STATE_DIR, { recursive: true });
  await stopController();
  if (!(await codexProcess.cdpIsReady(() => targetRegistry.discover()))) {
    if (await codexProcess.ownsCdpEndpoint() || await codexProcess.hasCdpLaunchArguments()) {
      await codexProcess.waitForCdp(() => targetRegistry.discover());
    } else {
      if (await codexProcess.portIsListening()) throw new Error(`端口 ${PORT} 已被其他进程占用；未退出或修改 Codex`);
      await codexProcess.launchWithCdp(() => targetRegistry.discover());
    }
  }
  const results = await apply();
  await spawnController();
  console.log(`Codex Sidebar Tags ${RUNTIME_VERSION} 已启用`, results);
}

async function hotApply() {
  await mkdir(STATE_DIR, { recursive: true });
  await stopController();
  const results = await apply();
  await spawnController();
  return results;
}

async function watch() {
  await mkdir(STATE_DIR, { recursive: true });
  const nextPidPath = `${PID_PATH}.next-${process.pid}`;
  await writeFile(nextPidPath, `${JSON.stringify({ pid: process.pid, scriptPath: SCRIPT_PATH, startedAt: new Date().toISOString() })}\n`, { encoding: "utf8", mode: 0o600 });
  await rename(nextPidPath, PID_PATH);
  console.log(`${new Date().toISOString()} watching ${RUNTIME_VERSION}`);
  let misses = 0;
  const searchIndex = new SessionSearchIndex(SEARCH_DATABASE_PATH);
  const catalog = new SessionCatalog();
  let catalogState = await catalog.read();
  let catalogSignature = JSON.stringify(catalogState);
  let nextCatalogRefreshAt = 0;
  const runtimeClients = new Map();
  let indexStatus = { phase: "indexing", completed: 0, total: 0, changed: 0 };
  let indexRefresh = Promise.resolve();
  let nextIndexRefreshAt = 0;
  let settingsState = await settingsRepository.read();
  if (settingsState.error) console.error(`${new Date().toISOString()} ${settingsState.error}`);
  const syncTagSettings = async (target) => {
    if (settingsState.exists || settingsState.error) return;
    const definitions = await targetRegistry.evaluate(target, "window.__codexSidebarTags?.tagDefinitions?.() ?? null");
    if (!Array.isArray(definitions)) return;
    const result = await settingsRepository.write(definitions);
    settingsState = { settings: result.settings, exists: true, error: null };
  };
  const scheduleIndexRefresh = () => {
    indexRefresh = indexRefresh
      .then(() => searchIndex.refresh((status) => { indexStatus = status; }))
      .catch((error) => {
        indexStatus = { phase: "error", message: error.message };
        console.error(`${new Date().toISOString()} search indexing failed: ${error.message}`);
      });
    nextIndexRefreshAt = Date.now() + INDEX_REFRESH_INTERVAL_MS;
  };
  scheduleIndexRefresh();

  const sendRuntimeMessage = (client, message, executionContextId) => client.evaluate(
    buildRuntimeMessageExpression(message),
    executionContextId,
  );

  const broadcastSettings = async (settings) => {
    const message = createRuntimeMessage(RuntimeMessageType.settingsSnapshot, { settings });
    await Promise.allSettled([...runtimeClients.values()].map((client) => sendRuntimeMessage(client, message)));
  };

  const router = new ControllerRouter({
    searchIndex,
    settingsRepository,
    getSettings: () => settingsState.settings,
    onSettingsChanged: async (settings) => {
      settingsState = { settings, exists: true, error: null };
      await broadcastSettings(settings);
    },
    waitForIndex: () => indexRefresh,
    getIndexStatus: () => indexStatus,
    send: sendRuntimeMessage,
    openSession: async (threadId) => {
      if (catalogState.items.some((item) => item.threadId === threadId)) await run("/usr/bin/open", [`codex://threads/${threadId}`]);
    },
  });

  const ensureRuntimeClient = async (target) => {
    const existing = runtimeClients.get(target.id);
    if (existing?.connected) return existing;
    existing?.close();
    const client = await CdpClient.connect(target);
    await client.addBinding(RUNTIME_BINDING, (params) => router.handle(client, params));
    runtimeClients.set(target.id, client);
    await router.sendSettingsSnapshot(client);
    await sendRuntimeMessage(client, createRuntimeMessage(RuntimeMessageType.catalogSnapshot, catalogState));
    return client;
  };

  let cleanupPromise = null;
  const clean = () => {
    cleanupPromise ??= (async () => {
      for (const client of runtimeClients.values()) client.close();
      runtimeClients.clear();
      searchIndex.close();
      if ((await readControllerPid()) === process.pid) await rm(PID_PATH, { force: true });
    })();
    return cleanupPromise;
  };
  process.once("SIGTERM", () => { clean().finally(() => process.exit(0)); });
  process.once("SIGINT", () => { clean().finally(() => process.exit(0)); });

  try {
    while (true) {
      try {
        const { targets } = await targetRegistry.ensureInjected(settingsState);
        const currentTargetIds = new Set(targets.map(({ id }) => id));
        for (const [targetId, client] of runtimeClients) {
          if (currentTargetIds.has(targetId)) continue;
          client.close();
          runtimeClients.delete(targetId);
          router.forgetTarget(targetId);
        }
        for (const target of targets) {
          await ensureRuntimeClient(target);
          await syncTagSettings(target);
        }
        if (Date.now() >= nextIndexRefreshAt) scheduleIndexRefresh();
        if (Date.now() >= nextCatalogRefreshAt) {
          catalogState = await catalog.read();
          const signature = JSON.stringify(catalogState);
          if (signature !== catalogSignature) {
            catalogSignature = signature;
            await Promise.allSettled([...runtimeClients.values()].map((client) => sendRuntimeMessage(client, createRuntimeMessage(RuntimeMessageType.catalogSnapshot, catalogState))));
          }
          nextCatalogRefreshAt = Date.now() + 5000;
        }
        misses = 0;
      } catch (error) {
        misses += 1;
        if (misses === 1 || misses % 10 === 0) console.error(`${new Date().toISOString()} sync failed (${misses}): ${error.message}`);
        if (misses >= 10 && !(await codexProcess.isRunning())) return;
      }
      await wait(1000);
    }
  } finally {
    await clean();
  }
}

async function restore() {
  await stopController();
  if (await codexProcess.cdpIsReady(() => targetRegistry.discover())) await targetRegistry.removeInjection();
  console.log("侧栏标题增强已移除；Codex 安装包没有被修改。");
}

async function purge() {
  await stopController();
  if (await codexProcess.cdpIsReady(() => targetRegistry.discover())) {
    for (const target of await targetRegistry.discover()) {
      await targetRegistry.evaluate(target, `
        localStorage.removeItem("codex-sidebar-tags-config-v1");
        localStorage.removeItem("codex-sidebar-tags-index-v1");
      `);
    }
    await targetRegistry.removeInjection();
  }
  console.log("侧栏增强及其浏览器缓存已移除；Codex 会话没有被修改。");
}

async function status() {
  const ready = await codexProcess.cdpIsReady(() => targetRegistry.discover());
  const storedPid = await readControllerPid();
  const controllerPid = storedPid !== null && await isOwnedController(storedPid) ? storedPid : null;
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

const command = process.argv[2] ?? "start";
if (command === "start") await start();
else if (command === "apply") console.log(await hotApply());
else if (command === "restore") await restore();
else if (command === "purge") await purge();
else if (command === "status") await status();
else if (command === "watch") await watch();
else throw new Error(`未知命令：${command}`);
