// @vitest-environment happy-dom
import { afterEach, expect, it } from "vitest";
import { sidebarOrderGroups } from "../../src/injected/codex-dom-adapter";
import { SidebarTagOrder } from "../../src/injected/sidebar-tag-order";
import { buildRuntimeStyles } from "../../src/injected/styles";

afterEach(() => document.body.replaceChildren());

function list(tags: string[]) {
  const parent = document.createElement("div");
  parent.style.cssText = "display:flex;flex-direction:column";
  for (const tag of tags) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = '<div><span class="contents"><div data-app-action-sidebar-thread-row><span data-thread-title></span></div></span></div>';
    wrapper.querySelector("[data-thread-title]")!.textContent = tag;
    parent.append(wrapper);
  }
  document.body.append(parent);
  return parent;
}

it("groups each list independently while preserving DOM order and native updates within tags", () => {
  const pinned = list(["Research", "Bug", "Feature", "bug"]);
  const project = list(["Bug", "Feature"]);
  const original = [...pinned.children];
  const order = new SidebarTagOrder();
  const apply = () => order.apply(sidebarOrderGroups(), ["Feature", "Bug", "Research"], (title) => title.textContent!);
  apply();
  expect([...pinned.children]).toEqual(original);
  expect([...pinned.children].map((e) => (e as HTMLElement).style.order)).toEqual(["-1", "-2", "-3", "-2"]);
  expect([...project.children].map((e) => (e as HTMLElement).style.order)).toEqual(["-2", "-3"]);
  pinned.insertBefore(original[3], original[1]);
  apply();
  expect([...pinned.children]).toEqual([original[0], original[3], original[1], original[2]]);
  order.dispose();
  expect([...pinned.children].every((e) => !(e as HTMLElement).style.order)).toBe(true);
});

it("restores existing order and releases disconnected wrappers", () => {
  const parent = list(["Bug", "Feature"]);
  const first = parent.firstElementChild as HTMLElement;
  first.style.setProperty("order", "7", "important");
  const order = new SidebarTagOrder();
  const apply = () => order.apply(sidebarOrderGroups(), ["Bug", "Feature"], (title) => title.textContent!);
  apply();
  first.remove();
  apply();
  expect(first.style.order).toBe("7");
  expect(first.style.getPropertyPriority("order")).toBe("important");
  order.dispose();
});

it("does not treat project containers as thread items", () => {
  const parent = list(["Bug", "Feature"]);
  parent.firstElementChild!.insertAdjacentHTML("afterbegin", '<div data-app-action-sidebar-project-row></div>');
  expect(sidebarOrderGroups()).toEqual([]);
});

it("keeps the tag column visible during filtering", () => {
  const styles = buildRuntimeStyles({ enhancedAttribute: "enhanced", toolbarId: "toolbar", filterBarId: "filters", filteredAttribute: "filtered", rowAttribute: "row" });
  expect(styles).not.toContain('[data-codex-sidebar-tags-filter-active="true"]');
});
