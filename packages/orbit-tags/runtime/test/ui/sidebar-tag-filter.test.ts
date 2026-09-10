// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { SidebarTagFilter } from "../../src/injected/sidebar-tag-filter";
import { RuntimeI18n } from "../../src/injected/i18n";

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute("data-filter-active");
});

it("filters mounted rows absent from the catalog, including duplicate appearances and remounts", () => {
  let selected = "Bug";
  let rows: Array<{ row: HTMLElement; tag: string }> = [];
  const add = (tag: string) => {
    const row = document.createElement("div");
    document.body.append(row);
    rows.push({ row, tag });
    return row;
  };
  const feature = add("Feature");
  const duplicate = add("Feature");
  const bug = add("bug");
  const filter = new SidebarTagFilter({
    hostId: "filters", filteredAttribute: "data-filtered", activeAttribute: "data-filter-active",
    i18n: new RuntimeI18n("en"), neutralColor: "#777777", ensureHost: () => null,
    getEntries: () => [], getRows: () => rows, getSortMode: () => "tag", setSortMode: () => {}, getDefinitions: () => [],
    getSelectedTag: () => selected, setSelectedTag: (tag) => { selected = tag; },
    colorForTag: () => "#777777", trace: () => {},
  });
  filter.apply();
  expect(feature.getAttribute("data-filtered")).toBe("true");
  expect(duplicate.getAttribute("data-filtered")).toBe("true");
  expect(bug.hasAttribute("data-filtered")).toBe(false);
  feature.remove();
  rows = rows.filter(({ row }) => row !== feature);
  const replacement = add("Feature");
  filter.apply();
  expect(replacement.getAttribute("data-filtered")).toBe("true");
  selected = "all";
  filter.apply();
  expect(rows.every(({ row }) => !row.hasAttribute("data-filtered"))).toBe(true);
  selected = "Bug";
  filter.apply();
  filter.dispose(rows.map(({ row }) => row));
  expect(rows.every(({ row }) => !row.hasAttribute("data-filtered"))).toBe(true);
  expect(document.documentElement.hasAttribute("data-filter-active")).toBe(false);
});


it("counts sidebar members even when their rows are unmounted", () => {
  const host = document.createElement("section");
  const heading = document.createElement("button");
  const bug = document.createElement("div");
  const feature = document.createElement("div");
  const detached = document.createElement("div");
  document.body.append(host, heading, bug, feature);
  let selected = "all";
  const filter = new SidebarTagFilter({
    hostId: "filters", filteredAttribute: "data-filtered", activeAttribute: "data-filter-active",
    i18n: new RuntimeI18n("en"), neutralColor: "#777777",
    ensureHost: () => ({ filterHost: host, pinnedToggle: heading }),
    getEntries: () => [{ tag: "Bug" }, { tag: "Feature" }] as import("../../src/injected/models").SessionEntry[],
    getRows: () => [{ row: bug, tag: "Bug" }, { row: feature, tag: "Feature" }, { row: detached, tag: "Uncategorized" }],
    getSortMode: () => "tag", setSortMode: () => {},
    getDefinitions: () => [], getSelectedTag: () => selected,
    setSelectedTag: (tag) => { selected = tag; }, colorForTag: () => "#777777", trace: () => {},
  });
  const counts = () => Array.from(host.querySelectorAll<HTMLButtonElement>(".codex-sidebar-quick-filter")).map(b => [b.dataset.value, b.querySelector("span")?.textContent]);
  filter.render();
  expect(counts()).toEqual([["all", "2"], ["Bug", "1"], ["Feature", "1"]]);
  host.querySelector<HTMLButtonElement>('button[data-value="Bug"]')!.click();
  expect(counts()).toEqual([["all", "2"], ["Bug", "1"], ["Feature", "1"]]);
  expect(feature.hasAttribute("data-filtered")).toBe(true);
  document.body.append(detached);
  filter.render();
  expect(counts()).toEqual([["all", "2"], ["Bug", "1"], ["Feature", "1"]]);
  bug.remove();
  feature.remove();
  filter.render();
  expect(counts()).toEqual([["all", "2"], ["Bug", "1"], ["Feature", "1"]]);
});

it("offers independent sidebar modes and retains the open menu during refresh", () => {
  const host = document.createElement("section");
  const heading = document.createElement("button");
  document.body.append(host, heading);
  let mode: import("../../src/injected/sidebar-tag-filter").SidebarSortMode = "tag";
  const filter = new SidebarTagFilter({
    hostId: "filters", filteredAttribute: "data-filtered", activeAttribute: "data-filter-active",
    i18n: new RuntimeI18n("en"), neutralColor: "#777777",
    ensureHost: () => ({ filterHost: host, pinnedToggle: heading }),
    getEntries: () => [], getRows: () => [], getDefinitions: () => [],
    getSortMode: () => mode, setSortMode: (value) => { mode = value; },
    getSelectedTag: () => "Bug", setSelectedTag: () => {}, colorForTag: () => "#777777", trace: () => {},
  });
  filter.render();
  const trigger = host.querySelector<HTMLButtonElement>(".codex-sidebar-order-trigger")!;
  trigger.click();
  const menu = host.querySelector('[role="menu"]');
  expect(menu).not.toBeNull();
  filter.render();
  expect(host.querySelector('[role="menu"]')).toBe(menu);
  host.querySelector<HTMLButtonElement>('[data-mode="native"]')!.click();
  expect(mode).toBe("native");
  expect(host.querySelector('[role="menu"]')).toBeNull();
  trigger.click();
  expect(host.querySelector('[data-mode="native"]')!.getAttribute("aria-checked")).toBe("true");
  host.querySelector('[data-mode="native"]')!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  expect(host.querySelector('[role="menu"]')).toBeNull();
  expect(document.activeElement).toBe(trigger);
  filter.dispose([]);
});
