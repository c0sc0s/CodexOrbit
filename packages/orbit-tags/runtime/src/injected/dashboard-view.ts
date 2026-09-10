import { renderResultsList } from "./components/results-list";
import type { RuntimeI18n } from "./i18n";
import { enterDashboard, enterDashboardContent, enterSortMenu, exitDashboard, refreshResults } from "./motion";
import type { ContentSearchMatch, DashboardState, SessionEntry, SortMode, TagDefinition } from "./models";
import { selectVisibleEntries } from "./search";
import type { RuntimeStore } from "./store";

interface DashboardSearchState {
  loading: boolean;
  error: string;
  indexStatus: Record<string, unknown> & { phase: string };
  contentMatches: ReadonlyMap<string, ContentSearchMatch>;
}

interface DashboardViewOptions {
  updatePanel?: { mount(): HTMLElement };
  state: DashboardState;
  store: RuntimeStore;
  i18n: RuntimeI18n;
  colorPresets: Array<{ name: string; color: string }>;
  fallbackBlue: string;
  ensureToolbar(nodes: HTMLElement[]): HTMLElement | null;
  getNavigationTemplate(): HTMLButtonElement | null;
  getEntries(): SessionEntry[];
  getTagDefinitions(): TagDefinition[];
  getSearchState(): DashboardSearchState;
  scheduleContentSearch(entries: SessionEntry[]): void;
  onTagDefinitionsChanged(definitions: TagDefinition[]): void;
  onOpenEntry(entry: SessionEntry): void;
  requestRender(reason: string): void;
  trace(event: string, details: Record<string, unknown>): void;
}

export class DashboardView {
  private modal: HTMLElement | null = null;
  private closing = false;
  private deletedDefinition: TagDefinition | null = null;
  private composing = false;

  constructor(private readonly options: DashboardViewOptions) {
    // Codex can replace the renderer execution context while preserving host DOM.
    // Any overlay from the previous context has dead event handlers and must be rebuilt.
    document.querySelectorAll(".codex-sidebar-dashboard-overlay").forEach((overlay) => overlay.remove());
  }

  get isClosing(): boolean {
    return this.closing;
  }

  get visibleResultCount(): number {
    return this.modal?.querySelectorAll(".codex-sidebar-result").length ?? 0;
  }

  hasFocus(): boolean {
    return Boolean(this.modal?.matches(":focus-within"));
  }

  contains(target: Node): boolean {
    return Boolean(this.modal?.contains(target));
  }

  async close(reason: string): Promise<void> {
    const { state, store, trace, requestRender } = this.options;
    if (!state.open || this.closing) return;
    this.closing = true;
    trace("dashboard-close-start", { reason });
    store.dispatch({ type: "sort-menu.set", value: false });
    const closingModal = this.modal;
    const dialog = closingModal?.querySelector<HTMLElement>(".codex-sidebar-dashboard-dialog");
    try {
      if (closingModal && dialog) await exitDashboard(closingModal, dialog);
    } finally {
      if (this.modal === closingModal) {
        store.dispatch({ type: "dashboard.close" });
        requestRender(reason);
      }
      this.closing = false;
      trace("dashboard-close-end", { reason });
    }
  }

