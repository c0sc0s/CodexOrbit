import { mountTooltip } from "./tooltip.js";
import type { TooltipOptions } from "./tooltip.js";

export interface SidebarButtonOptions {
  id: string;
  label: string;
  icon: SVGSVGElement;
  template?: HTMLButtonElement;
  ariaLabel?: string;
  tooltip?: false | Omit<TooltipOptions, "id">;
  onClick?: (event: MouseEvent) => void;
}

export interface SidebarButton {
  element: HTMLButtonElement;
  dispose(): void;
}

const presentationAttributes = new Set([
  "class", "style", "data-color", "data-variant", "data-squircle", "data-pill", "data-uniform",
  "data-size", "data-icon-size", "data-suppress-active-style",
]);

export function createSidebarButton(options: SidebarButtonOptions): SidebarButton {
  const doc = options.icon.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error("Sidebar buttons require a browser document");
  const button = options.template?.cloneNode(true) as HTMLButtonElement | undefined ?? doc.createElement("button");
  // Clones inherit presentation, while native navigation, selection and popup identities stay with the host.
  for (const attribute of Array.from(button.attributes)) {
    if (!presentationAttributes.has(attribute.name)) button.removeAttribute(attribute.name);
  }
  button.type = "button";
  button.id = options.id;
  button.setAttribute("aria-label", options.ariaLabel ?? options.label);
  const icon = options.icon.cloneNode(true) as SVGSVGElement;
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  const nativeIcon = button.querySelector("svg");
  if (nativeIcon) {
    for (const name of ["class", "style", "width", "height"]) {
      const value = nativeIcon.getAttribute(name);
      if (value !== null) icon.setAttribute(name, value);
    }
    nativeIcon.replaceWith(icon);
  } else {
    icon.setAttribute("width", "20");
    icon.setAttribute("height", "20");
    button.prepend(icon);
  }
  const walker = doc.createTreeWalker(button, view.NodeFilter.SHOW_TEXT);
  let labeled = false;
  while (walker.nextNode()) {
    if (icon.contains(walker.currentNode)) continue;
    if (!walker.currentNode.textContent?.trim()) continue;
    walker.currentNode.textContent = labeled ? "" : options.label;
    labeled = true;
  }
  let style: HTMLStyleElement | null = null;
  if (!options.template) {
    button.append(doc.createTextNode(options.label));
    const selector = `#${view.CSS.escape(options.id)}`;
    style = doc.createElement("style");
    style.id = `${options.id}-style`;
    doc.getElementById(style.id)?.remove();
    style.textContent = `
      ${selector} { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 0 12px;
        border: 0; border-radius: 6px; background: transparent; color: var(--color-text-tertiary, var(--color-token-text-secondary, inherit));
        font: inherit; text-align: left; cursor: pointer; }
      ${selector}:hover { background: var(--color-token-list-hover-background, #8882); color: var(--color-text-foreground, inherit); }
      ${selector}:focus-visible { outline: 2px solid var(--color-border-focus, #4b8cff); outline-offset: -2px; }
    `;
    doc.head.append(style);
  }
  if (options.onClick) button.addEventListener("click", options.onClick);
  const disposeTooltip = options.tooltip === false ? () => {} : mountTooltip(button, {
    label: options.label, ...options.tooltip, id: `${options.id}-tooltip`,
  });
  return {
    element: button,
    dispose() {
      disposeTooltip();
      if (options.onClick) button.removeEventListener("click", options.onClick);
      style?.remove();
      button.remove();
    },
  };
}
