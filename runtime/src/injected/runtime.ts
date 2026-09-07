import { normalizeTagDefinitions } from "../tag-settings.mjs";
import { parseTitleMetadata } from "../title-format.mjs";
import { RUNTIME_PROTOCOL_VERSION, RuntimeMessageType } from "../protocol.mjs";
import type { RuntimeMessage } from "../protocol.mjs";
import {
  detectCodexCapabilities,
  codexLabels,
  findAnySectionToggle,
  findFirstProjectRow,
  findNavigationButton,
  findProjectRow,
  findProjectsHeader,
  findSectionToggle,
  findThreadRow,
  findVisibleThreadRow,
  hasVisiblePinnedThread,
  isPinnedThreadRow,
  isProjectCollapsed,
  isThreadTitleElement,
  mutationContainsSidebarNode,
  projectIdForThreadRow,
  queryThreadTitles,
  sectionToggleForThreadRow,
  sidebarOrderGroups,
  threadIdForRow,
} from "./codex-dom-adapter";
import { DashboardView } from "./dashboard-view";
import { HostLifecycle } from "./host-lifecycle";
import { observeCodexLocale, RuntimeI18n } from "./i18n";
import type { ContentSearchMatch, ParsedSessionTitle, SessionEntry } from "./models";
import { RuntimeClient } from "./runtime-client";
import { parseRuntimeConfig } from "./runtime-config";
import { SessionRegistry } from "./session-registry";
import { SidebarTagOrder } from "./sidebar-tag-order";
import { SidebarTagFilter } from "./sidebar-tag-filter";
import { RuntimeStore } from "./store";
import { buildRuntimeStyles } from "./styles";
import { TitleDecorator } from "./title-decorator";

