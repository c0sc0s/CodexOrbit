import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DEFAULT_TAG_DEFINITIONS, LEGACY_TONE_COLORS, TAG_COLOR_PRESETS } from "./tag-settings.mjs";
import { createRuntimeMessage, RUNTIME_PROTOCOL_VERSION, RuntimeMessageType } from "./protocol.mjs";

export const RUNTIME_VERSION = "6.0.11";
export const RUNTIME_BINDING = "__codexTagsRequest";
export const SEARCH_BINDING = RUNTIME_BINDING;

const moduleDirectory = dirname(fileURLToPath(import.meta.url));
const bundleCandidates = [
  join(moduleDirectory, "dist", "injected.js"),
  join(moduleDirectory, "..", "dist", "injected.js"),
];
const bundlePath = bundleCandidates.find(existsSync);

if (!bundlePath) {
  throw new Error("Codex Tags runtime bundle is missing. Run `npm run build` before installing.");
}

const injectedBundle = readFileSync(bundlePath, "utf8");

export function buildInjectionExpression(options = {}) {
  const config = {
    version: RUNTIME_VERSION,
    protocolVersion: RUNTIME_PROTOCOL_VERSION,
    tagDefinitions: options.tagDefinitions ?? DEFAULT_TAG_DEFINITIONS,
    settingsSource: options.settingsSource ?? "defaults",
    colorPresets: TAG_COLOR_PRESETS,
    legacyToneColors: LEGACY_TONE_COLORS,
    requestBinding: RUNTIME_BINDING,
  };
  return `(() => { ${injectedBundle}\nreturn CodexTagsInjected.installRuntime(${JSON.stringify(config)}); })()`;
}

export function buildRuntimeMessageExpression(message) {
  return `window.__codexSidebarTags?.handleMessage?.(${JSON.stringify(message)}) ?? false`;
}

export function buildSearchResultExpression(result) {
  const { type: _legacyType, requestId, ...payload } = result;
  return buildRuntimeMessageExpression(createRuntimeMessage(RuntimeMessageType.searchResult, payload, requestId));
}

export function buildRemovalExpression() {
  return "(() => { try { return window.__codexSidebarTags?.dispose?.() ?? false; } catch { return false; } })()";
}
