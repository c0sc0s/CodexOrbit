import { createSidebarButton } from "@c0sc0s/orbit/ui";
import type { SidebarButton } from "@c0sc0s/orbit/ui";

function navigationTemplate(): HTMLButtonElement | undefined {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("button")];
  for (const labels of [["Plugins", "插件"], ["Tools", "Tool", "工具"]]) {
    const matches = buttons.filter(button => labels.includes(button.textContent?.trim() ?? "")
      || labels.includes(button.getAttribute("aria-label") ?? ""));
    const button = matches.find(item => item.closest("nav, aside")) ?? matches[0];
    if (button) return button;
  }
}

function todoIcon(): SVGSVGElement {
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.7");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  const path = document.createElementNS(icon.namespaceURI, "path");
  path.setAttribute("d", "m3 6 1.5 1.5L7 5m-4 7 1.5 1.5L7 11m-4 7 1.5 1.5L7 17M11 6h10M11 12h10M11 18h10");
  icon.append(path);
  return icon;
}

export function mountSidebarLauncher(onOpen: () => void) {
  let control: SidebarButton | null = null;
  let anchor: HTMLElement | null = null;
  let frame: number | null = null;
  let expanded = false;
  const reconcile = () => {
    if (control?.element.isConnected && anchor?.isConnected) return;
    control?.dispose(); control = null;
    const template = navigationTemplate();
    if (!template) return;
    const wrapper = template.parentElement;
    anchor = wrapper && getComputedStyle(wrapper).display === "contents" ? wrapper : template;
    control = createSidebarButton({
      id: "orbit-todo-launcher", label: "Todo", icon: todoIcon(), template,
      ariaLabel: "打开待办任务", tooltip: { label: "待办" }, onClick: onOpen,
    });
    control.element.setAttribute("aria-haspopup", "dialog");
    control.element.setAttribute("aria-expanded", String(expanded));
    anchor.insertAdjacentElement("afterend", control.element);
  };
  const observer = new MutationObserver(() => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => { frame = null; reconcile(); });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  reconcile();
  return {
    element: () => control?.element ?? null,
    setExpanded(value: boolean) { expanded = value; control?.element.setAttribute("aria-expanded", String(value)); },
    dispose() {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      control?.dispose(); control = null;
    },
  };
}
