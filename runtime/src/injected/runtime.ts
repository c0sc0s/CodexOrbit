// The Codex DOM adapter is intentionally isolated while its dynamic private-DOM
// surface is migrated to explicit adapter types.
// @ts-nocheck
import { renderResultsList } from "./components/results-list";
import {
  codexSelectors,
  findNavigationButton,
  findProjectRow,
  findVisibleThreadRow,
  mutationContainsSidebarNode,
  queryThreadTitles,
} from "./codex-dom-adapter";
import { selectVisibleEntries } from "./search";
import { createInitialState } from "./store";

export interface RuntimeConfig {
  version: string;
  patternSource: string;
  toneEntries: Array<[string, string]>;
  initialContentIndex?: Array<{ threadId: string; chunks: Array<{ role: string; text: string }> }>;
}

export function installRuntime(config: RuntimeConfig) {
  const { version, patternSource, toneEntries, initialContentIndex = [] } = config;
  const STYLE_ID = "codex-sidebar-tags-style";
  const TOOLBAR_ID = "codex-sidebar-tags-toolbar";
  const CACHE_KEY = "codex-sidebar-tags-index-v1";
  const TAG_CONFIG_KEY = "codex-sidebar-tags-config-v1";
  const ENHANCED = "data-codex-sidebar-tags-enhanced";
  const RAW = "data-codex-sidebar-tags-raw";
  const previous = window.__codexSidebarTags;
  if (previous?.version === version) return previous.status();
  try { previous?.dispose?.(); } catch {}

  const pattern = new RegExp(patternSource, "u");
  let tagDefinitions = toneEntries.map(([name, tone]) => ({ name, tone }));
  try {
    const savedDefinitions = JSON.parse(localStorage.getItem(TAG_CONFIG_KEY) ?? "null");
    if (Array.isArray(savedDefinitions)) {
      tagDefinitions = savedDefinitions.filter((item) => item && typeof item.name === "string" && typeof item.tone === "string");
    }
  } catch {}
  let tones = new Map(tagDefinitions.map(({ name, tone }) => [name.toLocaleLowerCase(), tone]));
  const contentByThread = new Map(initialContentIndex.map(({ threadId, chunks }) => [threadId, Array.isArray(chunks) ? chunks : []]));
  let contentIndexJson = JSON.stringify(initialContentIndex);
  const state = createInitialState();
  const entryCache = new Map();
  const originalNodeState = new WeakMap();
  let host = null;
  let modal = null;
  let navTemplate = null;
  let queued = false;
  let renderedIndexSignature = null;
  let persistedCacheJson = null;
  let renderCount = 0;
  let observerRefreshCount = 0;
  let pinnedToggleRef = null;
  let pointerActive = false;
  let pendingToolbarRefresh = false;
  const debugEvents = [];

  const trace = (event, details = {}) => {
    debugEvents.push({ at: new Date().toISOString(), event, ...details });
    if (debugEvents.length > 80) debugEvents.shift();
  };

  const parse = (value) => {
    const raw = typeof value === "string" ? value.trim() : "";
    const match = pattern.exec(raw);
    if (!match) return raw ? { raw, tag: "未分类", time: "", title: raw, tone: "neutral", tagged: false } : null;
    const tag = (match[1] ?? match[2] ?? "").trim();
    const time = (match[3] ?? match[4] ?? "").trim();
    const title = match[5].trim();
    if (!tag || !title) return null;
    return { raw, tag, time, title, tone: tones.get(tag.toLocaleLowerCase()) ?? "neutral", tagged: true };
  };

  try {
    const savedEntries = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
    if (Array.isArray(savedEntries)) {
      savedEntries.forEach((entry) => {
        if (entry && typeof entry.key === "string" && typeof entry.raw === "string") entryCache.set(entry.key, entry);
      });
      persistedCacheJson = JSON.stringify(savedEntries);
    }
  } catch {}

  const persistCache = () => {
    try {
      const savedEntries = Array.from(entryCache.values(), ({ node, row, ...entry }) => entry);
      const nextCacheJson = JSON.stringify(savedEntries);
      if (nextCacheJson === persistedCacheJson) return;
      localStorage.setItem(CACHE_KEY, nextCacheJson);
      persistedCacheJson = nextCacheJson;
    } catch {}
  };

  const persistTagDefinitions = () => {
    try { localStorage.setItem(TAG_CONFIG_KEY, JSON.stringify(tagDefinitions)); } catch {}
  };

  const syncTagDefinitions = () => {
    tones = new Map(tagDefinitions.map(({ name, tone }) => [name.toLocaleLowerCase(), tone]));
    entryCache.forEach((entry) => { entry.tone = tones.get(entry.tag.toLocaleLowerCase()) ?? "neutral"; });
    document.querySelectorAll(`[${ENHANCED}]`).forEach((node) => {
      const parsed = parse(node.getAttribute(RAW));
      const chip = node.querySelector(":scope > .codex-sidebar-tag-layout > .codex-sidebar-tag-chip");
      if (parsed && chip) chip.dataset.tone = parsed.tone;
    });
    persistCache();
    persistTagDefinitions();
  };

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head ?? document.documentElement).appendChild(style);
  }
  style.textContent = `
    [data-thread-title][${ENHANCED}] { min-width: 0; }
    .codex-sidebar-tag-layout { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 6px; min-width: 0; max-width: 100%; vertical-align: middle; }
    .codex-sidebar-filter-chip {
      display: inline-flex; flex: 0 0 auto; align-items: center; border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      border-radius: 999px; font-weight: 650; letter-spacing: .01em;
    }
    .codex-sidebar-tag-chip, .codex-sidebar-result-tag {
      display: inline-flex; align-items: center; min-width: 0; height: 18px; padding: 0;
      border: 0; background: transparent; font-size: 10px; font-weight: 600; line-height: 18px; white-space: nowrap;
    }
    .codex-sidebar-tag-chip[data-tone="amber"], .codex-sidebar-result-tag[data-tone="amber"] { color: #9a6700; }
    .codex-sidebar-tag-chip[data-tone="blue"], .codex-sidebar-result-tag[data-tone="blue"] { color: #2c6db2; }
    .codex-sidebar-tag-chip[data-tone="red"], .codex-sidebar-result-tag[data-tone="red"] { color: #c53b3b; }
    .codex-sidebar-tag-chip[data-tone="purple"], .codex-sidebar-result-tag[data-tone="purple"] { color: #7651ad; }
    .codex-sidebar-tag-chip[data-tone="green"], .codex-sidebar-result-tag[data-tone="green"] { color: #277653; }
    .codex-sidebar-tag-chip[data-tone="neutral"], .codex-sidebar-result-tag[data-tone="neutral"] {
      color: var(--color-text-tertiary, var(--color-token-text-tertiary, #777));
    }
    .codex-sidebar-tag-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    #${TOOLBAR_ID} {
      display: contents; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
    }
    .codex-sidebar-dashboard-entry { display: contents; }
    .codex-sidebar-dashboard-launcher { width: 100%; color: inherit; font: inherit; }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"] {
      display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 12px; border: 0; border-radius: 6px;
      background: transparent; text-align: left; cursor: pointer;
    }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"]:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-dashboard-launcher:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: -2px; }

    .codex-sidebar-dashboard-overlay {
      position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px;
      background: #0006; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    }
    .codex-sidebar-dashboard-dialog {
      display: flex; width: min(680px, calc(100vw - 40px)); max-height: min(720px, calc(100vh - 48px)); flex-direction: column;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 16px;
      color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: var(--color-background-elevated-base, var(--color-token-menu-background, #181818));
      box-shadow: 0 24px 70px #0007, 0 4px 18px #0003; overflow: hidden;
    }
    .codex-sidebar-dashboard-header { display: flex; align-items: center; gap: 12px; padding: 15px 16px 12px; border-bottom: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); }
    .codex-sidebar-dashboard-heading { margin: 0; font-size: 17px; font-weight: 650; }
    .codex-sidebar-dashboard-subtitle { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-dashboard-tabs { display: flex; gap: 3px; margin-left: auto; padding: 3px; border-radius: 8px; background: var(--color-background-control, var(--color-token-input-background, #8881)); }
    .codex-sidebar-dashboard-tab { height: 29px; padding: 0 11px; border: 0; border-radius: 6px; color: var(--color-text-secondary, inherit); background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
    .codex-sidebar-dashboard-tab[aria-selected="true"] { color: var(--color-text-foreground, inherit); background: var(--color-background-elevated-high, var(--color-token-list-active-selection-background, #8883)); box-shadow: 0 1px 2px #0002; }
    .codex-sidebar-dashboard-close { display: grid; width: 28px; height: 28px; place-items: center; padding: 0; border: 0; border-radius: 7px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; font-size: 17px; cursor: pointer; }
    .codex-sidebar-dashboard-close:hover { color: var(--color-text-foreground, inherit); background: var(--color-token-toolbar-hover-background, #8882); }
    .codex-sidebar-dashboard-body { min-height: 0; padding: 14px 16px 16px; overflow-y: auto; }
    .codex-sidebar-dashboard-controls { display: flex; align-items: center; gap: 8px; }
    .codex-sidebar-search {
      display: flex; flex: 1 1 auto; align-items: center; min-width: 0; height: 36px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      background: var(--color-background-control, var(--color-token-input-background, #8881)); transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .codex-sidebar-search:focus-within {
      border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff));
      background: var(--color-background-control-opaque, var(--color-token-input-background, #8882));
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent);
    }
    .codex-sidebar-search-icon { width: 29px; flex: 0 0 29px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 15px; text-align: center; pointer-events: none; }
    .codex-sidebar-search-input {
      width: 100%; min-width: 0; border: 0; outline: 0; padding: 0 7px 0 0; color: var(--color-text-foreground, var(--color-token-input-foreground, inherit));
      background: transparent; font: inherit; font-size: 14px;
    }
    .codex-sidebar-search-input::placeholder { color: var(--color-text-tertiary, var(--color-token-input-placeholder-foreground, #888)); }
    .codex-sidebar-sort-control {
      position: relative; display: flex; flex: 0 0 144px; align-items: center; height: 36px;
    }
    .codex-sidebar-sort-trigger {
      display: flex; width: 100%; height: 36px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      color: var(--color-text-foreground, var(--color-token-input-foreground, inherit)); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px; cursor: pointer;
    }
    .codex-sidebar-sort-trigger:hover { background: var(--color-background-control-opaque, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-sort-trigger:focus-visible, .codex-sidebar-sort-trigger[aria-expanded="true"] { outline: 0; border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-sort-label { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); pointer-events: none; }
    .codex-sidebar-sort-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .codex-sidebar-sort-chevron { width: 7px; height: 7px; margin: -3px 2px 0 auto; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; opacity: .7; transform: rotate(45deg); transition: transform 120ms ease; }
    .codex-sidebar-sort-trigger[aria-expanded="true"] .codex-sidebar-sort-chevron { margin-top: 3px; transform: rotate(225deg); }
    .codex-sidebar-sort-menu {
      position: absolute; top: calc(100% + 5px); right: 0; z-index: 8; width: 144px; padding: 4px;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 9px;
      color: var(--color-text-foreground, var(--color-token-dropdown-foreground, inherit)); background: var(--color-background-elevated-high, var(--color-token-menu-background, #202020));
      box-shadow: 0 12px 32px #0006, 0 2px 8px #0003;
    }
    .codex-sidebar-sort-option { display: flex; width: 100%; height: 32px; align-items: center; padding: 0 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; text-align: left; cursor: pointer; }
    .codex-sidebar-sort-option:hover, .codex-sidebar-sort-option:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-sort-option[aria-selected="true"] { background: var(--color-token-list-active-selection-background, #8883); }
    .codex-sidebar-sort-check { width: 14px; margin-left: auto; color: var(--color-text-secondary, inherit); text-align: center; }
    .codex-sidebar-filter-rail { display: flex; gap: 5px; margin-top: 10px; padding: 0 1px 2px; overflow-x: auto; scrollbar-width: none; }
    .codex-sidebar-filter-rail::-webkit-scrollbar { display: none; }
    .codex-sidebar-filter-chip {
      height: 27px; padding: 0 7px; border-color: transparent; color: var(--color-text-secondary, var(--color-token-text-secondary, inherit));
      background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 12px; cursor: pointer; transition: transform 100ms ease, color 100ms ease, background 100ms ease;
    }
    .codex-sidebar-filter-chip:hover { background: var(--color-background-control, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-filter-chip:active { transform: scale(.97); }
    .codex-sidebar-filter-chip[aria-pressed="true"] {
      color: var(--color-text-foreground, var(--color-token-list-active-selection-foreground, inherit));
      border-color: var(--color-border-light, var(--color-token-border-light, #8884));
      background: var(--color-background-elevated-base, var(--color-token-list-active-selection-background, #8883)); box-shadow: 0 1px 2px #0001;
    }
    .codex-sidebar-filter-count { margin-left: 4px; opacity: .62; font-variant-numeric: tabular-nums; }
    .codex-sidebar-results {
      margin-top: 12px; padding: 6px; border: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius: 11px;
      background: var(--color-background-surface, var(--color-token-bg-secondary, #8881)); overflow-anchor: none;
    }
    .codex-sidebar-results-head { display: flex; align-items: center; justify-content: space-between; min-height: 26px; padding: 0 5px 5px 7px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-results-list { max-height: min(430px, calc(100vh - 250px)); overflow-y: auto; overscroll-behavior: contain; }
    .codex-sidebar-result-group {
      position: sticky; top: 0; z-index: 1; padding: 5px 7px 3px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888));
      background: var(--color-background-elevated-base, var(--color-token-menu-background, #181818)); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    }
    .codex-sidebar-result {
      display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 8px; width: 100%; min-height: 40px; padding: 8px;
      border: 0; border-radius: 8px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: transparent; text-align: left; font: inherit; cursor: pointer;
    }
    .codex-sidebar-result:hover, .codex-sidebar-result:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-result-tag { font-size: 11px; }
    .codex-sidebar-result-content { min-width: 0; }
    .codex-sidebar-result-title { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 1.4; }
    .codex-sidebar-result-snippet { display: -webkit-box; margin-top: 4px; overflow: hidden; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .codex-sidebar-search-mark {
      padding: 0 1px; border-radius: 3px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
      background: color-mix(in srgb, var(--color-border-focus, var(--color-token-focus-border, #4b8cff)) 32%, transparent);
      font-weight: 650; box-decoration-break: clone; -webkit-box-decoration-break: clone;
    }
    .codex-sidebar-results-empty { padding: 17px 8px 19px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 13px; text-align: center; }
    .codex-sidebar-tag-settings-note { margin: 0 0 12px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 13px; line-height: 1.5; }
    .codex-sidebar-tag-form { display: grid; grid-template-columns: minmax(0, 1fr) 105px auto; gap: 8px; margin-bottom: 12px; }
    .codex-sidebar-tag-input, .codex-sidebar-tag-tone {
      height: 32px; min-width: 0; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px; outline: 0;
      color: var(--color-text-foreground, inherit); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px;
    }
    .codex-sidebar-tag-input { padding: 0 9px; }
    .codex-sidebar-tag-tone { padding: 0 20px 0 8px; }
    .codex-sidebar-tag-input:focus, .codex-sidebar-tag-tone:focus { border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-tag-add { height: 32px; padding: 0 12px; border: 1px solid var(--color-border-light, #8884); border-radius: 8px; color: var(--color-token-button-foreground, inherit); background: var(--color-token-button-background, #8882); font: inherit; font-size: 13px; cursor: pointer; }
    .codex-sidebar-tag-error { min-height: 18px; margin: -5px 0 5px; color: #c53b3b; font-size: 12px; }
    .codex-sidebar-tag-config-list { display: grid; gap: 5px; }
    .codex-sidebar-tag-config-row { display: grid; grid-template-columns: minmax(0, 1fr) 80px 28px; align-items: center; min-height: 36px; padding: 0 7px 0 10px; border-radius: 8px; background: var(--color-background-control, var(--color-token-input-background, #8881)); }
    .codex-sidebar-tag-config-tone { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-tag-delete { display: grid; width: 26px; height: 26px; place-items: center; padding: 0; border: 0; border-radius: 6px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; cursor: pointer; }
    .codex-sidebar-tag-delete:hover { color: #c53b3b; background: #ef444418; }
    @media (prefers-color-scheme: dark) {
      .codex-sidebar-tag-chip[data-tone="amber"], .codex-sidebar-result-tag[data-tone="amber"] { color: #f2b84b; }
      .codex-sidebar-tag-chip[data-tone="blue"], .codex-sidebar-result-tag[data-tone="blue"] { color: #6ba8ed; }
      .codex-sidebar-tag-chip[data-tone="red"], .codex-sidebar-result-tag[data-tone="red"] { color: #ef7777; }
      .codex-sidebar-tag-chip[data-tone="purple"], .codex-sidebar-result-tag[data-tone="purple"] { color: #b894e8; }
      .codex-sidebar-tag-chip[data-tone="green"], .codex-sidebar-result-tag[data-tone="green"] { color: #64bd8e; }
    }
    @media (max-width: 760px) {
      .codex-sidebar-dashboard-overlay { padding: 10px; }
      .codex-sidebar-dashboard-dialog { width: calc(100vw - 20px); max-height: calc(100vh - 20px); }
      .codex-sidebar-dashboard-header { flex-wrap: wrap; }
      .codex-sidebar-dashboard-tabs { order: 3; width: 100%; margin-left: 0; }
      .codex-sidebar-dashboard-tab { flex: 1; }
      .codex-sidebar-tag-form { grid-template-columns: 1fr 92px; }
      .codex-sidebar-tag-add { grid-column: 1 / -1; }
      .codex-sidebar-results-list { max-height: calc(100vh - 300px); }
    }
    @media (prefers-reduced-motion: reduce) { .codex-sidebar-filter-chip, .codex-sidebar-search { transition: none; } }
  `;

  const restoreNode = (node) => {
    const raw = node.getAttribute(RAW);
    if (raw === null) return;
    const original = originalNodeState.get(node);
    if (original) node.replaceChildren(...original.children.map((child) => child.cloneNode(true)));
    else node.replaceChildren(document.createTextNode(raw));
    node.removeAttribute(ENHANCED);
    node.removeAttribute(RAW);
    if (original?.ariaLabel === null || !original) node.removeAttribute("aria-label");
    else node.setAttribute("aria-label", original.ariaLabel);
    if (original?.title === null || !original) node.removeAttribute("title");
    else node.setAttribute("title", original.title);
    originalNodeState.delete(node);
  };

  const enhanceNode = (node) => {
    if (!(node instanceof HTMLElement) || node.closest(`#${TOOLBAR_ID}`)) return;
    const generated = node.querySelector(":scope > .codex-sidebar-tag-layout");
    if (node.getAttribute(ENHANCED) === version && generated) return;
    const existingRaw = node.getAttribute(RAW);
    const raw = existingRaw !== null && generated ? existingRaw : (node.textContent?.trim() ?? "");
    const parsed = parse(raw);
    if (!parsed?.tagged) { if (existingRaw !== null) restoreNode(node); return; }
    if (!originalNodeState.has(node)) {
      originalNodeState.set(node, {
        children: [...node.childNodes].map((child) => child.cloneNode(true)),
        ariaLabel: node.getAttribute("aria-label"),
        title: node.getAttribute("title"),
      });
    }

    const layout = document.createElement("span");
    layout.className = "codex-sidebar-tag-layout";
    const tag = document.createElement("span");
    tag.className = "codex-sidebar-tag-chip";
    tag.dataset.tone = parsed.tone;
    tag.textContent = parsed.tag;
    layout.appendChild(tag);
    const title = document.createElement("span");
    title.className = "codex-sidebar-tag-title";
    title.textContent = parsed.title;
    layout.appendChild(title);
    node.setAttribute(RAW, parsed.raw);
    node.setAttribute(ENHANCED, version);
    node.setAttribute("aria-label", parsed.raw);
    node.setAttribute("title", parsed.raw);
    node.replaceChildren(layout);
  };

  const titleNodes = () => queryThreadTitles(TOOLBAR_ID);

  const commonAncestor = (left, right) => {
    if (!left || !right) return left?.parentElement ?? null;
    const parents = new Set();
    for (let node = left; node; node = node.parentElement) parents.add(node);
    for (let node = right; node; node = node.parentElement) if (parents.has(node)) return node;
    return null;
  };

  const ensureToolbar = (nodes) => {
    if (host?.isConnected) return host;
    host = document.getElementById(TOOLBAR_ID);
    if (host) return host;
    const pluginsButton = findNavigationButton("Plugins");
    if (pluginsButton) {
      navTemplate = pluginsButton;
      const anchor = pluginsButton.parentElement?.classList.contains("contents") ? pluginsButton.parentElement : pluginsButton;
      host = document.createElement("div");
      host.id = TOOLBAR_ID;
      host.setAttribute("aria-label", "看板");
      anchor.insertAdjacentElement("afterend", host);
      return host;
    }
    const pinnedToggle = pinnedToggleRef?.isConnected
      ? pinnedToggleRef
      : document.querySelector(codexSelectors.sectionToggle);
    const projectRow = document.querySelector(codexSelectors.projectRow);
    const first = nodes[0] ?? pinnedToggle ?? projectRow;
    if (!first) return null;
    const projectsHeader = document.querySelector(codexSelectors.projectsHeader);
    const boundary = commonAncestor(first, projectsHeader ?? projectRow ?? nodes[nodes.length - 1] ?? first);
    if (!(boundary instanceof HTMLElement)) return null;
    let anchor = first;
    while (anchor.parentElement && anchor.parentElement !== boundary) anchor = anchor.parentElement;
    host = document.createElement("div");
    host.id = TOOLBAR_ID;
    host.setAttribute("aria-label", "会话看板");
    boundary.insertBefore(host, anchor);
    return host;
  };

  const projectIdForRow = (row) => {
    for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
      const projectRows = parent.querySelectorAll(codexSelectors.projectRow);
      if (projectRows.length !== 1) continue;
      return projectRows[0].getAttribute("data-app-action-sidebar-project-id");
    }
    return null;
  };

  const sectionToggleForRow = (row) => {
    for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
      const toggles = parent.querySelectorAll(codexSelectors.sectionToggle);
      if (toggles.length === 1) return toggles[0];
    }
    return null;
  };

  const entriesFrom = (nodes) => {
    nodes.forEach((node, index) => {
      const raw = node.getAttribute(RAW) ?? node.textContent?.trim() ?? "";
      const parsed = parse(raw);
      if (!parsed) return;
      const row = node.closest(codexSelectors.threadRow);
      const threadId = row?.getAttribute("data-app-action-sidebar-thread-id");
      const key = threadId ?? `title:${raw}`;
      const pinned = row?.getAttribute("data-app-action-sidebar-thread-pinned") === "true";
      if (pinned) pinnedToggleRef = sectionToggleForRow(row) ?? pinnedToggleRef;
      entryCache.set(key, {
        ...parsed,
        key,
        threadId,
        node,
        row,
        index: entryCache.get(key)?.index ?? index,
        pinned,
        projectId: projectIdForRow(row),
      });
    });
    persistCache();
    return Array.from(entryCache.values()).map((entry) => ({
      ...entry,
      node: entry.node?.isConnected ? entry.node : null,
      row: entry.row?.isConnected ? entry.row : null,
    }));
  };

  const openEntry = async (entry) => {
    let row = entry.row?.isConnected && entry.row.getClientRects().length > 0 ? entry.row : findVisibleThreadRow(entry.threadId);
    trace("open-entry", { threadId: entry.threadId, projectId: entry.projectId, pinned: entry.pinned, visibleRow: Boolean(row) });
    if (!row && entry.pinned) {
      const pinnedToggle = pinnedToggleRef?.isConnected
        ? pinnedToggleRef
        : document.querySelector(codexSelectors.sectionToggle);
      if (pinnedToggle && !document.querySelector("[data-app-action-sidebar-thread-pinned='true']")) pinnedToggle.click();
    }
    if (!row && entry.projectId) {
      const projectRow = findProjectRow(entry.projectId);
      if (projectRow?.getAttribute("data-app-action-sidebar-project-collapsed") === "true") {
        trace("expand-project", { projectId: entry.projectId });
        projectRow.click();
      }
    }
    for (let attempt = 0; !row && attempt < 80; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      row = findVisibleThreadRow(entry.threadId);
    }
    if (row) {
      state.query = "";
      state.tag = "all";
      state.sortOpen = false;
      state.open = false;
      renderToolbar(entriesFrom(titleNodes()));
      row.scrollIntoView({ block: "nearest" });
      row.click();
    } else {
      entryCache.delete(entry.key);
      persistCache();
      renderToolbar(entriesFrom(titleNodes()));
    }
  };

  const indexSignature = (entries) => entries
    .map((entry) => [entry.key, entry.raw, entry.pinned, entry.projectId].join("\u0001"))
    .join("\u0002");

  const button = (className, text) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = text;
    return element;
  };

  const renderToolbar = (entries, reason = "state") => {
    const toolbar = ensureToolbar(entries.map((entry) => entry.node).filter(Boolean));
    if (!toolbar) return;
    pendingToolbarRefresh = false;
    renderedIndexSignature = indexSignature(entries);
    renderCount += 1;
    trace("render", { reason, count: entries.length, open: state.open });
    const activeInput = document.activeElement?.matches?.(".codex-sidebar-search-input, .codex-sidebar-tag-input") ? document.activeElement : null;
    const activeInputClass = activeInput?.className ?? null;
    const selectionStart = activeInput?.selectionStart ?? null;
    modal?.remove();
    modal = null;
    toolbar.replaceChildren();

    const entry = document.createElement("div");
    entry.className = "codex-sidebar-dashboard-entry";
    const launcher = navTemplate?.cloneNode(true) ?? button("", "Tags");
    launcher.classList.add("codex-sidebar-dashboard-launcher");
    if (!navTemplate) launcher.dataset.dashboardFallback = "true";
    launcher.querySelector(".text-fade-truncate")?.replaceChildren(document.createTextNode("Tags"));
    const icon = launcher.querySelector("svg");
    if (icon) {
      icon.replaceChildren();
      [[2, 2], [8.5, 2], [2, 8.5], [8.5, 8.5]].forEach(([x, y]) => {
        const tile = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        tile.setAttribute("x", String(x));
        tile.setAttribute("y", String(y));
        tile.setAttribute("width", "5.5");
        tile.setAttribute("height", "5.5");
        tile.setAttribute("rx", "1");
        tile.setAttribute("stroke", "currentColor");
        tile.setAttribute("stroke-width", "1.15");
        icon.appendChild(tile);
      });
    }
    launcher.title = "打开 Tags";
    launcher.setAttribute("aria-label", "打开 Tags");
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-expanded", String(state.open));
    launcher.addEventListener("click", () => {
      state.open = true;
      state.view = "sessions";
      state.sortOpen = false;
      renderToolbar(entriesFrom(titleNodes()), "open-dashboard");
    });
    entry.appendChild(launcher);
    toolbar.appendChild(entry);

    if (!state.open) return;

    const overlay = document.createElement("div");
    overlay.className = "codex-sidebar-dashboard-overlay";
    const dialog = document.createElement("section");
    dialog.className = "codex-sidebar-dashboard-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "会话看板");
    const header = document.createElement("header");
    header.className = "codex-sidebar-dashboard-header";
    const headingGroup = document.createElement("div");
    const heading = document.createElement("h2");
    heading.className = "codex-sidebar-dashboard-heading";
    heading.textContent = state.view === "sessions" ? "会话看板" : "标签设置";
    const subtitle = document.createElement("div");
    subtitle.className = "codex-sidebar-dashboard-subtitle";
    const contentIndexedCount = entries.filter((item) => contentByThread.has(item.threadId)).length;
    subtitle.textContent = state.view === "sessions"
      ? `${entries.length} 个会话 · ${contentIndexedCount} 个正文索引`
      : `${tagDefinitions.length} 个已配置标签`;
    headingGroup.append(heading, subtitle);
    const tabs = document.createElement("div");
    tabs.className = "codex-sidebar-dashboard-tabs";
    tabs.setAttribute("role", "tablist");
    [["sessions", "会话"], ["settings", "标签设置"]].forEach(([value, label]) => {
      const tab = button("codex-sidebar-dashboard-tab", label);
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(state.view === value));
      tab.addEventListener("click", () => { state.view = value; state.sortOpen = false; state.tagError = ""; renderToolbar(entriesFrom(titleNodes()), "dashboard-tab"); });
      tabs.appendChild(tab);
    });
    const close = button("codex-sidebar-dashboard-close", "×");
    close.title = "关闭";
    close.setAttribute("aria-label", "关闭会话看板");
    close.addEventListener("click", () => { state.open = false; state.sortOpen = false; renderToolbar(entriesFrom(titleNodes()), "close-dashboard"); });
    header.append(headingGroup, tabs, close);
    const body = document.createElement("div");
    body.className = "codex-sidebar-dashboard-body";

    if (state.view === "sessions") {
      const controls = document.createElement("div");
      controls.className = "codex-sidebar-dashboard-controls";
      const search = document.createElement("label");
      search.className = "codex-sidebar-search";
      const searchIcon = document.createElement("span");
      searchIcon.className = "codex-sidebar-search-icon";
      searchIcon.textContent = "⌕";
      const input = document.createElement("input");
      input.className = "codex-sidebar-search-input";
      input.type = "search";
      input.placeholder = "搜索会话名称或内容…";
      input.value = state.query;
      input.setAttribute("aria-label", "搜索会话");
      let composing = false;
      input.addEventListener("compositionstart", () => { composing = true; });
      input.addEventListener("compositionend", (event) => {
        composing = false;
        state.query = event.currentTarget.value;
        renderToolbar(entriesFrom(titleNodes()), "compositionend");
      });
      input.addEventListener("input", (event) => {
        state.query = event.currentTarget.value;
        if (!composing && !event.isComposing) renderToolbar(entriesFrom(titleNodes()), "query");
      });
      search.append(searchIcon, input);

      const sortOptions = [["sidebar", "默认"], ["time", "日期↓"], ["tag", "标签"], ["title", "标题"]];
      const sortControl = document.createElement("div");
      sortControl.className = "codex-sidebar-sort-control";
      const sortTrigger = button("codex-sidebar-sort-trigger", "");
      sortTrigger.setAttribute("aria-label", "会话排序");
      sortTrigger.setAttribute("aria-haspopup", "listbox");
      sortTrigger.setAttribute("aria-expanded", String(state.sortOpen));
      sortTrigger.setAttribute("aria-controls", "codex-sidebar-sort-menu");
      const sortLabel = document.createElement("span");
      sortLabel.className = "codex-sidebar-sort-label";
      sortLabel.textContent = "排序";
      const sortValue = document.createElement("span");
      sortValue.className = "codex-sidebar-sort-value";
      sortValue.textContent = sortOptions.find(([value]) => value === state.sort)?.[1] ?? "默认";
      const sortChevron = document.createElement("span");
      sortChevron.className = "codex-sidebar-sort-chevron";
      sortTrigger.append(sortLabel, sortValue, sortChevron);
      const focusSort = (selector = ".codex-sidebar-sort-trigger") => requestAnimationFrame(() => document.querySelector(selector)?.focus({ preventScroll: true }));
      sortTrigger.addEventListener("click", () => {
        state.sortOpen = !state.sortOpen;
        renderToolbar(entriesFrom(titleNodes()), "sort-toggle");
        focusSort(state.sortOpen ? ".codex-sidebar-sort-option[aria-selected='true']" : undefined);
      });
      sortTrigger.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") state.sortOpen = false;
        else state.sortOpen = true;
        renderToolbar(entriesFrom(titleNodes()), "sort-keyboard");
        focusSort(event.key === "Escape" ? undefined : event.key === "ArrowUp" ? ".codex-sidebar-sort-option:last-child" : ".codex-sidebar-sort-option[aria-selected='true']");
      });
      sortControl.appendChild(sortTrigger);
      if (state.sortOpen) {
        const sortMenu = document.createElement("div");
        sortMenu.id = "codex-sidebar-sort-menu";
        sortMenu.className = "codex-sidebar-sort-menu";
        sortMenu.setAttribute("role", "listbox");
        sortOptions.forEach(([value, label], index) => {
          const option = button("codex-sidebar-sort-option", "");
          option.dataset.value = value;
          option.setAttribute("role", "option");
          option.setAttribute("aria-selected", String(state.sort === value));
          const optionLabel = document.createElement("span");
          optionLabel.textContent = label;
          const check = document.createElement("span");
          check.className = "codex-sidebar-sort-check";
          check.textContent = state.sort === value ? "✓" : "";
          option.append(optionLabel, check);
          option.addEventListener("click", () => {
            state.sort = value;
            state.sortOpen = false;
            trace("sort-change", { value: state.sort });
            renderToolbar(entriesFrom(titleNodes()), "sort");
            focusSort();
          });
          option.addEventListener("keydown", (event) => {
            const options = [...sortMenu.querySelectorAll(".codex-sidebar-sort-option")];
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              state.sortOpen = false;
              renderToolbar(entriesFrom(titleNodes()), "sort-escape");
              focusSort();
            } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
              options[nextIndex]?.focus({ preventScroll: true });
            }
          });
          sortMenu.appendChild(option);
        });
        sortControl.appendChild(sortMenu);
      }
      controls.append(search, sortControl);

      const counts = new Map();
      entries.forEach((item) => counts.set(item.tag, (counts.get(item.tag) ?? 0) + 1));
      const rail = document.createElement("div");
      rail.className = "codex-sidebar-filter-rail";
      rail.setAttribute("role", "group");
      rail.setAttribute("aria-label", "按标签筛选");
      [["all", "全部", entries.length], ...Array.from(counts, ([tag, count]) => [tag, tag, count])]
        .sort((a, b) => a[0] === "all" ? -1 : b[0] === "all" ? 1 : a[1].localeCompare(b[1], "zh-CN"))
        .forEach(([value, label, count]) => {
          const chip = button("codex-sidebar-filter-chip", label);
          chip.setAttribute("aria-pressed", String(state.tag === value));
          chip.title = `${label} · ${count} 个会话`;
          const badge = document.createElement("span");
          badge.className = "codex-sidebar-filter-count";
          badge.textContent = String(count);
          if (value === "all" || state.tag === value) chip.appendChild(badge);
          chip.addEventListener("click", () => {
            state.tag = state.tag === value && value !== "all" ? "all" : value;
            trace("tag-click", { value, selected: state.tag });
            renderToolbar(entriesFrom(titleNodes()), "tag");
          });
          rail.appendChild(chip);
        });

      const results = selectVisibleEntries(entries, state, contentByThread);
      const panel = document.createElement("div");
      panel.className = "codex-sidebar-results";
      const panelHead = document.createElement("div");
      panelHead.className = "codex-sidebar-results-head";
      const summary = document.createElement("span");
      summary.textContent = `${results.length} / ${entries.length} 个会话${state.query ? " · 名称与正文" : ""}`;
      panelHead.appendChild(summary);
      const list = document.createElement("div");
      list.className = "codex-sidebar-results-list";
      list.setAttribute("role", "list");

      renderResultsList(list, { entries: results, query: state.query, sort: state.sort, onOpen: (entry) => { void openEntry(entry); } });
      panel.append(panelHead, list);
      body.append(controls, rail, panel);
    } else {
      const configured = new Set(tagDefinitions.map(({ name }) => name.toLocaleLowerCase()));
      const detected = [...new Set(entries.filter((item) => item.tagged && !configured.has(item.tag.toLocaleLowerCase())).map((item) => item.tag))];
      const note = document.createElement("p");
      note.className = "codex-sidebar-tag-settings-note";
      note.textContent = "新增标签会立即获得配色；删除只移除配色定义，不会修改已有会话标题。" + (detected.length ? ` 当前未配置：${detected.join("、")}` : "");
      const form = document.createElement("form");
      form.className = "codex-sidebar-tag-form";
      const tagInput = document.createElement("input");
      tagInput.className = "codex-sidebar-tag-input";
      tagInput.placeholder = "新标签，例如 Review";
      tagInput.maxLength = 20;
      tagInput.setAttribute("aria-label", "新标签名称");
      const toneSelect = document.createElement("select");
      toneSelect.className = "codex-sidebar-tag-tone";
      toneSelect.setAttribute("aria-label", "标签颜色");
      [["neutral", "中性"], ["blue", "蓝色"], ["purple", "紫色"], ["red", "红色"], ["amber", "琥珀"], ["green", "绿色"]].forEach(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        toneSelect.appendChild(option);
      });
      const add = button("codex-sidebar-tag-add", "添加标签");
      add.type = "submit";
      form.append(tagInput, toneSelect, add);
      const error = document.createElement("div");
      error.className = "codex-sidebar-tag-error";
      error.textContent = state.tagError;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = tagInput.value.trim();
        if (!name || /[\[\]【】]/u.test(name)) state.tagError = "请输入 1–20 个字符，且不要包含括号";
        else if (tagDefinitions.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) state.tagError = "这个标签已经存在";
        else {
          tagDefinitions = [...tagDefinitions, { name, tone: toneSelect.value }];
          state.tagError = "";
          syncTagDefinitions();
        }
        renderToolbar(entriesFrom(titleNodes()), "tag-config-add");
      });
      const configList = document.createElement("div");
      configList.className = "codex-sidebar-tag-config-list";
      tagDefinitions.slice().sort((a, b) => a.name.localeCompare(b.name, "zh-CN")).forEach((definition) => {
        const row = document.createElement("div");
        row.className = "codex-sidebar-tag-config-row";
        const name = document.createElement("span");
        name.className = "codex-sidebar-result-tag";
        name.dataset.tone = definition.tone;
        name.textContent = definition.name;
        const tone = document.createElement("span");
        tone.className = "codex-sidebar-tag-config-tone";
        tone.textContent = ({ neutral: "中性", blue: "蓝色", purple: "紫色", red: "红色", amber: "琥珀", green: "绿色" })[definition.tone] ?? definition.tone;
        const remove = button("codex-sidebar-tag-delete", "×");
        remove.title = `删除 ${definition.name} 配色`;
        remove.setAttribute("aria-label", `删除 ${definition.name} 配色`);
        remove.addEventListener("click", () => {
          tagDefinitions = tagDefinitions.filter((item) => item.name.toLocaleLowerCase() !== definition.name.toLocaleLowerCase());
          syncTagDefinitions();
          renderToolbar(entriesFrom(titleNodes()), "tag-config-delete");
        });
        row.append(name, tone, remove);
        configList.appendChild(row);
      });
      body.append(note, form, error, configList);
    }

    dialog.append(header, body);
    overlay.appendChild(dialog);
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target !== overlay) return;
      state.open = false;
      state.sortOpen = false;
      renderToolbar(entriesFrom(titleNodes()), "backdrop");
    });
    dialog.addEventListener("pointerdown", (event) => {
      if (!state.sortOpen || event.target.closest(".codex-sidebar-sort-control")) return;
      state.sortOpen = false;
      dialog.querySelector(".codex-sidebar-sort-menu")?.remove();
      const trigger = dialog.querySelector(".codex-sidebar-sort-trigger");
      trigger?.setAttribute("aria-expanded", "false");
    }, true);
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        state.open = false;
        state.sortOpen = false;
        renderToolbar(entriesFrom(titleNodes()), "escape");
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll("button, input, select")].filter((item) => !item.disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    modal = overlay;
    document.body.appendChild(overlay);

    const restoredInput = activeInputClass ? dialog.querySelector(`.${activeInputClass}`) : null;
    if (restoredInput) {
      restoredInput.focus({ preventScroll: true });
      if (selectionStart !== null) restoredInput.setSelectionRange(selectionStart, selectionStart);
    } else {
      requestAnimationFrame(() => dialog.querySelector(state.view === "sessions" ? ".codex-sidebar-search-input" : ".codex-sidebar-tag-input")?.focus({ preventScroll: true }));
    }
  };

  const hasInteractionFocus = () => Boolean(host?.matches(":focus-within") || modal?.matches(":focus-within"));

  const refresh = (reason = "observer") => {
    const nodes = titleNodes();
    nodes.forEach(enhanceNode);
    const entries = entriesFrom(nodes);
    if (host?.isConnected && renderedIndexSignature === indexSignature(entries)) return;
    if (pointerActive || hasInteractionFocus()) {
      pendingToolbarRefresh = true;
      trace("render-deferred", { reason, pointerActive, focusWithin: hasInteractionFocus() });
      return;
    }
    renderToolbar(entries, reason);
  };

  const flushDeferredRefresh = () => {
    if (!pendingToolbarRefresh || pointerActive || hasInteractionFocus()) return;
    refresh("interaction-end");
  };

  const trackPointerDown = (event) => {
    if (!host?.contains(event.target) && !modal?.contains(event.target)) return;
    pointerActive = true;
    trace("pointerdown", { control: event.target.closest("button,select,input")?.className ?? "toolbar" });
  };
  const trackPointerEnd = () => {
    if (!pointerActive) return;
    setTimeout(() => {
      pointerActive = false;
      trace("pointerend");
      flushDeferredRefresh();
    }, 0);
  };
  const trackFocusOut = (event) => {
    if (!host?.contains(event.target) && !modal?.contains(event.target)) return;
    setTimeout(flushDeferredRefresh, 0);
  };
  document.addEventListener("pointerdown", trackPointerDown, true);
  document.addEventListener("pointerup", trackPointerEnd, true);
  document.addEventListener("pointercancel", trackPointerEnd, true);
  document.addEventListener("focusout", trackFocusOut, true);

  const isRelevantMutation = (mutation) => {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
    if (!target || host?.contains(target) || modal?.contains(target)) return false;
    if (target.closest(codexSelectors.threadTitle)) return true;
    return [...mutation.addedNodes, ...mutation.removedNodes].some(mutationContainsSidebarNode);
  };

  const observer = new MutationObserver((mutations) => {
    if (!mutations.some(isRelevantMutation)) return;
    if (queued) return;
    observerRefreshCount += 1;
    queued = true;
    requestAnimationFrame(() => { queued = false; refresh("observer"); });
  });
  observer.observe(document.body ?? document.documentElement, { childList: true, subtree: true, characterData: true });
  refresh("install");

  const runtime = {
    version,
    contentThreadIds: () => Array.from(entryCache.values(), (entry) => entry.threadId).filter(Boolean),
    debugIndex: () => Array.from(entryCache.values(), ({ key, threadId, title, projectId, pinned }) => ({ key, threadId, title, projectId, pinned })),
    setContentIndex: (items) => {
      const nextContentIndexJson = JSON.stringify(Array.isArray(items) ? items : []);
      if (nextContentIndexJson === contentIndexJson) return contentByThread.size;
      contentIndexJson = nextContentIndexJson;
      contentByThread.clear();
      if (Array.isArray(items)) {
        items.forEach(({ threadId, chunks }) => {
          if (typeof threadId === "string" && Array.isArray(chunks)) contentByThread.set(threadId, chunks);
        });
      }
      if (state.open) {
        if (pointerActive || hasInteractionFocus()) pendingToolbarRefresh = true;
        else renderToolbar(entriesFrom(titleNodes()), "content-index");
      }
      return contentByThread.size;
    },
    status: () => ({
      version,
      enhanced: document.querySelectorAll(`[${ENHANCED}]`).length,
      indexed: entryCache.size,
      contentIndexed: contentByThread.size,
      toolbar: Boolean(document.getElementById(TOOLBAR_ID)),
      visibleResults: modal?.querySelectorAll(".codex-sidebar-result").length ?? 0,
      renderCount,
      observerRefreshCount,
    }),
    debug: () => debugEvents.slice(),
    dispose: () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", trackPointerDown, true);
      document.removeEventListener("pointerup", trackPointerEnd, true);
      document.removeEventListener("pointercancel", trackPointerEnd, true);
      document.removeEventListener("focusout", trackFocusOut, true);
      document.querySelectorAll(`[${ENHANCED}]`).forEach(restoreNode);
      modal?.remove();
      modal = null;
      document.getElementById(TOOLBAR_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      if (window.__codexSidebarTags === runtime) delete window.__codexSidebarTags;
      return true;
    },
  };
  window.__codexSidebarTags = runtime;
  return runtime.status();
}