  render(entries: SessionEntry[], reason = "state"): void {
    const {
      state,
      store,
      ensureToolbar,
      getNavigationTemplate,
      getTagDefinitions,
      getSearchState,
      i18n,
      requestRender,
    } = this.options;
    if (this.closing && state.open) return;
    const backgroundUpdate = ["catalog-snapshot", "settings-snapshot", "search-result"].includes(reason);
    if (backgroundUpdate && this.modal && (state.view === "settings" || state.sortOpen || this.composing)) return;
    const previousScroll = this.modal?.querySelector(".codex-sidebar-results-list")?.scrollTop ?? 0;
    const toolbar = ensureToolbar(entries.map((entry) => entry.node).filter((node): node is HTMLElement => Boolean(node)));
    if (!toolbar) return;
    const activeInput = document.activeElement instanceof HTMLInputElement
      && document.activeElement.matches(".codex-sidebar-search-input, .codex-sidebar-tag-input, .codex-sidebar-tag-description")
      ? document.activeElement
      : null;
    const activeInputClass = activeInput?.className ?? null;
    const selectionStart = activeInput?.selectionStart ?? null;
    this.modal?.remove();
    this.modal = null;
    toolbar.replaceChildren();

    const entry = document.createElement("div");
    entry.className = "codex-sidebar-dashboard-entry";
    const navigationTemplate = getNavigationTemplate();
    const launcher = (navigationTemplate?.cloneNode(true) as HTMLButtonElement | undefined) ?? this.button("", "Tags");
    launcher.classList.add("codex-sidebar-dashboard-launcher");
    if (!navigationTemplate) launcher.dataset.dashboardFallback = "true";
    launcher.querySelector(".text-fade-truncate")?.replaceChildren(document.createTextNode("Tags"));
    const icon = launcher.querySelector("svg");
    if (icon) this.renderTagsIcon(icon);
    launcher.title = i18n.t("launcherLabel");
    launcher.setAttribute("aria-label", i18n.t("launcherLabel"));
    launcher.setAttribute("aria-haspopup", "dialog");
    launcher.setAttribute("aria-expanded", String(state.open));
    launcher.addEventListener("click", () => {
      this.closing = false;
      store.dispatch({ type: "dashboard.open" });
      requestRender("open-dashboard");
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
    dialog.setAttribute("aria-label", i18n.t("sessionsDashboard"));
    const header = document.createElement("header");
    header.className = "codex-sidebar-dashboard-header";
    const headingGroup = document.createElement("div");
    const heading = document.createElement("h2");
    heading.className = "codex-sidebar-dashboard-heading";
    heading.textContent = i18n.t(state.view === "sessions" ? "sessionsDashboard" : "tagSettings");
    const subtitle = document.createElement("div");
    subtitle.className = "codex-sidebar-dashboard-subtitle";
    const searchState = getSearchState();
    subtitle.textContent = state.view === "sessions"
      ? i18n.t(searchState.indexStatus.phase === "ready" ? "indexReady" : "indexOnDemand", { count: entries.length })
      : i18n.t("configuredTags", { count: getTagDefinitions().length });
    headingGroup.append(heading, subtitle);
    const tabs = document.createElement("div");
    tabs.className = "codex-sidebar-dashboard-tabs";
    tabs.setAttribute("role", "tablist");
    const dashboardTabs: Array<[DashboardState["view"], string]> = [["sessions", i18n.t("sessions")], ["settings", i18n.t("tagSettings")]];
    dashboardTabs.forEach(([value, label]) => {
      const tab = this.button("codex-sidebar-dashboard-tab", label);
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", String(state.view === value));
      tab.addEventListener("click", () => {
        store.dispatch({ type: "view.set", value });
        requestRender("dashboard-tab");
      });
      tabs.appendChild(tab);
    });
    const close = this.button("codex-sidebar-dashboard-close", "×");
    close.title = i18n.t("close");
    close.setAttribute("aria-label", i18n.t("closeDashboard"));
    close.addEventListener("click", () => { void this.close("close-dashboard"); });
    header.append(headingGroup, tabs, close);
    const body = document.createElement("div");
    body.className = "codex-sidebar-dashboard-body";

    if (state.view === "sessions") {
      this.renderSessions(body, entries, searchState);
    } else {
      this.renderSettings(body, entries);
    }

    dialog.append(header, body);
    overlay.appendChild(dialog);
    overlay.addEventListener("pointerdown", (event) => {
      if (event.target === overlay) void this.close("backdrop");
    });
    dialog.addEventListener("pointerdown", (event) => {
      if (!state.sortOpen || (event.target instanceof Element && event.target.closest(".codex-sidebar-sort-control"))) return;
      store.dispatch({ type: "sort-menu.set", value: false });
      dialog.querySelector(".codex-sidebar-sort-menu")?.remove();
      dialog.querySelector(".codex-sidebar-sort-trigger")?.setAttribute("aria-expanded", "false");
    }, true);
    dialog.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void this.close("escape");
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>("button, input, select")].filter((item) => !item.disabled);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    this.modal = overlay;
    document.body.appendChild(overlay);
    if (backgroundUpdate) {
      const list = overlay.querySelector(".codex-sidebar-results-list");
      if (list) list.scrollTop = previousScroll;
    }

    if (reason === "open-dashboard") enterDashboard(overlay, dialog);
    if (reason === "dashboard-tab") enterDashboardContent(body);
    const sortMenuElement = dialog.querySelector<HTMLElement>(".codex-sidebar-sort-menu");
    if (reason === "sort-toggle" && state.sortOpen && sortMenuElement) enterSortMenu(sortMenuElement);
    const resultsElement = dialog.querySelector<HTMLElement>(".codex-sidebar-results");
    if (["tag", "sort", "search-result"].includes(reason) && resultsElement) refreshResults(resultsElement);

    const restoredInput = activeInputClass ? dialog.querySelector<HTMLInputElement>(`.${activeInputClass}`) : null;
    if (restoredInput) {
      restoredInput.focus({ preventScroll: true });
      if (selectionStart !== null) restoredInput.setSelectionRange(selectionStart, selectionStart);
    } else {
      requestAnimationFrame(() => dialog.querySelector<HTMLInputElement>(state.view === "sessions" ? ".codex-sidebar-search-input" : ".codex-sidebar-tag-input")?.focus({ preventScroll: true }));
    }

  }

  dispose(): void {
    this.modal?.remove();
    this.modal = null;
    this.closing = false;
    this.composing = false;
  }

  private renderSessions(body: HTMLElement, entries: SessionEntry[], searchState: DashboardSearchState): void {
    const { state, store, i18n, getEntries, scheduleContentSearch, requestRender, trace, onOpenEntry } = this.options;
    const controls = document.createElement("div");
    controls.className = "codex-sidebar-dashboard-controls";
    const search = document.createElement("label");
    search.className = "codex-sidebar-search";
    search.dataset.loading = String(searchState.loading);
    const searchIcon = document.createElement("span");
    searchIcon.className = "codex-sidebar-search-icon";
    searchIcon.textContent = "⌕";
    const input = document.createElement("input");
    input.className = "codex-sidebar-search-input";
    input.type = "search";
    input.placeholder = i18n.t("searchPlaceholder");
    input.value = state.query;
    input.setAttribute("aria-label", i18n.t("searchLabel"));
    let composing = false;
    input.addEventListener("compositionstart", () => { composing = true; this.composing = true; });
    input.addEventListener("compositionend", (event) => {
      composing = false;
      this.composing = false;
      store.dispatch({ type: "query.set", value: (event.currentTarget as HTMLInputElement).value });
      const currentEntries = getEntries();
      scheduleContentSearch(currentEntries);
      requestRender("compositionend");
    });
    input.addEventListener("input", (event) => {
      store.dispatch({ type: "query.set", value: (event.currentTarget as HTMLInputElement).value });
      if (!composing && !event.isComposing) {
        const currentEntries = getEntries();
        scheduleContentSearch(currentEntries);
        requestRender("query");
      }
    });
    search.append(searchIcon, input);

    const sortOptions: Array<[SortMode, string]> = [
      ["sidebar", i18n.t("sortDefault")],
      ["time", i18n.t("sortDateDescending")],
      ["tag", i18n.t("sortTag")],
      ["title", i18n.t("sortTitle")],
    ];
    const sortControl = document.createElement("div");
    sortControl.className = "codex-sidebar-sort-control";
    const sortTrigger = this.button("codex-sidebar-sort-trigger", "");
    sortTrigger.setAttribute("aria-label", i18n.t("sortAria"));
    sortTrigger.setAttribute("aria-haspopup", "listbox");
    sortTrigger.setAttribute("aria-expanded", String(state.sortOpen));
    sortTrigger.setAttribute("aria-controls", "codex-sidebar-sort-menu");
    const sortLabel = document.createElement("span");
    sortLabel.className = "codex-sidebar-sort-label";
    sortLabel.textContent = i18n.t("sort");
    const sortValue = document.createElement("span");
    sortValue.className = "codex-sidebar-sort-value";
    sortValue.textContent = sortOptions.find(([value]) => value === state.sort)?.[1] ?? i18n.t("sortDefault");
    const sortChevron = document.createElement("span");
    sortChevron.className = "codex-sidebar-sort-chevron";
    sortTrigger.append(sortLabel, sortValue, sortChevron);
    const focusSort = (selector = ".codex-sidebar-sort-trigger"): number => requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true }));
    sortTrigger.addEventListener("click", () => {
      store.dispatch({ type: "sort-menu.set", value: !state.sortOpen });
      requestRender("sort-toggle");
      focusSort(state.sortOpen ? ".codex-sidebar-sort-option[aria-selected='true']" : undefined);
    });
    sortTrigger.addEventListener("keydown", (event) => {
      if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      store.dispatch({ type: "sort-menu.set", value: event.key !== "Escape" });
      requestRender("sort-keyboard");
      focusSort(event.key === "Escape" ? undefined : event.key === "ArrowUp" ? ".codex-sidebar-sort-option:last-child" : ".codex-sidebar-sort-option[aria-selected='true']");
    });
    sortControl.appendChild(sortTrigger);
    if (state.sortOpen) {
      const sortMenu = document.createElement("div");
      sortMenu.id = "codex-sidebar-sort-menu";
      sortMenu.className = "codex-sidebar-sort-menu";
      sortMenu.setAttribute("role", "listbox");
      sortOptions.forEach(([value, label], index) => {
        const option = this.button("codex-sidebar-sort-option", "");
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
          store.dispatch({ type: "sort.set", value });
          trace("sort-change", { value: state.sort });
          requestRender("sort");
          focusSort();
        });
        option.addEventListener("keydown", (event) => {
          const options = [...sortMenu.querySelectorAll<HTMLButtonElement>(".codex-sidebar-sort-option")];
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            store.dispatch({ type: "sort-menu.set", value: false });
            requestRender("sort-escape");
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

    const counts = new Map<string, number>();
    entries.forEach((item) => counts.set(item.tag, (counts.get(item.tag) ?? 0) + 1));
    const rail = document.createElement("div");
    rail.className = "codex-sidebar-filter-rail";
    rail.setAttribute("role", "group");
    rail.setAttribute("aria-label", i18n.t("filterByTag"));
    const dashboardFilters: Array<[string, string, number]> = [["all", i18n.t("all"), entries.length], ...Array.from(counts, ([tag, count]): [string, string, number] => [tag, tag, count])];
    dashboardFilters
      .sort((left, right) => left[0] === "all" ? -1 : right[0] === "all" ? 1 : i18n.compare(left[1], right[1]))
      .forEach(([value, label, count]) => {
        const chip = this.button("codex-sidebar-filter-chip", label);
        chip.dataset.value = value;
        chip.setAttribute("aria-pressed", String(state.tag === value));
        chip.title = `${label} · ${i18n.t("sessionCount", { count })}`;
        const badge = document.createElement("span");
        badge.className = "codex-sidebar-filter-count";
        badge.textContent = String(count);
        chip.appendChild(badge);
        chip.addEventListener("click", () => {
          store.dispatch({ type: "tag.set", value: state.tag === value && value !== "all" ? "all" : value });
          trace("tag-click", { value, selected: state.tag });
          requestRender("tag");
        });
        rail.appendChild(chip);
      });

    const results = selectVisibleEntries(entries, state, searchState.contentMatches);
    const panel = document.createElement("div");
    panel.className = "codex-sidebar-results";
    panel.dataset.loading = String(searchState.loading);
    const panelHead = document.createElement("div");
    panelHead.className = "codex-sidebar-results-head";
    const summary = document.createElement("span");
    summary.setAttribute("aria-live", "polite");
    const resultCount = i18n.t("resultCount", { visible: results.length, total: entries.length });
    summary.textContent = searchState.loading
      ? `${resultCount} · ${i18n.t("searchingContent")}`
      : searchState.error
        ? `${resultCount} · ${searchState.error}`
        : `${resultCount}${state.query ? ` · ${i18n.t("nameAndContent")}` : ""}`;
    panelHead.appendChild(summary);
    const list = document.createElement("div");
    list.className = "codex-sidebar-results-list";
    list.setAttribute("role", "list");
    renderResultsList(list, { entries: results, query: state.query, sort: state.sort, emptyMessage: i18n.t("noMatches"), onOpen: onOpenEntry });
    panel.append(panelHead, list);
    body.append(controls, rail, panel);
  }

  private renderSettings(body: HTMLElement, entries: SessionEntry[]): void {
    const { state, store, i18n, getTagDefinitions, onTagDefinitionsChanged, colorPresets, fallbackBlue, requestRender } = this.options;
    const tagDefinitions = getTagDefinitions();
    const configured = new Set(tagDefinitions.map(({ name }) => name.toLocaleLowerCase()));
    const detected = [...new Set(entries.filter((item) => item.tagged && !configured.has(item.tag.toLocaleLowerCase())).map((item) => item.tag))];
    const note = document.createElement("p");
    note.className = "codex-sidebar-tag-settings-note";
    note.appendChild(document.createTextNode(i18n.t("settingsNote")));
    const settingsError = this.options.getSearchState().error;
    if (settingsError) {
      const alert = document.createElement("p");
      alert.setAttribute("role", "alert");
      alert.textContent = settingsError;
      note.append(alert);
    }
    if (this.deletedDefinition) {
      const deleted = this.deletedDefinition;
      const undo = this.button("codex-sidebar-tag-add", i18n.t("undoDelete", { name: deleted.name }));
      undo.addEventListener("click", () => {
        const current = getTagDefinitions();
        if (current.length >= 32) { undo.textContent = i18n.t("tagLimit"); return; }
        if (!current.some((item) => item.name.toLowerCase() === deleted.name.toLowerCase())) onTagDefinitionsChanged([...current, deleted]);
        this.deletedDefinition = null;
        requestRender("tag-config-undo");
      });
      note.append(undo);
    }
    if (detected.length) {
      const unconfigured = document.createElement("span");
      unconfigured.className = "codex-sidebar-tag-settings-unconfigured";
      unconfigured.textContent = i18n.t("unconfigured", { names: detected.join(i18n.locale === "zh-CN" ? "、" : ", ") });
      note.appendChild(unconfigured);
    }
    const form = document.createElement("form");
    form.className = "codex-sidebar-tag-form";
    const formRow = document.createElement("div");
    formRow.className = "codex-sidebar-tag-form-row";
    const nameField = document.createElement("label");
    nameField.className = "codex-sidebar-tag-field";
    const nameLabel = document.createElement("span");
    nameLabel.className = "codex-sidebar-tag-field-label";
    nameLabel.textContent = i18n.t("tagName");
    const tagInput = document.createElement("input");
    tagInput.className = "codex-sidebar-tag-input";
    tagInput.placeholder = i18n.t("tagNamePlaceholder");
    tagInput.maxLength = 32;
    tagInput.setAttribute("aria-label", i18n.t("newTagName"));
    nameField.append(nameLabel, tagInput);

    const descriptionField = document.createElement("label");
    descriptionField.className = "codex-sidebar-tag-field";
    const descriptionLabel = document.createElement("span");
    descriptionLabel.className = "codex-sidebar-tag-field-label";
    descriptionLabel.textContent = i18n.t("classificationDescriptionOptional");
    const descriptionInput = document.createElement("input");
    descriptionInput.className = "codex-sidebar-tag-description";
    descriptionInput.placeholder = i18n.t("descriptionPlaceholder");
    descriptionInput.maxLength = 240;
    descriptionInput.setAttribute("aria-label", i18n.t("tagDescription"));
    descriptionField.append(descriptionLabel, descriptionInput);
    const colorField = document.createElement("div");
    colorField.className = "codex-sidebar-tag-color-field";
    const colorLabel = document.createElement("span");
    colorLabel.className = "codex-sidebar-tag-field-label";
    colorLabel.textContent = i18n.t("tagColor");
    const colorRow = document.createElement("div");
    colorRow.className = "codex-sidebar-tag-color-row";
    const presetGroup = document.createElement("div");
    presetGroup.className = "codex-sidebar-tag-color-presets";
    presetGroup.setAttribute("role", "group");
    presetGroup.setAttribute("aria-label", i18n.t("presetColors"));
    let selectedColor = colorPresets[0]?.color ?? fallbackBlue;
    const colorInput = document.createElement("input");
    colorInput.className = "codex-sidebar-tag-color-custom";
    colorInput.type = "color";
    colorInput.value = selectedColor;
    colorInput.title = i18n.t("customColor");
    colorInput.setAttribute("aria-label", i18n.t("customTagColor"));
    const customColorControl = document.createElement("label");
    customColorControl.className = "codex-sidebar-tag-color-custom-control";
    customColorControl.title = i18n.t("selectCustomColor");
    const customColorPreview = document.createElement("span");
    customColorPreview.className = "codex-sidebar-tag-color-custom-preview";
    customColorPreview.style.setProperty("--custom-color", selectedColor);
    const customColorLabel = document.createElement("span");
    customColorLabel.textContent = i18n.t("custom");
    customColorControl.append(colorInput, customColorPreview, customColorLabel);
    const updateColor = (color: string): void => {
      selectedColor = color.toLocaleLowerCase();
      colorInput.value = selectedColor;
      customColorPreview.style.setProperty("--custom-color", selectedColor);
      presetGroup.querySelectorAll<HTMLElement>(".codex-sidebar-tag-color-preset").forEach((preset) => {
        preset.setAttribute("aria-pressed", String(preset.dataset.color === selectedColor));
      });
    };
    colorPresets.forEach(({ name: presetName, color }) => {
      const preset = this.button("codex-sidebar-tag-color-preset", "");
      preset.dataset.color = color;
      preset.style.setProperty("--preset-color", color);
      const localizedName = i18n.colorName(presetName);
      preset.title = `${localizedName} ${color}`;
      preset.setAttribute("aria-label", `${localizedName} ${color}`);
      preset.setAttribute("aria-pressed", String(color === selectedColor));
      preset.addEventListener("click", () => updateColor(color));
      presetGroup.appendChild(preset);
    });
    colorInput.addEventListener("input", () => updateColor(colorInput.value));
    colorRow.append(presetGroup, customColorControl);
    colorField.append(colorLabel, colorRow);

    const error = document.createElement("div");
    error.className = "codex-sidebar-tag-error";
    error.textContent = state.tagError === "invalid-name"
      ? i18n.t("invalidTagName")
      : state.tagError === "duplicate"
        ? i18n.t("duplicateTag")
        : "";
    const add = this.button("codex-sidebar-tag-add", i18n.t("add"));
    let editingName: string | null = null;
    const cancel = this.button("codex-sidebar-tag-delete", i18n.t("cancel"));
    cancel.hidden = true;
    cancel.addEventListener("click", () => requestRender("tag-edit-cancel"));
    add.type = "submit";
    formRow.append(nameField, descriptionField, add, cancel);
    form.append(formRow, colorField, error);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = tagInput.value.trim();
      const description = descriptionInput.value.replace(/\s+/gu, " ").trim();
      const current = getTagDefinitions();
      if (!name || name.length > 32 || /[\[\]【】\r\n]/u.test(name) || name.toLowerCase() === "uncategorized") {
        error.textContent = i18n.t("invalidTagName");
        return;
      } else if (!editingName && current.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
        error.textContent = i18n.t("duplicateTag");
        return;
      } else if (!editingName && current.length >= 32) {
        error.textContent = i18n.t("tagLimit");
        return;
      } else {
        const updated = { name, color: selectedColor, description };
        onTagDefinitionsChanged(editingName ? current.map((item) => item.name === editingName ? updated : item) : [...current, updated]);
        store.dispatch({ type: "tag-error.set", value: "" });
      }
      requestRender("tag-config-add");
    });
    const configList = document.createElement("div");
    configList.className = "codex-sidebar-tag-config-list";
    const configHeader = document.createElement("div");
    configHeader.className = "codex-sidebar-tag-config-header";
    const headerSpacer = document.createElement("span");
    const nameHeader = document.createElement("span");
    nameHeader.textContent = i18n.t("tagHeader", { count: tagDefinitions.length });
    const descriptionHeader = document.createElement("span");
    descriptionHeader.textContent = i18n.t("classificationDescription");
    const actionSpacer = document.createElement("span");
    configHeader.append(headerSpacer, nameHeader, descriptionHeader, actionSpacer);
    configList.appendChild(configHeader);
    tagDefinitions.slice().sort((left, right) => i18n.compare(left.name, right.name)).forEach((definition) => {
      const row = document.createElement("div");
      row.className = "codex-sidebar-tag-config-row";
      const swatch = document.createElement("span");
      swatch.className = "codex-sidebar-tag-config-swatch";
      swatch.style.setProperty("--codex-sidebar-tag-color", definition.color);
      const name = this.button("codex-sidebar-tag-config-name", definition.name);
      name.className = "codex-sidebar-tag-config-name";
      name.style.setProperty("--codex-sidebar-tag-color", definition.color);
      name.textContent = definition.name;
      name.title = i18n.t("editTag", { name: definition.name });
      name.setAttribute("aria-label", name.title);
      name.addEventListener("click", () => {
        editingName = definition.name;
        tagInput.value = definition.name;
        tagInput.readOnly = true;
        descriptionInput.value = definition.description;
        updateColor(definition.color);
        add.textContent = i18n.t("save");
        cancel.hidden = false;
        descriptionInput.focus();
      });
      const description = document.createElement("span");
      description.className = "codex-sidebar-tag-config-description";
      description.dataset.empty = String(!definition.description);
      description.textContent = definition.description || i18n.t("noClassificationDescription");
      description.title = definition.description || i18n.t("noClassificationDescription");
      const remove = this.button("codex-sidebar-tag-delete", "×");
      remove.title = i18n.t("deleteTag", { name: definition.name });
      remove.setAttribute("aria-label", i18n.t("deleteTag", { name: definition.name }));
      remove.addEventListener("click", () => {
        if (remove.dataset.confirm !== "true") {
          remove.dataset.confirm = "true";
          remove.textContent = i18n.t("confirmDelete");
          remove.title = i18n.t("deleteImpact", { count: entries.filter((entry) => entry.tag.toLowerCase() === definition.name.toLowerCase()).length });
          remove.setAttribute("aria-label", remove.title);
          return;
        }
        onTagDefinitionsChanged(getTagDefinitions().filter((item) => item.name !== definition.name));
        this.deletedDefinition = definition;
        requestRender("tag-config-delete");
      });
      row.append(swatch, name, description, remove);
      configList.appendChild(row);
    });
    body.append(note, form, configList);
    if (this.options.updatePanel) body.append(this.options.updatePanel.mount());
  }

  private button(className: string, text: string): HTMLButtonElement {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = text;
    return element;
  }

  private renderTagsIcon(icon: SVGSVGElement): void {
    const namespace = "http://www.w3.org/2000/svg";
    const outline = document.createElementNS(namespace, "path");
    outline.setAttribute("d", "M2.25 2.25h4.32c.43 0 .84.17 1.14.47l5.61 5.61a1.6 1.6 0 0 1 0 2.27l-2.72 2.72a1.6 1.6 0 0 1-2.27 0L2.72 7.71a1.61 1.61 0 0 1-.47-1.14V2.25Z");
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "currentColor");
    outline.setAttribute("stroke-width", "1.15");
    outline.setAttribute("stroke-linejoin", "round");
    const aperture = document.createElementNS(namespace, "circle");
    aperture.setAttribute("cx", "5.15");
    aperture.setAttribute("cy", "5.15");
    aperture.setAttribute("r", ".82");
    aperture.setAttribute("fill", "currentColor");
    icon.replaceChildren(outline, aperture);
  }
}
