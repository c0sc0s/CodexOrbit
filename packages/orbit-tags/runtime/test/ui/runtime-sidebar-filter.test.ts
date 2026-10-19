// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { installRuntime } from "../../src/injected/runtime";

afterEach(() => {
  window.__codexSidebarTags?.dispose();
  document.body.replaceChildren();
  localStorage.clear();
});

function section(label: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "group/nav-section-title";
  row.innerHTML = `<div><button data-app-action-sidebar-section-toggle style="color: rgb(120, 120, 120); font-size: 12px; padding-left: 4px">${label}</button></div><button aria-label="Sort">…</button>`;
  return row;
}

function install(): void {
  installRuntime({
    version: "sidebar-filter-test", protocolVersion: 1, settingsSource: "repository",
    tagDefinitions: [{ name: "Bug", color: "#d95c5c", description: "Fix defects" }],
    colorPresets: [{ name: "Coral", color: "#d95c5c" }],
    legacyToneColors: { neutral: "#7c8798", blue: "#4f8fd7" },
  }, async () => {});
}

function filter(): HTMLElement | null {
  return document.getElementById("codex-sidebar-tags-filter-bar");
}

it("mounts the tag filters above Recents without a Pinned section", () => {
  const recents = section("Recents");
  document.body.innerHTML = '<button>Plugins</button><div data-app-action-sidebar-thread-row><span data-thread-title>[Bug] Fix sidebar</span></div><div data-app-action-sidebar-thread-row><span data-thread-title>Another task</span></div>';
  document.body.insertBefore(recents, document.body.children[1]);
  install();

  const bar = filter()!;
  expect(bar).not.toBeNull();
  expect(bar.nextElementSibling).toBe(recents);
  expect(recents.querySelector('[aria-label="Sort"]')?.parentElement).toBe(recents);
  const heading = bar.querySelector<HTMLElement>(".codex-sidebar-tags-section-heading")!;
  expect(heading.style.color).toBe("rgb(120, 120, 120)");
  expect(heading.style.fontSize).toBe("12px");
  expect(bar.querySelector<HTMLElement>(".codex-sidebar-quick-filter-rail")!.style.paddingLeft).toBe("4px");
  expect(bar.querySelector('[data-value="all"] .codex-sidebar-quick-filter-count')?.textContent).toBe("2");
  bar.querySelector<HTMLButtonElement>('[data-value="Bug"]')!.click();
  const rows = document.querySelectorAll("[data-app-action-sidebar-thread-row]");
  expect(rows[0].hasAttribute("data-codex-sidebar-tags-filtered")).toBe(false);
  expect(rows[1].hasAttribute("data-codex-sidebar-tags-filtered")).toBe(true);
});

it("recovers when section headings appear, disappear or remount without session changes", async () => {
  document.body.innerHTML = "<button>Plugins</button>";
  install();
  expect(filter()).toBeNull();

  const recents = section("Recents");
  document.body.append(recents);
  await vi.waitFor(() => expect(filter()?.nextElementSibling).toBe(recents));
  const bar = filter()!;

  const pinned = section("Pinned");
  recents.before(pinned);
  await vi.waitFor(() => expect(bar.nextElementSibling).toBe(pinned));
  pinned.remove();
  await vi.waitFor(() => expect(bar.nextElementSibling).toBe(recents));

  const replacement = section("Recents");
  recents.replaceWith(replacement);
  await vi.waitFor(() => expect(bar.nextElementSibling).toBe(replacement));
  expect(filter()).toBe(bar);
  expect(document.querySelectorAll("#codex-sidebar-tags-filter-bar")).toHaveLength(1);

  replacement.remove();
  await vi.waitFor(() => expect(filter()).toBeNull());
  const projects = section("Projects");
  document.body.append(projects);
  await vi.waitFor(() => expect(filter()?.nextElementSibling).toBe(projects));
});

it("supports the legacy Projects header when no section toggles are present", () => {
  document.body.innerHTML = '<button>Plugins</button><div data-projects-header>Projects</div>';
  install();
  expect(filter()?.nextElementSibling).toBe(document.querySelector("[data-projects-header]"));
});
