export const codexSelectors = {
  projectRow: "[data-app-action-sidebar-project-row]",
  projectsHeader: "[data-projects-header]",
  sectionToggle: "[data-app-action-sidebar-section-toggle]",
  threadRow: "[data-app-action-sidebar-thread-row]",
  threadTitle: "[data-thread-title]",
} as const;

export function queryThreadTitles(toolbarId: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(codexSelectors.threadTitle)).filter(
    (node) => !node.closest(`#${toolbarId}`),
  );
}

export function findNavigationButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find(
    (button) => button.textContent?.trim() === label,
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

export function findProjectRow(projectId: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>(codexSelectors.projectRow)).find(
    (row) => row.getAttribute("data-app-action-sidebar-project-id") === projectId,
  );
}

export function mutationContainsSidebarNode(node: Node): boolean {
  if (!(node instanceof Element)) return false;
  const selector = Object.values(codexSelectors).join(",");
  return node.matches(selector) || Boolean(node.querySelector(selector));
}
