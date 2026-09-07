import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";
import { ControllerRouter } from "./controller-router.mjs";
import { createRuntimeMessage, RUNTIME_PROTOCOL_VERSION, RuntimeMessageType } from "./protocol.mjs";
import { TAG_COLOR_PRESETS, LEGACY_TONE_COLORS } from "./tag-settings.mjs";
import { RUNTIME_VERSION } from "./tags-plugin.mjs";
import { SessionSearchIndex } from "./search-index.mjs";
import { SessionCatalog } from "./session-catalog.mjs";
import { SettingsRepository } from "./settings-repository.mjs";

const run = promisify(execFile);

/** Local search and tag settings depend only on the Loader service SDK. */
export async function activate({ stateDirectory, signal, onDispose, config, rpc, events, clients }) {
  const dataDirectory = typeof config.dataDirectory === "string" ? config.dataDirectory : stateDirectory;
  const settingsRepository = new SettingsRepository(join(dataDirectory, "settings.json"));
  const searchIndex = new SessionSearchIndex(join(dataDirectory, "search.sqlite"));
  let indexRefresh = Promise.resolve();
  onDispose(async () => { try { await indexRefresh; } finally { searchIndex.close(); } });
  const catalog = new SessionCatalog();
  let catalogState = await catalog.read();
  let catalogSignature = JSON.stringify(catalogState);
  let indexStatus = { phase: "indexing", completed: 0, total: 0, changed: 0 };
  let settingsState = await settingsRepository.read();
  const send = (client, message) => { events.publish("message", message, client.id); return Promise.resolve(); };
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
  let bootstrap = Promise.resolve();
  rpc.handle("bootstrap", (payload) => {
    bootstrap = bootstrap.catch(() => {}).then(async () => {
      if (!settingsState.exists && !settingsState.error && Array.isArray(payload?.tags)) {
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
  rpc.handle("dispatch", (message, { clientId }) => router.handle({ id: clientId }, message));
  clients.onConnect(async (id) => {
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
  const repeat = (callback, interval) => {
    let timer;
    const tick = async () => {
      try { await callback(); } catch { /* The last valid snapshot remains available. */ }
      if (!signal.aborted) timer = setTimeout(tick, interval);
    };
    onDispose(() => clearTimeout(timer));
    void tick();
  };
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
