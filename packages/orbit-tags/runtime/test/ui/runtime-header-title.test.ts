// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { installRuntime } from "../../src/injected/runtime";

afterEach(() => {
  window.__codexSidebarTags?.dispose();
  document.body.replaceChildren();
  localStorage.clear();
});

function header(raw: string): { toolbar: HTMLElement; title: HTMLElement; text: Text } {
  const toolbar = document.createElement("div");
  toolbar.setAttribute("data-app-shell-header-toolbar", "true");
  toolbar.innerHTML = '<span data-app-shell-titlebar-content><span role="img" aria-label="Project"><svg></svg></span><div class="truncate"></div></span><button>Actions</button>';
  const title = toolbar.querySelector<HTMLElement>(".truncate")!;
  const text = document.createTextNode(raw);
  title.append(text);
  return { toolbar, title, text };
}

function install(): void {
  installRuntime({
    version: "header-title-test", protocolVersion: 1, settingsSource: "repository",
    tagDefinitions: [{ name: "Bug", color: "#d95c5c" }],
    colorPresets: [{ name: "Coral", color: "#d95c5c" }],
    legacyToneColors: { neutral: "#7c8798", blue: "#4f8fd7" },
  }, async () => {});
}

it.each([
  ["[JP 成长线] JP 周报 客户端逻辑", "JP 周报 客户端逻辑"],
  ["【调研】【09-04】侧栏渲染", "侧栏渲染"],
  ["[Uncategorized] 普通任务", "普通任务"],
  ["普通标题 [补充说明]", "普通标题 [补充说明]"],
])("displays %s without changing the host nodes or sidebar metadata", (raw, display) => {
  const { toolbar, title, text } = header(raw);
  document.body.innerHTML = '<button>Plugins</button><div data-app-action-sidebar-thread-row><span data-thread-title>[Bug] Fix sidebar</span></div>';
  document.body.append(toolbar);
  const icon = toolbar.querySelector("svg"), button = toolbar.querySelector("button")!;
  const onClick = vi.fn();
  button.addEventListener("click", onClick);
  install();

  expect(title.textContent).toBe(display);
  expect(title.firstChild).toBe(text);
  expect(toolbar.querySelector("svg")).toBe(icon);
  button.click();
  expect(onClick).toHaveBeenCalledOnce();
  expect(document.querySelector("[data-thread-title]")?.getAttribute("data-codex-sidebar-tags-raw")).toBe("[Bug] Fix sidebar");
  expect(document.querySelector(".codex-sidebar-tag-chip")?.textContent).toBe("Bug");
  window.__codexSidebarTags?.dispose();
  expect(text.data).toBe(raw);
});

it("follows native renames and preserves a newer host title during disposal", async () => {
  const { toolbar, text } = header("[Bug] First");
  document.body.append(toolbar);
  install();
  text.data = "[Feature] Renamed";
  await vi.waitFor(() => expect(text.data).toBe("Renamed"));
  window.__codexSidebarTags?.dispose();
  expect(text.data).toBe("[Feature] Renamed");
  install();
  text.data = "Plain title";
  await vi.waitFor(() => expect(window.__codexSidebarTags?.status().observerRefreshCount).toBeGreaterThan(0));
  expect(text.data).toBe("Plain title");
  text.data = "[Design] Latest native update";
  window.__codexSidebarTags?.dispose();
  expect(text.data).toBe("[Design] Latest native update");
});

it("handles late headers and chat switches while restoring detached titles", async () => {
  install();
  const first = header("[Bug] First");
  document.body.append(first.toolbar);
  await vi.waitFor(() => expect(first.text.data).toBe("First"));
  const second = header("[Feature] Second");
  first.toolbar.replaceWith(second.toolbar);
  await vi.waitFor(() => expect(second.text.data).toBe("Second"));
  expect(first.text.data).toBe("[Bug] First");
  window.__codexSidebarTags?.dispose();
  expect(second.text.data).toBe("[Feature] Second");
});

it("restores editable titles and leaves unfamiliar header content alone", async () => {
  const { toolbar, title, text } = header("[Bug] Editable");
  document.body.append(toolbar);
  install();
  title.contentEditable = "true";
  await vi.waitFor(() => expect(text.data).toBe("[Bug] Editable"));
  title.contentEditable = "false";
  await vi.waitFor(() => expect(text.data).toBe("Editable"));
  title.append(document.createElement("button"));
  await vi.waitFor(() => expect(text.data).toBe("[Bug] Editable"));
});
