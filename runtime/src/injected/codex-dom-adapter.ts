export const codexSelectors = {
  projectRow: "[data-app-action-sidebar-project-row]",
  projectsHeader: "[data-projects-header]",
  sectionToggle: "[data-app-action-sidebar-section-toggle]",
  threadRow: "[data-app-action-sidebar-thread-row]",
  threadTitle: "[data-thread-title]",
} as const;

export const codexLabels = {
  pinned: ["Pinned", "置顶", "已置顶"],
  plugins: ["Plugins", "插件"],
} as const;

export interface CodexCapabilities {
  adapter: "codex-private-dom-v1";
  threadTitles: boolean;
  navigationAnchor: boolean;
  pinnedSection: boolean;
  projects: boolean;
}

export function detectCodexCapabilities(): CodexCapabilities {
  return {
    adapter: "codex-private-dom-v1",
    threadTitles: Boolean(document.querySelector(codexSelectors.threadTitle)),
    navigationAnchor: Boolean(findNavigationButton(codexLabels.plugins)),
    pinnedSection: Boolean(findSectionToggle(codexLabels.pinned)),
    projects: Boolean(document.querySelector(codexSelectors.projectRow)),
  };
}

export function queryThreadTitles(toolbarId: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(codexSelectors.threadTitle)).filter(
    (node) => !node.closest(`#${toolbarId}`),
  );
}

export function findNavigationButton(labels: string | readonly string[]): HTMLButtonElement | undefined {
  const candidates = typeof labels === "string" ? [labels] : labels;
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => candidates.includes(button.textContent?.trim() ?? ""),
  );
}

export function findSectionToggle(labels: string | readonly string[]): HTMLElement | undefined {
  const candidates = typeof labels === "string" ? [labels] : labels;
  return Array.from(document.querySelectorAll<HTMLElement>(codexSelectors.sectionToggle)).find(
    (toggle) => candidates.includes(toggle.textContent?.trim() ?? ""),
  );
}

export function findVisibleThreadRow(threadId: string | null | undefined): HTMLElement | null {
  if (!threadId) return null;
  return (
    Array.from(document.querySelectorAll<HTMLElement>(codexSelectors.threadRow)).find(
      (row) =>
        row.getAttribute("data-app-action-sidebar-thread-id") === threadId &&
        row.getClientRects().length > 0,
    ) ?? null
  );
}

export function findThreadRow(titleNode: HTMLElement): HTMLElement | null {
  return titleNode.closest<HTMLElement>(codexSelectors.threadRow);
}

export function threadIdForRow(row: HTMLElement | null): string | undefined {
  return row?.getAttribute("data-app-action-sidebar-thread-id") ?? undefined;
}

export function isPinnedThreadRow(row: HTMLElement | null): boolean {
  return row?.getAttribute("data-app-action-sidebar-thread-pinned") === "true";
}

export function findFirstProjectRow(): HTMLElement | null {
  return document.querySelector<HTMLElement>(codexSelectors.projectRow);
}

export function findProjectsHeader(): HTMLElement | null {
  return document.querySelector<HTMLElement>(codexSelectors.projectsHeader);
}

export function findAnySectionToggle(): HTMLElement | null {
  return document.querySelector<HTMLElement>(codexSelectors.sectionToggle);
}

export function hasVisiblePinnedThread(): boolean {
  return Boolean(document.querySelector("[data-app-action-sidebar-thread-pinned='true']"));
}

export function projectIdForThreadRow(row: HTMLElement | null): string | null {
  for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
    const projectRows = parent.querySelectorAll(codexSelectors.projectRow);
    if (projectRows.length === 1) return projectRows[0].getAttribute("data-app-action-sidebar-project-id");
  }
  return null;
}

export function sectionToggleForThreadRow(row: HTMLElement | null): HTMLElement | null {
  for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
    const toggles = parent.querySelectorAll(codexSelectors.sectionToggle);
    if (toggles.length === 1) return toggles[0] as HTMLElement;
  }
  return null;
}

export function isThreadTitleElement(element: Element): boolean {
  return Boolean(element.closest(codexSelectors.threadTitle));
}

export function findProjectRow(projectId: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>(codexSelectors.projectRow)).find(
    (row) => row.getAttribute("data-app-action-sidebar-project-id") === projectId,
  );
}

export function isProjectCollapsed(projectRow: HTMLElement | null | undefined): boolean {
  return projectRow?.getAttribute("data-app-action-sidebar-project-collapsed") === "true";
}

export function mutationContainsSidebarNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const selector = Object.values(codexSelectors).join(",");
  return node.matches(selector) || Boolean(node.querySelector(selector));
}

export interface SidebarOrderItem {
  element: HTMLElement;
  title: HTMLElement;
}

export function sidebarOrderGroups(): SidebarOrderItem[][] {
  const groups = new Map<HTMLElement, SidebarOrderItem[]>();
  for (const title of queryThreadTitles("codex-sidebar-tags-toolbar")) {
    const row = findThreadRow(title);
    if (!row) continue;
    for (let item = row; item.parentElement; item = item.parentElement) {
      const parent = item.parentElement;
      const style = getComputedStyle(parent);
      if (style.display !== "flex" || style.flexDirection !== "column") continue;
      const siblings = [...parent.children];
      // Only reorder individual thread wrappers, never project or section containers.
      if (!siblings.every((sibling) => !sibling.querySelector(codexSelectors.projectRow)
        && !sibling.querySelector(codexSelectors.sectionToggle)
        && (sibling.matches(codexSelectors.threadRow) ? 1 : sibling.querySelectorAll(codexSelectors.threadRow).length) <= 1)) break;
      const items = groups.get(parent) ?? [];
      items.push({ element: item, title });
      groups.set(parent, items);
      break;
    }
  }
  return [...groups.values()];
}
