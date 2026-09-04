import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { titlePatternSource } from "./title-format.mjs";

export const RUNTIME_VERSION = "4.0.0";

const TONES = [
  ["Pending", "amber"], ["进行中", "blue"], ["需求", "blue"], ["Feature", "blue"],
  ["Bug", "red"], ["阻塞", "red"], ["调研", "purple"], ["设计", "purple"], ["完成", "green"],
];

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
  const config = { version: RUNTIME_VERSION, patternSource: titlePatternSource, toneEntries: TONES };
  return `(() => { ${injectedBundle}\nreturn CodexTagsInjected.installRuntime(${JSON.stringify(config)}); })()`;
}

export function buildContentIndexExpression(contentIndex) {
  return `window.__codexSidebarTags?.setContentIndex?.(${JSON.stringify(contentIndex)}) ?? 0`;
}

export function buildRemovalExpression() {
  return "(() => { try { return window.__codexSidebarTags?.dispose?.() ?? false; } catch { return false; } })()";
}
