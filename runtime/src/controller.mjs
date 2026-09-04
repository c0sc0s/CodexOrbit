#!/usr/bin/env node
import { execFile, spawn } from "node:child_process";
import { closeSync, openSync } from "node:fs";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { buildContentIndex } from "./content-index.mjs";
import { buildContentIndexExpression, buildInjectionExpression, buildRemovalExpression, RUNTIME_VERSION } from "./inject-expression.mjs";
import { isOwnedControllerCommand, parseControllerPid } from "./controller-state.mjs";

const run = promisify(execFile);
const configuredPort = Number(process.env.CODEX_TAGS_CDP_PORT ?? 9341);
if (!Number.isSafeInteger(configuredPort) || configuredPort < 1024 || configuredPort > 65535) throw new Error("CODEX_TAGS_CDP_PORT must be an integer between 1024 and 65535");
const PORT = configuredPort;
const APP_PATH = "/Applications/ChatGPT.app";
const EXECUTABLE = join(APP_PATH, "Contents", "MacOS", "ChatGPT");
const SCRIPT_PATH = fileURLToPath(import.meta.url);
const STATE_DIR = process.env.CODEX_TAGS_STATE_DIR ?? dirname(SCRIPT_PATH);
const PID_PATH = join(STATE_DIR, "controller.pid");
const LOG_PATH = join(STATE_DIR, "controller.log");
const CONTENT_REFRESH_INTERVAL_MS = 30_000;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function discoverTargets() {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/list`, {
    redirect: "error",
    signal: AbortSignal.timeout(800),
  });
  if (!response.ok) throw new Error(`CDP discovery failed: HTTP ${response.status}`);
  const targets = await response.json();
  return targets.filter((target) =>
    target?.type === "page"
    && typeof target.url === "string"
    && target.url.startsWith("app://-")
    && typeof target.webSocketDebuggerUrl === "string");
}

async function evaluate(target, expression) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("CDP websocket open timed out")), 3000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("CDP websocket open failed")); }, { once: true });
  });

  try {
    return await new Promise((resolve, reject) => {
      const id = 1;
      const timer = setTimeout(() => reject(new Error("Runtime.evaluate timed out")), 15_000);
      socket.addEventListener("message", (event) => {
        let message;
        try { message = JSON.parse(event.data); } catch { return; }
        if (message.id !== id) return;
        clearTimeout(timer);
        if (message.error) reject(new Error(message.error.message ?? "Runtime.evaluate failed"));
        else if (message.result?.exceptionDetails) reject(new Error(message.result.exceptionDetails.text ?? "injected script failed"));
        else resolve(message.result?.result?.value);
      });
      socket.send(JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: { expression, awaitPromise: true, returnByValue: true },
      }));
    });
  } finally {
    socket.close();
  }
}

async function ensureInjectedTargets() {
  if (!(await cdpBelongsToCodex())) throw new Error(`拒绝连接：127.0.0.1:${PORT} 不属于 Codex`);
  const targets = await discoverTargets();
  if (targets.length === 0) throw new Error("未找到 Codex 主窗口 renderer");
  const results = [];
  const injectedTargetIds = new Set();
  for (const target of targets) {
    const activeVersion = await evaluate(target, "window.__codexSidebarTags?.version ?? null");
    if (activeVersion === RUNTIME_VERSION) {
      results.push(await evaluate(target, "window.__codexSidebarTags.status()"));
      continue;
    }
    results.push(await evaluate(target, buildInjectionExpression()));
    injectedTargetIds.add(target.id);
  }
  return { targets, results, injectedTargetIds };
}

async function collectContentIndex(targets) {
  const threadIds = new Set();
  for (const target of targets) {
    const ids = await evaluate(target, "window.__codexSidebarTags?.contentThreadIds?.() ?? []");
    if (Array.isArray(ids)) ids.forEach((threadId) => threadIds.add(threadId));
  }
  const contentIndex = await buildContentIndex([...threadIds]);
  return { contentIndex, threadSignature: [...threadIds].sort().join("\u0000") };
}

async function apply() {
  const { targets, results } = await ensureInjectedTargets();
  const { contentIndex } = await collectContentIndex(targets);
  const contentExpression = buildContentIndexExpression(contentIndex);
  for (const target of targets) await evaluate(target, contentExpression);
  return results;
}

async function removeInjection() {
  if (!(await cdpBelongsToCodex())) throw new Error(`拒绝连接：127.0.0.1:${PORT} 不属于 Codex`);
  const targets = await discoverTargets();
  for (const target of targets) await evaluate(target, buildRemovalExpression());
}

async function waitForCdp(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      if (await cdpBelongsToCodex() && (await discoverTargets()).length > 0) return;
    } catch {}
    await wait(250);
  }
  throw new Error("等待 Codex CDP 端口超时");
}

async function codexIsRunning() {
  const { stdout } = await run("/bin/ps", ["-axo", "command="]);
  return stdout.split("\n").some((command) => {
    const value = command.trim();
    return value === EXECUTABLE || value.startsWith(`${EXECUTABLE} `);
  });
}

async function cdpBelongsToCodex() {
  let stdout;
  try {
    ({ stdout } = await run("/usr/sbin/lsof", [
      "-nP", `-iTCP:${PORT}`, "-sTCP:LISTEN", "-t",
    ]));
  } catch (error) {
    if (error.code === 1) return false;
    throw error;
  }

  for (const value of stdout.trim().split(/\s+/)) {
    let pid = Number(value);
    for (let depth = 0; Number.isSafeInteger(pid) && pid > 0 && depth < 8; depth += 1) {
      try {
        const [{ stdout: command }, { stdout: parent }] = await Promise.all([
          run("/bin/ps", ["-p", String(pid), "-o", "command="]),
          run("/bin/ps", ["-p", String(pid), "-o", "ppid="]),
        ]);
        if (command.trim().startsWith(EXECUTABLE)) return true;
        pid = Number(parent.trim());
      } catch {
        break;
      }
    }
  }
  return false;
}

async function portIsListening() {
  try {
    const { stdout } = await run("/usr/sbin/lsof", ["-nP", `-iTCP:${PORT}`, "-sTCP:LISTEN", "-t"]);
    return stdout.trim().length > 0;
  } catch (error) {
    if (error.code === 1) return false;
    throw error;
  }
}

async function cdpIsReady() {
  try {
    return await cdpBelongsToCodex() && (await discoverTargets()).length > 0;
  } catch {
    return false;
  }
}

async function quitCodex() {
  if (!(await codexIsRunning())) return;
  await run("/usr/bin/osascript", ["-e", 'tell application id "com.openai.codex" to quit']);
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (!(await codexIsRunning())) return;
    await wait(250);
  }
  throw new Error("Codex 未在 30 秒内正常退出；未强制结束进程");
}

async function launchWithCdp() {
  const child = spawn(EXECUTABLE, [
    "--remote-debugging-address=127.0.0.1",
    `--remote-debugging-port=${PORT}`,
  ], { detached: true, stdio: "ignore" });
  child.unref();
  await waitForCdp();
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
  await mkdir(STATE_DIR, { recursive: true });
  await stopController();
  if (!(await cdpIsReady())) {
    if (await portIsListening()) throw new Error(`端口 ${PORT} 已被其他进程占用；未退出或修改 Codex`);
    await quitCodex();
    await launchWithCdp();
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
  let lastThreadSignature = "";
  let lastContentJson = "";
  let lastContentIndex = [];
  let nextContentRefreshAt = 0;
  let knownTargetIds = new Set();
  const clean = async () => {
    if ((await readControllerPid()) === process.pid) await rm(PID_PATH, { force: true });
  };
  process.once("SIGTERM", () => { clean().finally(() => process.exit(0)); });
  process.once("SIGINT", () => { clean().finally(() => process.exit(0)); });

  try {
    while (true) {
      try {
        const { targets, injectedTargetIds } = await ensureInjectedTargets();
        const currentTargetIds = new Set(targets.map(({ id }) => id));
        const newTargetIds = new Set([...currentTargetIds].filter((id) => !knownTargetIds.has(id)));
        const now = Date.now();
        const threadIds = new Set();
        for (const target of targets) {
          const ids = await evaluate(target, "window.__codexSidebarTags?.contentThreadIds?.() ?? []");
          if (Array.isArray(ids)) ids.forEach((threadId) => threadIds.add(threadId));
        }
        const threadSignature = [...threadIds].sort().join("\u0000");
        const refreshContent = threadSignature !== lastThreadSignature || now >= nextContentRefreshAt;
        let contentChanged = false;
        if (refreshContent) {
          lastContentIndex = await buildContentIndex([...threadIds]);
          const contentJson = JSON.stringify(lastContentIndex);
          contentChanged = contentJson !== lastContentJson;
          lastContentJson = contentJson;
          lastThreadSignature = threadSignature;
          nextContentRefreshAt = now + CONTENT_REFRESH_INTERVAL_MS;
        }
        if (refreshContent || injectedTargetIds.size > 0 || newTargetIds.size > 0) {
          const contentExpression = buildContentIndexExpression(lastContentIndex);
          for (const target of targets) {
            if (contentChanged || injectedTargetIds.has(target.id) || newTargetIds.has(target.id)) await evaluate(target, contentExpression);
          }
        }
        knownTargetIds = currentTargetIds;
        misses = 0;
      } catch (error) {
        misses += 1;
        if (misses === 1 || misses % 10 === 0) console.error(`${new Date().toISOString()} sync failed (${misses}): ${error.message}`);
        if (misses >= 10 && !(await codexIsRunning())) return;
      }
      await wait(2000);
    }
  } finally {
    await clean();
  }
}

async function restore() {
  await stopController();
  if (await cdpIsReady()) await removeInjection();
  console.log("侧栏标题增强已移除；Codex 安装包没有被修改。");
}

async function status() {
  const ready = await cdpIsReady();
  const controllerPid = await readControllerPid();
  const codexRunning = await codexIsRunning();
  const activeVersions = [];
  if (ready) {
    for (const target of await discoverTargets()) {
      activeVersions.push(await evaluate(target, "window.__codexSidebarTags?.version ?? null"));
    }
  }
  console.log(JSON.stringify({ codexRunning, cdp: ready, controllerPid, sourceVersion: RUNTIME_VERSION, activeVersions }, null, 2));
}

const command = process.argv[2] ?? "start";
if (command === "start") await start();
else if (command === "apply") console.log(await hotApply());
else if (command === "restore") await restore();
else if (command === "status") await status();
else if (command === "watch") await watch();
else throw new Error(`未知命令：${command}`);
