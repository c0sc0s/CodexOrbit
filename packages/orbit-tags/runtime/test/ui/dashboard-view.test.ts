// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { DashboardView } from "../../src/injected/dashboard-view";
import { RuntimeI18n } from "../../src/injected/i18n";
import { RuntimeStore } from "../../src/injected/store";
import type { TagDefinition } from "../../src/injected/models";

vi.mock("../../src/injected/motion", () => ({ enterDashboard: vi.fn(), enterDashboardContent: vi.fn(), enterSortMenu: vi.fn(), exitDashboard: vi.fn(), refreshResults: vi.fn() }));
afterEach(() => { document.body.replaceChildren(); });

function setup(initial: TagDefinition[] = [{ name: "Bug", description: "Fix defects", color: "#d95c5c" }]) {
  let definitions = initial;
  const toolbar = document.createElement("div");
  document.body.append(toolbar);
  const store = new RuntimeStore();
  store.dispatch({ type: "dashboard.open" });
  store.dispatch({ type: "view.set", value: "settings" });
  const view = new DashboardView({
    store, state: store.state, i18n: new RuntimeI18n("en"), colorPresets: [{ name: "Blue", color: "#4f8fd7" }], fallbackBlue: "#4f8fd7",
    ensureToolbar: () => toolbar, getNavigationTemplate: () => null, getEntries: () => [], getTagDefinitions: () => definitions,
    getSearchState: () => ({ loading: false, error: "", indexStatus: { phase: "ready" }, contentMatches: new Map() }),
    scheduleContentSearch: () => {}, onTagDefinitionsChanged: (next) => { definitions = next; },
    onOpenEntry: () => {}, requestRender: (reason) => view.render([], reason), trace: () => {},
  });
  view.render([]);
  return { view, store, tags: () => definitions };
}

function input(selector: string): HTMLInputElement { return document.querySelector<HTMLInputElement>(selector)!; }
function click(selector: string): void { document.querySelector<HTMLButtonElement>(selector)!.click(); }
function submit(): void { document.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }

it("edits descriptions and custom colors without replacing titles or duplicating tags", () => {
  const { tags } = setup();
  click(".codex-sidebar-tag-config-name");
  expect(input(".codex-sidebar-tag-input").readOnly).toBe(true);
  input(".codex-sidebar-tag-description").value = "修复错误";
  const color = input(".codex-sidebar-tag-color-custom");
  color.value = "#123456";
  color.dispatchEvent(new Event("input"));
  submit();
  expect(tags()).toEqual([{ name: "Bug", description: "修复错误", color: "#123456" }]);
});

it("preserves an unsaved form when catalog or settings snapshots arrive", () => {
  const { view } = setup();
  const field = input(".codex-sidebar-tag-description");
  field.value = "输入中的中文";
  view.render([], "catalog-snapshot");
  view.render([], "settings-snapshot");
  expect(input(".codex-sidebar-tag-description")).toBe(field);
  expect(field.value).toBe("输入中的中文");
});

it("confirms deletion and retains undo across a settings broadcast", () => {
  const { view, tags } = setup();
  click(".codex-sidebar-tag-config-row .codex-sidebar-tag-delete");
  expect(tags()).toHaveLength(1);
  click(".codex-sidebar-tag-config-row .codex-sidebar-tag-delete");
  expect(tags()).toHaveLength(0);
  view.render([], "settings-snapshot");
  click(".codex-sidebar-tag-settings-note button");
  expect(tags()[0].name).toBe("Bug");
});

it("explains the limit without clearing the input or silently dropping a tag", () => {
  const { tags } = setup(Array.from({ length: 32 }, (_, index) => ({ name: `Tag${index}`, description: "", color: "#123456" })));
  input(".codex-sidebar-tag-input").value = "Another";
  submit();
  expect(tags()).toHaveLength(32);
  expect(document.querySelector(".codex-sidebar-tag-error")?.textContent).toContain("32");
  expect(input(".codex-sidebar-tag-input").value).toBe("Another");
});

it("does not destroy an open sort menu when background data arrives", () => {
  const { store, view } = setup();
  store.dispatch({ type: "view.set", value: "sessions" });
  store.dispatch({ type: "sort-menu.set", value: true });
  view.render([], "sort-toggle");
  const menu = document.querySelector(".codex-sidebar-sort-menu");
  expect(menu).not.toBeNull();
  view.render([], "catalog-snapshot");
  expect(document.querySelector(".codex-sidebar-sort-menu")).toBe(menu);
});

it("keeps the composing search input mounted during background refreshes", () => {
  const { store, view } = setup();
  store.dispatch({ type: "view.set", value: "sessions" });
  view.render([]);
  const field = input(".codex-sidebar-search-input");
  field.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
  field.value = "中文输入";
  view.render([], "catalog-snapshot");
  expect(input(".codex-sidebar-search-input")).toBe(field);
  field.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true }));
  expect(store.state.query).toBe("中文输入");
});