export function installRuntime(input: unknown) {
  const config = parseRuntimeConfig(input);
  const { version, colorPresets, legacyToneColors, requestBinding } = config;
  const STYLE_ID = "codex-sidebar-tags-style";
  const TOOLBAR_ID = "codex-sidebar-tags-toolbar";
  const FILTER_BAR_ID = "codex-sidebar-tags-filter-bar";
  const CACHE_KEY = "codex-sidebar-tags-index-v1";
  const TAG_CONFIG_KEY = "codex-sidebar-tags-config-v1";
  const ENHANCED = "data-codex-sidebar-tags-enhanced";
  const RAW = "data-codex-sidebar-tags-raw";
  const FILTERED = "data-codex-sidebar-tags-filtered";
  const ROW = "data-codex-sidebar-tags-row";
  const previous = window.__codexSidebarTags;
  if (previous?.version === version) return previous.status();
  try { previous?.dispose?.(); } catch {}

  const defaultDefinitions = config.tagDefinitions.map((item) => ({ ...item }));
  let tagDefinitions = normalizeTagDefinitions(config.tagDefinitions, defaultDefinitions);
  try {
    const savedDefinitions = JSON.parse(localStorage.getItem(TAG_CONFIG_KEY) ?? "null");
    if (config.settingsSource !== "repository" && Array.isArray(savedDefinitions)) tagDefinitions = normalizeTagDefinitions(savedDefinitions, defaultDefinitions);
  } catch {}
  let tagColors = new Map(tagDefinitions.map(({ name, color }) => [name.toLocaleLowerCase(), color]));
  const contentMatches = new Map<string, ContentSearchMatch>();
  let searchRequestTimer: ReturnType<typeof setTimeout> | null = null;
  let activeSearchRequestId = 0;
  let searchLoading = false;
  let searchError = "";
  let catalogError = "";
  let searchIndexStatus: Record<string, unknown> & { phase: string } = { phase: "idle", completed: 0, total: 0 };
  const runtimeStore = new RuntimeStore();
  const state = runtimeStore.state;
  let host: HTMLElement | null = null;
  let filterHost: HTMLElement | null = null;
  let navTemplate: HTMLButtonElement | null = null;
  let renderedIndexSignature: string | null = null;
  let renderCount = 0;
  let pinnedToggleRef: HTMLElement | null = null;
  const debugEvents: Array<{ at: string; event: string } & Record<string, unknown>> = [];
  const i18n = new RuntimeI18n();
  let stopLocaleObserver = (): void => {};

  const clearPendingSearch = () => {
    if (searchRequestTimer !== null) clearTimeout(searchRequestTimer);
    searchRequestTimer = null;
  };

  const trace = (event: string, details: Record<string, unknown> = {}): void => {
    debugEvents.push({ at: new Date().toISOString(), event, ...details });
    if (debugEvents.length > 80) debugEvents.shift();
  };
  let receiveRuntimeMessage: (message: RuntimeMessage) => boolean = () => false;
  const runtimeClient = new RuntimeClient(
    requestBinding,
    (message) => receiveRuntimeMessage(message),
    (reason) => trace("protocol-rejected", { reason }),
  );

  const parse = (value: unknown): ParsedSessionTitle | null => {
    const raw = typeof value === "string" ? value.trim() : "";
    const parsed = parseTitleMetadata(raw);
    if (!parsed) return raw ? { raw, tag: i18n.t("uncategorized"), time: "", title: raw, color: legacyToneColors.neutral, tagged: false } : null;
    if (parsed.tag.toLowerCase() === "uncategorized") return { ...parsed, tag: i18n.t("uncategorized"), color: legacyToneColors.neutral, tagged: false };
    return { ...parsed, color: tagColors.get(parsed.tag.toLocaleLowerCase()) ?? legacyToneColors.neutral, tagged: true };
  };
  const titleDecorator = new TitleDecorator({
    version,
    toolbarId: TOOLBAR_ID,
    enhancedAttribute: ENHANCED,
    rawTitleAttribute: RAW,
    parseTitle: parse,
  });
  const sessionRegistry = new SessionRegistry(
    localStorage,
    CACHE_KEY,
    parse,
    (tag) => tagColors.get(tag.toLocaleLowerCase()) ?? legacyToneColors.neutral,
  );

  const persistTagDefinitions = () => {
    try { localStorage.setItem(TAG_CONFIG_KEY, JSON.stringify(tagDefinitions)); } catch {}
  };

  const syncTagDefinitions = (notifyController = true) => {
    tagColors = new Map(tagDefinitions.map(({ name, color }) => [name.toLocaleLowerCase(), color]));
    sessionRegistry.updateColors();
    titleDecorator.refreshColors(document.querySelectorAll(`[${ENHANCED}]`));
    persistTagDefinitions();
    if (notifyController) {
      runtimeClient.send(RuntimeMessageType.settingsUpdate, {
        tags: tagDefinitions.map(({ name, color, description }) => ({ name, color, description })),
      });
    }
  };

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head ?? document.documentElement).appendChild(style);
  }
  style.textContent = buildRuntimeStyles({
    enhancedAttribute: ENHANCED,
    toolbarId: TOOLBAR_ID,
    filterBarId: FILTER_BAR_ID,
    filteredAttribute: FILTERED,
    rowAttribute: ROW,
  });

  const titleNodes = () => queryThreadTitles(TOOLBAR_ID);
  const sidebarTagOrder = new SidebarTagOrder();
  const applySidebarOrder = (): void => sidebarTagOrder.apply(
    sidebarOrderGroups(), tagDefinitions.map(({ name }) => name),
    (title) => parse(title.getAttribute(RAW) ?? title.textContent)?.tag ?? i18n.t("uncategorized"),
  );

  const commonAncestor = (left: HTMLElement | null | undefined, right: HTMLElement | null | undefined): HTMLElement | null => {
    if (!left || !right) return left?.parentElement ?? null;
    const parents = new Set<HTMLElement>();
    for (let node: HTMLElement | null = left; node; node = node.parentElement) parents.add(node);
    for (let node: HTMLElement | null = right; node; node = node.parentElement) if (parents.has(node)) return node;
    return null;
  };

  const ensureToolbar = (nodes: HTMLElement[]): HTMLElement | null => {
    if (host?.isConnected) {
      host.setAttribute("aria-label", i18n.t("sessionsDashboard"));
      return host;
    }
    host = document.getElementById(TOOLBAR_ID);
    if (host) return host;
    const pluginsButton = findNavigationButton(codexLabels.plugins);
    if (pluginsButton) {
      navTemplate = pluginsButton;
      const anchor = pluginsButton.parentElement?.classList.contains("contents") ? pluginsButton.parentElement : pluginsButton;
      host = document.createElement("div");
      host.id = TOOLBAR_ID;
      host.setAttribute("aria-label", i18n.t("sessionsDashboard"));
      anchor.insertAdjacentElement("afterend", host);
      return host;
    }
    const pinnedToggle = pinnedToggleRef?.isConnected
      ? pinnedToggleRef
      : findAnySectionToggle();
    const projectRow = findFirstProjectRow();
    const first = nodes[0] ?? pinnedToggle ?? projectRow;
    if (!first) return null;
    const projectsHeader = findProjectsHeader();
    const boundary = commonAncestor(first, projectsHeader ?? projectRow ?? nodes[nodes.length - 1] ?? first);
    if (!(boundary instanceof HTMLElement)) return null;
    let anchor = first;
    while (anchor.parentElement && anchor.parentElement !== boundary) anchor = anchor.parentElement;
    host = document.createElement("div");
    host.id = TOOLBAR_ID;
    host.setAttribute("aria-label", i18n.t("sessionsDashboard"));
    boundary.insertBefore(host, anchor);
    return host;
  };

  const ensureFilterHost = (): { filterHost: HTMLElement; pinnedToggle: HTMLElement } | null => {
    const pinnedToggle = findSectionToggle(codexLabels.pinned) ?? (pinnedToggleRef?.isConnected ? pinnedToggleRef : null);
    if (!pinnedToggle) return null;
    const pinnedHeadingRow = pinnedToggle.parentElement ?? pinnedToggle;
    filterHost = document.getElementById(FILTER_BAR_ID);
    if (!filterHost) {
      filterHost = document.createElement("section");
      filterHost.id = FILTER_BAR_ID;
    }
    filterHost.setAttribute("aria-label", i18n.t("filterSidebarByTag"));
    if (filterHost.nextElementSibling !== pinnedHeadingRow) pinnedHeadingRow.insertAdjacentElement("beforebegin", filterHost);
    return { filterHost, pinnedToggle };
  };

  const entriesFrom = (nodes: HTMLElement[]): SessionEntry[] => {
    return sessionRegistry.ingest(nodes, {
      rawTitleAttribute: RAW,
      rowAttribute: ROW,
      rowForTitle: findThreadRow,
      threadIdForRow,
      isPinnedRow: isPinnedThreadRow,
      projectIdForRow: projectIdForThreadRow,
      sectionToggleForRow: sectionToggleForThreadRow,
      onPinnedToggle: (toggle) => { pinnedToggleRef = toggle; },
    });
  };
  const sidebarTagFilter = new SidebarTagFilter({
    hostId: FILTER_BAR_ID,
    filteredAttribute: FILTERED,
    activeAttribute: "data-codex-sidebar-tags-filter-active",
    i18n,
    neutralColor: legacyToneColors.neutral,
    ensureHost: ensureFilterHost,
    getEntries: () => entriesFrom(titleNodes()),
    // Catalog membership must not decide whether a mounted native row gets filtered.
    getRows: () => titleNodes().flatMap((title) => {
      const row = findThreadRow(title);
      const parsed = parse(title.getAttribute(RAW) ?? title.textContent);
      return row ? [{ row, tag: parsed?.tag ?? i18n.t("uncategorized") }] : [];
    }),
    getDefinitions: () => tagDefinitions,
    getSelectedTag: () => state.tag,
    setSelectedTag: (value) => { runtimeStore.dispatch({ type: "tag.set", value }); },
    colorForTag: (tag) => tagColors.get(tag.toLocaleLowerCase()) ?? legacyToneColors.neutral,
    trace,
  });
  let dashboardView: DashboardView;
  let hostLifecycle: HostLifecycle;

  const openEntry = async (entry: SessionEntry): Promise<void> => {
    const owningProject = entry.projectId ? findProjectRow(entry.projectId) : null;
    const projectCollapsed = isProjectCollapsed(owningProject);
    let row = projectCollapsed
      ? null
      : entry.row?.isConnected && entry.row.getClientRects().length > 0
        ? entry.row
        : findVisibleThreadRow(entry.threadId);
    trace("open-entry", { threadId: entry.threadId, projectId: entry.projectId, pinned: entry.pinned, visibleRow: Boolean(row) });

    // Close the dashboard before changing the host sidebar. Expanding a section mutates
    // Codex's navigation tree and can invalidate the cached row while the modal owns focus.
    runtimeStore.dispatch({ type: "entry.open" });
    clearPendingSearch();
    contentMatches.clear();
    searchLoading = false;
    searchError = "";
    await dashboardView.close("open-entry");

    if (!row && entry.pinned) {
      const pinnedToggle = pinnedToggleRef?.isConnected
        ? pinnedToggleRef
        : findAnySectionToggle();
      if (pinnedToggle && !hasVisiblePinnedThread()) pinnedToggle.click();
    }
    if (!row && entry.projectId) {
      const projectRow = owningProject ?? findProjectRow(entry.projectId);
      if (projectRow && isProjectCollapsed(projectRow)) {
        trace("expand-project", { projectId: entry.projectId });
        projectRow.click();
      }
    }
    for (let attempt = 0; !row && attempt < 80; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      row = findVisibleThreadRow(entry.threadId);
    }
    if (row) {
      row.scrollIntoView({ block: "nearest" });
      row.click();
    } else {
      if (entry.threadId) runtimeClient.send(RuntimeMessageType.navigationOpen, { threadId: entry.threadId });
    }
  };

  const indexSignature = (entries: SessionEntry[]): string => entries
    .map((entry) => [entry.key, entry.raw, entry.pinned, entry.projectId].join("\u0001"))
    .join("\u0002");

  const scheduleContentSearch = (entries: SessionEntry[]): void => {
    clearPendingSearch();
    contentMatches.clear();
    searchError = "";
    const query = state.query.trim();
    if (!query) {
      searchLoading = false;
      return;
    }
    searchLoading = true;
    activeSearchRequestId += 1;
    const requestId = activeSearchRequestId;
    searchRequestTimer = setTimeout(() => {
      searchRequestTimer = null;
      if (!runtimeClient.connected) {
        searchLoading = false;
        searchError = i18n.t("searchUnavailable");
        renderToolbar(entriesFrom(titleNodes()), "search-unavailable");
        return;
      }
      runtimeClient.send(RuntimeMessageType.searchRequest, {
        query,
        threadIds: entries.map(({ threadId }) => threadId).filter((threadId): threadId is string => Boolean(threadId)),
        limit: 100,
      }, requestId);
      trace("search-request", { requestId, queryLength: query.length, threads: entries.length });
    }, 200);
  };

  dashboardView = new DashboardView({
    state,
    store: runtimeStore,
    i18n,
    colorPresets,
    fallbackBlue: legacyToneColors.blue,
    ensureToolbar,
    getNavigationTemplate: () => navTemplate,
    getEntries: () => entriesFrom(titleNodes()),
    getTagDefinitions: () => tagDefinitions,
    getSearchState: () => ({
      loading: searchLoading,
      error: searchError || catalogError,
      indexStatus: searchIndexStatus,
      contentMatches,
    }),
    scheduleContentSearch,
    onTagDefinitionsChanged: (definitions) => {
      tagDefinitions = definitions;
      syncTagDefinitions();
    },
    onOpenEntry: (entry) => { void openEntry(entry); },
    requestRender: (reason) => renderToolbar(entriesFrom(titleNodes()), reason),
    trace,
  });

  const renderToolbar = (entries: SessionEntry[], reason = "state"): void => {
    if (dashboardView.isClosing && state.open) return;
    hostLifecycle.didRender();
    renderedIndexSignature = indexSignature(entries);
    renderCount += 1;
    trace("render", { reason, count: entries.length, open: state.open });
    applySidebarOrder();
    sidebarTagFilter.render(entries);
    dashboardView.render(entries, reason);
  };

  const refresh = (reason = "observer"): void => {
    const nodes = titleNodes();
    nodes.forEach((node) => titleDecorator.enhance(node));
    const entries = entriesFrom(nodes);
    applySidebarOrder();
    sidebarTagFilter.apply();
    if (host?.isConnected && renderedIndexSignature === indexSignature(entries)) return;
    if (hostLifecycle.deferIfInteracting(reason)) return;
    renderToolbar(entries, reason);
  };
  hostLifecycle = new HostLifecycle({
    isInsideOwnedSurface: (target) => Boolean(host?.contains(target) || filterHost?.contains(target) || dashboardView.contains(target)),
    hasInteractionFocus: () => Boolean(host?.matches(":focus-within") || filterHost?.matches(":focus-within") || dashboardView.hasFocus()),
    isRelevantMutation: (mutation) => {
      const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
      if (!target || host?.contains(target) || filterHost?.contains(target) || dashboardView.contains(target)) return false;
      if (isThreadTitleElement(target)) return true;
      return [...mutation.addedNodes, ...mutation.removedNodes].some(mutationContainsSidebarNode);
    },
    onRefresh: refresh,
    trace,
  });
  hostLifecycle.mount(document.body ?? document.documentElement);
  refresh("install");
  stopLocaleObserver = observeCodexLocale((locale) => {
    const previousUncategorized = i18n.t("uncategorized");
    const previousSearchUnavailable = i18n.t("searchUnavailable");
    if (!i18n.setLocale(locale)) return;
    if (state.tag === previousUncategorized) runtimeStore.dispatch({ type: "tag.set", value: i18n.t("uncategorized") });
    if (searchError === previousSearchUnavailable) searchError = i18n.t("searchUnavailable");
    sessionRegistry.reparse();
    trace("locale-change", { locale });
    renderToolbar(entriesFrom(titleNodes()), "locale");
  });

  const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const applySearchResult = (value: unknown): boolean => {
    if (!isRecord(value) || value.type !== "searchResult" || value.requestId !== activeSearchRequestId || value.query !== state.query.trim()) return false;
    contentMatches.clear();
    if (Array.isArray(value.items)) {
      value.items.forEach((item) => {
        if (!isRecord(item) || typeof item.threadId !== "string" || typeof item.snippet !== "string") return;
        contentMatches.set(item.threadId, {
          role: typeof item.role === "string" ? item.role : "Codex",
          snippet: item.snippet,
          score: typeof item.score === "number" ? item.score : 0,
        });
      });
    }
    searchLoading = false;
    searchError = typeof value.error === "string" ? value.error : "";
    if (isRecord(value.indexStatus) && typeof value.indexStatus.phase === "string") searchIndexStatus = { ...value.indexStatus, phase: value.indexStatus.phase };
    trace("search-result", { requestId: value.requestId, results: contentMatches.size, error: searchError || null });
    if (state.open) renderToolbar(entriesFrom(titleNodes()), "search-result");
    return true;
  };

  const handleRuntimeMessage = (message: RuntimeMessage): boolean => {
    if (message.type === RuntimeMessageType.settingsError) {
      searchError = i18n.t("settingsSaveFailed");
      renderToolbar(entriesFrom(titleNodes()), "settings-error");
      return true;
    }
    if (message.type === RuntimeMessageType.catalogSnapshot) {
      catalogError = message.payload.complete === true ? "" : i18n.t("catalogUnavailable");
      if (message.payload.complete === true && Array.isArray(message.payload.items)) {
        sessionRegistry.applyCatalog(message.payload.items);
        const entries = entriesFrom(titleNodes());
        if (state.query.trim()) scheduleContentSearch(entries);
        renderToolbar(entries, "catalog-snapshot");
      }
      if (catalogError && state.open) renderToolbar(entriesFrom(titleNodes()), "catalog-snapshot");
      return true;
    }
    if (message.type === RuntimeMessageType.searchResult) {
      return applySearchResult({ type: "searchResult", requestId: message.requestId, ...message.payload });
    }
    if (message.type === RuntimeMessageType.settingsSnapshot) {
      if (searchError === i18n.t("settingsSaveFailed")) searchError = "";
      const settings = isRecord(message.payload.settings) ? message.payload.settings : null;
      const nextDefinitions = normalizeTagDefinitions(settings?.tags, defaultDefinitions);
      tagDefinitions = nextDefinitions;
      syncTagDefinitions(false);
      renderToolbar(entriesFrom(titleNodes()), "settings-snapshot");
      return true;
    }
    return false;
  };
  receiveRuntimeMessage = handleRuntimeMessage;

  const runtime = {
    version,
    protocolVersion: RUNTIME_PROTOCOL_VERSION,
    tagDefinitions: () => tagDefinitions.map(({ name, color, description }) => ({ name, color, description })),
    contentThreadIds: () => sessionRegistry.threadIds(),
    debugIndex: () => sessionRegistry.debugIndex(),
    handleMessage: (value: unknown) => runtimeClient.handle(value),
    setSearchResult: applySearchResult,
    status: () => ({
      version,
      locale: i18n.locale,
      protocolVersion: RUNTIME_PROTOCOL_VERSION,
      enhanced: document.querySelectorAll(`[${ENHANCED}]`).length,
      indexed: sessionRegistry.size,
      searchLoading,
      searchResults: contentMatches.size,
      searchIndexStatus,
      capabilities: detectCodexCapabilities(),
      lastError: searchError || catalogError || null,
      toolbar: Boolean(document.getElementById(TOOLBAR_ID)),
      sidebarFilter: Boolean(document.getElementById(FILTER_BAR_ID)),
      activeTag: state.tag,
      visibleResults: dashboardView.visibleResultCount,
      renderCount,
      observerRefreshCount: hostLifecycle.observerRefreshCount,
    }),
    debug: () => debugEvents.slice(),
    dispose: () => {
      clearPendingSearch();
      stopLocaleObserver();
      hostLifecycle.dispose();
      sidebarTagOrder.dispose();
      titleDecorator.dispose(document.querySelectorAll<HTMLElement>(`[${ENHANCED}]`));
      sidebarTagFilter.dispose(document.querySelectorAll<HTMLElement>(`[${FILTERED}]`));
      document.querySelectorAll<HTMLElement>(`[${ROW}]`).forEach((row) => row.removeAttribute(ROW));
      dashboardView.dispose();
      document.getElementById(TOOLBAR_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
      sessionRegistry.clearPersistentCache();
      if (window.__codexSidebarTags === runtime) delete window.__codexSidebarTags;
      return true;
    },
  };
  window.__codexSidebarTags = runtime;
  return runtime.status();
}
