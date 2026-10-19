// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { getHomeSections } from "@c0sc0s/orbit/ui";
import { installRuntime } from "../../src/injected/runtime";
import { createRuntimeMessage, RuntimeMessageType } from "../../src/shared/protocol";

vi.mock("../../src/injected/motion", () => ({ enterDashboard: vi.fn(), enterDashboardContent: vi.fn(), enterSortMenu: vi.fn(), exitDashboard: vi.fn(), refreshResults: vi.fn() }));

afterEach(() => {
  window.__codexSidebarTags?.dispose();
  document.body.replaceChildren(); localStorage.clear(); document.documentElement.lang = "";
});

function working(): HTMLElement {
  const status = document.createElement("span");
  status.setAttribute("role", "status"); status.setAttribute("aria-label", "Working");
  status.innerHTML = '<span class="motion-safe:animate-spin"></span>';
  return status;
}

function thread(id: string, title: string, running = false): HTMLElement {
  const row = document.createElement("div");
  row.setAttribute("data-app-action-sidebar-thread-row", ""); row.setAttribute("data-app-action-sidebar-thread-id", id);
  const label = document.createElement("span"); label.setAttribute("data-thread-title", "true"); label.textContent = title;
  row.append(label); if (running) row.append(working()); document.body.append(row);
  return row;
}

function install() {
  document.body.insertAdjacentHTML("afterbegin", '<button>Plugins</button><button data-app-action-sidebar-section-toggle>Recents</button>');
  installRuntime({ version: "running-home-test", protocolVersion: 1, settingsSource: "repository",
    tagDefinitions: [{ name: "Bug", color: "#d95c5c", description: "" }], colorPresets: [{ name: "Coral", color: "#d95c5c" }],
    legacyToneColors: { neutral: "#7c8798", blue: "#4f8fd7" } }, async () => {});
}

function runningSection() {
  return getHomeSections().find(section => section.id === "orbit-tags-running-sessions");
}

function mountSection() {
  const section = runningSection()!;
  expect(section.slot).toBe("main");
  const container = document.createElement("div"); document.body.append(container);
  const unmount = section.mount(container), shadow = container.firstElementChild!.shadowRoot!;
  return { section, container, shadow, unmount, buttons: () => [...shadow.querySelectorAll<HTMLButtonElement>("button")] };
}

function mount() { install(); return mountSection(); }

it("shows working sessions once, including new sessions absent from the catalog, and ignores selected idle sessions", () => {
  document.documentElement.lang = "zh-CN";
  thread("local:running", "[Bug] Live task", true);
  thread("local:running", "[Bug] Live task", true);
  const idle = thread("local:idle", "Selected idle task");
  idle.setAttribute("data-app-action-sidebar-thread-active", "true"); idle.setAttribute("data-app-action-sidebar-thread-selected", "true");
  const host = mount();
  window.__codexSidebarTags!.handleMessage(createRuntimeMessage(RuntimeMessageType.catalogSnapshot, { complete: true, items: [] }));
  expect(host.buttons()).toHaveLength(1);
  expect(host.buttons()[0].dataset.threadId).toBe("local:running");
  expect(host.shadow.querySelector(".running-title")!.textContent).toBe("Live task");
  expect(host.shadow.querySelector(".running-tag")!.textContent).toBe("Bug");
  expect(host.shadow.querySelector(".running-summary")!.textContent).toBe("1 个会话正在运行");
  expect(host.section.title).toBe("正在运行");
  host.unmount();
});

it("registers only while sessions run and removes the entire contribution on completion", async () => {
  const row = thread("local:one", "One");
  install();
  expect(runningSection()).toBeUndefined();
  row.append(working());
  await vi.waitFor(() => expect(runningSection()).toBeDefined());
  const host = mountSection();
  expect(host.buttons()).toHaveLength(1);
  row.querySelector('[role="status"]')!.remove();
  await vi.waitFor(() => expect(runningSection()).toBeUndefined());
  expect(host.buttons()).toHaveLength(0);
  expect((host.container.firstElementChild as HTMLElement).hidden).toBe(true);
  host.unmount();
  row.append(working());
  await vi.waitFor(() => expect(runningSection()).toBeDefined());
  row.remove();
  await vi.waitFor(() => expect(runningSection()).toBeUndefined());
});

it("tracks status attribute changes across locales and keeps running sessions visible through tag filters", async () => {
  const row = thread("local:one", "[Feature] One", true);
  thread("local:idle", "[Bug] Idle");
  const host = mount(), button = host.buttons()[0];
  const filter = document.querySelector<HTMLButtonElement>('#codex-sidebar-tags-filter-bar [data-value="Bug"]')!;
  filter.click();
  expect(row.hasAttribute("data-codex-sidebar-tags-filtered")).toBe(true);
  expect(host.buttons()[0]).toBe(button);
  const status = row.querySelector('[role="status"]')!;
  status.setAttribute("aria-label", "正在运行");
  await vi.waitFor(() => expect(host.buttons()[0]).toBe(button));
  status.querySelector("span")!.className = "";
  await vi.waitFor(() => expect(host.buttons()).toHaveLength(0));
  status.querySelector("span")!.className = "motion-safe:animate-spin";
  await vi.waitFor(() => expect(host.buttons()).toHaveLength(1));
  status.setAttribute("role", "img");
  await vi.waitFor(() => expect(host.buttons()).toHaveLength(0));
  host.unmount();
});

it("opens a filtered native row and preserves the focused button while titles change", async () => {
  const row = thread("local:one", "[Bug] One", true), clicked = vi.fn();
  thread("local:idle", "[Feature] Idle");
  row.getClientRects = () => (row.hasAttribute("data-codex-sidebar-tags-filtered") ? [] : [{ width: 100, height: 20 }]) as unknown as DOMRectList;
  row.scrollIntoView = vi.fn(); row.addEventListener("click", clicked);
  const host = mount(), button = host.buttons()[0];
  document.querySelector<HTMLButtonElement>('#codex-sidebar-tags-filter-bar [data-value="Feature"]')!.click();
  expect(row.hasAttribute("data-codex-sidebar-tags-filtered")).toBe(true);
  button.focus();
  row.querySelector("[data-thread-title]")!.textContent = "[Bug] Updated";
  await vi.waitFor(() => expect(button.textContent).toContain("Updated"));
  expect(host.buttons()[0]).toBe(button); expect(host.shadow.activeElement).toBe(button);
  button.click();
  await vi.waitFor(() => expect(clicked).toHaveBeenCalledOnce());
  expect(row.hasAttribute("data-codex-sidebar-tags-filtered")).toBe(false);
  expect(document.querySelector('#codex-sidebar-tags-filter-bar [data-value="all"]')!.getAttribute("aria-pressed")).toBe("true");
  host.unmount();
});

it("remounts from live state and unregisters and cleans up on runtime disposal", async () => {
  const row = thread("local:one", "One", true), host = mount();
  host.unmount(); expect(host.container.childElementCount).toBe(0);
  row.querySelector('[role="status"]')!.remove();
  const unmount = host.section.mount(host.container);
  expect(host.container.firstElementChild!.shadowRoot!.querySelectorAll("button")).toHaveLength(0);
  unmount(); window.__codexSidebarTags!.dispose();
  expect(getHomeSections().some(section => section.id === host.section.id)).toBe(false);
});
