// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { mountSidebarLauncher } from "../../src/injected/sidebar-launcher";

const disposers: Array<() => void> = [];
afterEach(() => { disposers.splice(0).reverse().forEach(dispose => dispose()); document.body.replaceChildren(); });
const nativeButton = () => {
  const button = document.createElement("button");
  button.className = "native-tool";
  button.setAttribute("data-sidebar-destination", "plugins");
  button.setAttribute("aria-current", "page");
  button.innerHTML = '<svg width="18" height="18" class="native-icon"></svg><span>Plugins</span>';
  return button;
};

it("mounts a native-shaped Todo entry beside Plugins without modifying peer tools", () => {
  const nav = document.createElement("nav"), plugins = nativeButton(), peer = document.createElement("button");
  peer.textContent = "Tags"; nav.append(plugins, peer); document.body.append(nav);
  const open = vi.fn(), launcher = mountSidebarLauncher(open); disposers.push(launcher.dispose);
  const button = launcher.element()!;
  expect(button.previousElementSibling).toBe(plugins);
  expect(button.nextElementSibling).toBe(peer);
  expect(button.className).toBe("native-tool");
  expect(button.textContent).toBe("Todo");
  expect(button.querySelector("svg")?.getAttribute("width")).toBe("18");
  expect(button.querySelector("svg")?.getAttribute("viewBox")).toBe("0 0 24 24");
  expect(button.hasAttribute("aria-current")).toBe(false);
  expect(button.hasAttribute("data-sidebar-destination")).toBe(false);
  expect(button.getAttribute("aria-haspopup")).toBe("dialog");
  button.click(); expect(open).toHaveBeenCalledOnce();
  launcher.setExpanded(true); expect(button.getAttribute("aria-expanded")).toBe("true");
  launcher.dispose(); expect(plugins.isConnected && peer.isConnected).toBe(true);
});

it("waits for navigation and remounts once when Codex replaces the tool group", async () => {
  const launcher = mountSidebarLauncher(() => {}); disposers.push(launcher.dispose);
  expect(launcher.element()).toBeNull();
  expect(document.querySelector(".ot-launcher")).toBeNull();
  const nav = document.createElement("nav"); nav.append(nativeButton()); document.body.append(nav);
  await vi.waitFor(() => expect(launcher.element()?.isConnected).toBe(true));
  const previous = launcher.element(); launcher.setExpanded(true);
  const replacement = document.createElement("nav"); replacement.append(nativeButton()); nav.replaceWith(replacement);
  await vi.waitFor(() => expect(launcher.element()).not.toBe(previous));
  expect(document.querySelectorAll("#orbit-todo-launcher")).toHaveLength(1);
  expect(launcher.element()?.getAttribute("aria-expanded")).toBe("true");
  launcher.dispose();
  document.body.append(nativeButton());
  await new Promise(resolve => setTimeout(resolve, 30));
  expect(document.querySelector("#orbit-todo-launcher")).toBeNull();
});

it("uses the shared tooltip lifecycle for keyboard focus", () => {
  const nav = document.createElement("nav"); nav.append(nativeButton()); document.body.append(nav);
  const launcher = mountSidebarLauncher(() => {}); disposers.push(launcher.dispose);
  const button = launcher.element()!; button.focus();
  const tooltip = document.getElementById(button.getAttribute("aria-describedby")!);
  expect(tooltip?.getAttribute("role")).toBe("tooltip");
  expect(tooltip?.textContent).toBe("待办");
  button.click(); expect(tooltip?.isConnected).toBe(false);
  launcher.dispose(); expect(document.getElementById("orbit-todo-launcher-tooltip")).toBeNull();
});
