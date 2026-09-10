import { SidebarSortControl } from "./sidebar-sort-control";
import type { SessionEntry, TagDefinition } from "./models";
import type { RuntimeI18n } from "./i18n";

export type SidebarSortMode = "tag" | "native";

interface SidebarTagFilterOptions {
  hostId: string;
  filteredAttribute: string;
  activeAttribute: string;
  i18n: RuntimeI18n;
  neutralColor: string;
  ensureHost(): { filterHost: HTMLElement; pinnedToggle: HTMLElement } | null;
  getSortMode(): SidebarSortMode;
  setSortMode(value: SidebarSortMode): void;
  getEntries(): SessionEntry[];
  getRows(): Array<{ row: HTMLElement; tag: string }>;
  getDefinitions(): TagDefinition[];
  getSelectedTag(): string;
  setSelectedTag(value: string): void;
  colorForTag(tag: string): string;
  trace(event: string, details: Record<string, unknown>): void;
}

interface FilterItem {
  value: string;
  label: string;
  count: number;
  color: string | null;
}

export class SidebarTagFilter {
  private readonly sort: SidebarSortControl;
  constructor(private readonly options: SidebarTagFilterOptions) {
    this.sort = new SidebarSortControl(options.i18n, options.getSortMode, options.setSortMode);
  }

  apply(): void {
    const selectedTag = this.options.getSelectedTag();
    const selected = selectedTag.toLocaleLowerCase();
    if (selectedTag === "all") document.documentElement.removeAttribute(this.options.activeAttribute);
    else document.documentElement.setAttribute(this.options.activeAttribute, "true");
    this.options.getRows().forEach(({ row, tag }) => {
      if (!row.isConnected) return;
      const matches = selectedTag === "all" || tag.toLocaleLowerCase() === selected;
      if (matches) row.removeAttribute(this.options.filteredAttribute);
      else row.setAttribute(this.options.filteredAttribute, "true");
    });
  }

  render(): void {
    const mounted = this.options.ensureHost();
    if (!mounted) return;
    const { filterHost, pinnedToggle } = mounted;
    this.sort.update();
    if (this.sort.isOpen) { this.apply(); return; }
    const previousRail = filterHost.querySelector<HTMLElement>(".codex-sidebar-quick-filter-rail");
    const previousScrollLeft = previousRail?.scrollLeft ?? 0;
    const focusedValue = filterHost.contains(document.activeElement)
      ? document.activeElement?.closest<HTMLElement>(".codex-sidebar-quick-filter")?.dataset.value
      : null;
    filterHost.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "codex-sidebar-tags-section-heading";
    heading.textContent = "Tags";
    const pinnedStyle = getComputedStyle(pinnedToggle);
    ["color", "font-family", "font-size", "font-style", "font-weight", "letter-spacing", "line-height", "padding-left", "padding-right"]
      .forEach((property) => heading.style.setProperty(property, pinnedStyle.getPropertyValue(property)));

    this.sort.update();
    heading.appendChild(this.sort.element);

    const counts = new Map<string, number>();
    const entries = this.options.getEntries();
    entries.forEach(({ tag }) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
    const configuredOrder = new Map(this.options.getDefinitions().map(({ name }, index) => [name.toLocaleLowerCase(), index]));
    const filters: FilterItem[] = [{ value: "all", label: this.options.i18n.t("all"), count: entries.length, color: null }];
    Array.from(counts, ([tag, count]): FilterItem => ({
      value: tag,
      label: tag,
      count,
      color: this.options.colorForTag(tag) ?? this.options.neutralColor,
    }))
      .sort((left, right) => {
        const leftOrder = configuredOrder.get(left.value.toLocaleLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = configuredOrder.get(right.value.toLocaleLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder || this.options.i18n.compare(left.label, right.label);
      })
      .forEach((item) => filters.push(item));

    const rail = document.createElement("div");
    rail.className = "codex-sidebar-quick-filter-rail";
    rail.setAttribute("role", "group");
    rail.setAttribute("aria-label", this.options.i18n.t("tags"));
    rail.style.paddingLeft = pinnedStyle.paddingLeft;
    rail.style.paddingRight = pinnedStyle.paddingRight;
    filters.forEach(({ value, label, count, color }) => {
      const filter = document.createElement("button");
      filter.type = "button";
      filter.className = "codex-sidebar-quick-filter";
      filter.textContent = label;
      filter.dataset.value = value;
      if (color) filter.style.setProperty("--codex-sidebar-tag-color", color);
      filter.setAttribute("aria-pressed", String(this.options.getSelectedTag() === value));
      filter.title = `${label} · ${this.options.i18n.t("sessionCount", { count })}`;
      const badge = document.createElement("span");
      badge.className = "codex-sidebar-quick-filter-count";
      badge.textContent = String(count);
      filter.appendChild(badge);
      filter.addEventListener("click", () => {
        const next = this.options.getSelectedTag() === value && value !== "all" ? "all" : value;
        this.options.setSelectedTag(next);
        this.options.trace("sidebar-tag-click", { value, selected: next });
        this.render();
      });
      rail.appendChild(filter);
    });
    filterHost.append(heading, rail);
    rail.scrollLeft = previousScrollLeft;
    this.apply();
    if (focusedValue) {
      const filterButtons = [...rail.querySelectorAll<HTMLButtonElement>(".codex-sidebar-quick-filter")];
      const nextFocus = filterButtons.find((item) => item.dataset.value === focusedValue)
        ?? filterButtons.find((item) => item.dataset.value === this.options.getSelectedTag());
      nextFocus?.focus({ preventScroll: true });
      rail.scrollLeft = previousScrollLeft;
    }
  }

  dispose(filteredRows: Iterable<HTMLElement>): void {
    this.sort.dispose();
    for (const row of filteredRows) row.removeAttribute(this.options.filteredAttribute);
    document.documentElement.removeAttribute(this.options.activeAttribute);
    document.getElementById(this.options.hostId)?.remove();
  }
}
