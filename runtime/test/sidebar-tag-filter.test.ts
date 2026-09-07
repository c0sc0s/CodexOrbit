// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { SidebarTagFilter } from "../src/injected/sidebar-tag-filter";
import { RuntimeI18n } from "../src/injected/i18n";

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
    getRows: () => rows, getDefinitions: () => [],
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


it("counts only mounted rows and keeps counts stable across tag filtering", () => {
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
    getRows: () => [{ row: bug, tag: "Bug" }, { row: feature, tag: "Feature" }, { row: detached, tag: "Uncategorized" }],
    getDefinitions: () => [], getSelectedTag: () => selected,
    setSelectedTag: (tag) => { selected = tag; }, colorForTag: () => "#777777", trace: () => {},
  });
  const counts = () => Array.from(host.querySelectorAll<HTMLButtonElement>("button")).map(b => [b.dataset.value, b.querySelector("span")?.textContent]);
  filter.render();
  expect(counts()).toEqual([["all", "2"], ["Bug", "1"], ["Feature", "1"]]);
  host.querySelector<HTMLButtonElement>('button[data-value="Bug"]')!.click();
  expect(counts()).toEqual([["all", "2"], ["Bug", "1"], ["Feature", "1"]]);
  expect(feature.hasAttribute("data-filtered")).toBe(true);
  document.body.append(detached);
  filter.render();
  expect(counts()).toContainEqual(["Uncategorized", "1"]);
});
