import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { ControllerRouter } from "./router.js";
import { createRuntimeMessage, parseRuntimeMessage, RUNTIME_PROTOCOL_VERSION, RuntimeMessageType } from "../shared/protocol.js";
import { TAG_COLOR_PRESETS, LEGACY_TONE_COLORS } from "../shared/tag-settings.js";
import { RUNTIME_VERSION } from "../shared/plugin.js";
import { SessionSearchIndex } from "./search/search-index.js";
import { SessionCatalog } from "./catalog/session-catalog.js";
import { SettingsRepository } from "./settings/repository.js";

import { UpdateService } from "./update/service.js";

import type { ServiceContext, MaybePromise } from "@c0sc0s/orbit/sdk";
import type { RuntimeMessage } from "../shared/protocol.js";
import type { IndexStatus } from "./search/search-index.js";
const run = promisify(execFile);

/** Local search and tag settings depend only on the Loader service SDK. */
export async function activate({ stateDirectory, signal, onDispose, config, rpc, events, clients }: ServiceContext) {
  const dataDirectory = typeof config.dataDirectory === "string" ? config.dataDirectory : stateDirectory;
  const settingsRepository = new SettingsRepository(join(dataDirectory, "settings.json"));
  const searchIndex = new SessionSearchIndex(join(dataDirectory, "search.sqlite"));
  let indexRefresh: Promise<unknown> = Promise.resolve();
  onDispose(async () => { try { await indexRefresh; } finally { searchIndex.close(); } });
  const catalog = new SessionCatalog();
  let catalogState = await catalog.read();
  let catalogSignature = JSON.stringify(catalogState);
  let indexStatus: IndexStatus = { phase: "indexing", completed: 0, total: 0, changed: 0 };
  let settingsState = await settingsRepository.read();
  const send = (client: { id: string }, message: RuntimeMessage<string, object>) => { events.publish("message", message, client.id); return Promise.resolve(); };
  const updater = new UpdateService(dataDirectory, (status) => events.publish("message", createRuntimeMessage(RuntimeMessageType.updateSnapshot, status)), { currentVersion: typeof config.packageVersion === "string" ? config.packageVersion : undefined });
  await updater.refresh();
  const router = new ControllerRouter({
    searchIndex, settingsRepository,
    getSettings: () => settingsState.settings,
    onSettingsChanged: async (settings) => {
      settingsState = { settings, exists: true, error: null };
      events.publish("message", createRuntimeMessage(RuntimeMessageType.settingsSnapshot, { settings }));
    },
    waitForIndex: () => indexRefresh, getIndexStatus: () => indexStatus, send,
    openSession: async (threadId) => {
      if (catalogState.items.some((item) => item.threadId === threadId)) await run("/usr/bin/open", [`codex://threads/${threadId}`]);
    },
  });
  // The first connected window may supply a locally cached configuration before a settings file exists.
  let bootstrap: Promise<unknown> = Promise.resolve();
  rpc.handle("bootstrap", (payload) => {
    bootstrap = bootstrap.catch(() => {}).then(async () => {
      if (!settingsState.exists && !settingsState.error && payload && typeof payload === "object" && "tags" in payload && Array.isArray(payload.tags)) {
        const result = await settingsRepository.write(payload.tags);
        settingsState = { settings: result.settings, exists: true, error: null };
      }
      return {
        version: RUNTIME_VERSION, protocolVersion: RUNTIME_PROTOCOL_VERSION,
        tagDefinitions: settingsState.settings.tags, settingsSource: settingsState.exists ? "repository" : "defaults",
        colorPresets: TAG_COLOR_PRESETS, legacyToneColors: LEGACY_TONE_COLORS,
      };
    });
    return bootstrap;
  });
  rpc.handle("dispatch", (value, { clientId }) => {
    const parsed = parseRuntimeMessage(value);
    if (!parsed.ok) return false;
    const message = parsed.message;
    if (message?.protocolVersion === RUNTIME_PROTOCOL_VERSION && message.type === RuntimeMessageType.updateCheck) return updater.check(message.payload?.force === true);
    if (message?.protocolVersion === RUNTIME_PROTOCOL_VERSION && message.type === RuntimeMessageType.updateInstall) return updater.install();
    return router.handle({ id: clientId }, message);
  });
  clients.onConnect(async (id) => {
    await send({ id }, createRuntimeMessage(RuntimeMessageType.updateSnapshot, updater.state));
    await router.sendSettingsSnapshot({ id });
    await send({ id }, createRuntimeMessage(RuntimeMessageType.catalogSnapshot, catalogState));
  });
  clients.onDisconnect((id) => router.forgetTarget(id));

  const refreshIndex = () => {
    indexRefresh = searchIndex.refresh((status) => { indexStatus = status; }).catch(() => {
      indexStatus = { phase: "error", message: "Local search refresh failed" };
    });
    return indexRefresh;
  };
  const repeat = (callback: () => MaybePromise<unknown>, interval: number) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try { await callback(); } catch { /* The last valid snapshot remains available. */ }
      if (!signal.aborted) timer = setTimeout(tick, interval);
    };
    onDispose(() => clearTimeout(timer));
    void tick();
  };
  repeat(async () => { if (updater.state.phase === "updating") await updater.refresh(); }, 1000);
  repeat(refreshIndex, 30_000);
  repeat(async () => {
    const next = await catalog.read();
    const signature = JSON.stringify(next);
    if (signature !== catalogSignature) {
      catalogState = next; catalogSignature = signature;
      events.publish("message", createRuntimeMessage(RuntimeMessageType.catalogSnapshot, catalogState));
    }
  }, 5000);
}
