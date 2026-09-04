import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { titlePatternSource } from "./title-format.mjs";
import { DEFAULT_TAG_DEFINITIONS } from "./tag-settings.mjs";

export const RUNTIME_VERSION = "5.2.2";
export const SEARCH_BINDING = "__codexTagsSearchRequest";

const TONES = DEFAULT_TAG_DEFINITIONS.map(({ name, tone }) => [name, tone]);

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

export function buildInjectionExpression() {
  const config = { version: RUNTIME_VERSION, patternSource: titlePatternSource, toneEntries: TONES, searchBinding: SEARCH_BINDING };
  return `(() => { ${injectedBundle}\nreturn CodexTagsInjected.installRuntime(${JSON.stringify(config)}); })()`;
}

export function buildSearchResultExpression(result) {
  return `window.__codexSidebarTags?.setSearchResult?.(${JSON.stringify(result)}) ?? false`;
}

export function buildRemovalExpression() {
  return "(() => { try { return window.__codexSidebarTags?.dispose?.() ?? false; } catch { return false; } })()";
}
