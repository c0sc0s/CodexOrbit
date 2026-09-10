#!/usr/bin/env node
import { join } from "node:path";
import { homedir } from "node:os";
import { createInstallationManager } from "@c0sc0s/orbit/installation";
import { CodexProcess, PluginTargetRegistry } from "@c0sc0s/orbit";
import { RUNTIME_VERSION } from "./shared/plugin.js";
import { SessionSearchIndex } from "./service/search/search-index.js";
import { SessionCatalog } from "./service/catalog/session-catalog.js";
import { SettingsRepository } from "./service/settings/repository.js";

const platform = createInstallationManager();
const STATE_DIR =
  process.env.CODEX_TAGS_STATE_DIR ??
  join(homedir(), "Library/Application Support/Codex Sidebar Tags");
const PORT = Number(process.env.ORBIT_CDP_PORT ?? process.env.CODEX_TAGS_CDP_PORT ?? 9341);
const codexProcess = new CodexProcess({ port: PORT });
const targetRegistry = new PluginTargetRegistry({
  port: PORT,
  ownsEndpoint: () => codexProcess.ownsCdpEndpoint(),
});
const settingsRepository = new SettingsRepository(join(STATE_DIR, "settings.json"));
const SEARCH_DATABASE_PATH = join(STATE_DIR, "search.sqlite");

async function status() {
  const ready = await codexProcess.cdpIsReady(() => targetRegistry.discover());
  const controllerPid = (await platform.status()).daemon?.pid;
  const codexRunning = await codexProcess.isRunning();
  const activeVersions = [];
  const activeWindows = [];
  if (ready) {
    for (const target of await targetRegistry.discover()) {
      activeVersions.push(
        await targetRegistry.evaluate(target, "window.__codexSidebarTags?.version ?? null"),
      );
      activeWindows.push(
        await targetRegistry.evaluate(target, "window.__codexSidebarTags?.status?.() ?? null"),
      );
    }
  }
  let searchIndex = null;
  try {
    const index = new SessionSearchIndex(SEARCH_DATABASE_PATH, { readOnly: true });
    searchIndex = index.status();
    index.close();
  } catch (error) {
    searchIndex = { error: error instanceof Error ? error.message : "Read failed" };
  }
  const tagSettingsState = await settingsRepository.read();
  const tagSettings = tagSettingsState.exists ? tagSettingsState.settings : null;
  const catalogState = await new SessionCatalog().read();
  const catalog = {
    complete: catalogState.complete,
    count: catalogState.items.length,
    error: catalogState.error,
  };
  console.log(
    JSON.stringify(
      {
        codexRunning,
        cdp: ready,
        controllerPid,
        sourceVersion: RUNTIME_VERSION,
        activeVersions,
        activeWindows,
        searchIndex,
        catalog,
        tagSettings,
        tagSettingsError: tagSettingsState.error,
      },
      null,
      2,
    ),
  );
}

try {
  if ((process.argv[2] ?? "status") !== "status")
    throw new Error("Use Orbit plugin commands to change runtime state");
  await status();
} finally {
  targetRegistry.close();
}
