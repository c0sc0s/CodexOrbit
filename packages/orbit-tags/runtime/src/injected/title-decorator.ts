import type { ParsedSessionTitle } from "./models";

interface OriginalNodeState {
  children: Node[];
  ariaLabel: string | null;
  title: string | null;
}

interface TitleDecoratorOptions {
  version: string;
  toolbarId: string;
  enhancedAttribute: string;
  rawTitleAttribute: string;
  parseTitle(value: unknown): ParsedSessionTitle | null;
}

export class TitleDecorator {
  private readonly originalNodeState = new WeakMap<HTMLElement, OriginalNodeState>();

  constructor(private readonly options: TitleDecoratorOptions) {}

  enhance(node: HTMLElement): void {
    const { version, toolbarId, enhancedAttribute, rawTitleAttribute } = this.options;
    if (node.closest(`#${toolbarId}`)) return;
    const generated = node.querySelector(":scope > .codex-sidebar-tag-layout");
    if (node.getAttribute(enhancedAttribute) === version && generated) return;
    const existingRaw = node.getAttribute(rawTitleAttribute);
    const raw = existingRaw !== null && generated ? existingRaw : (node.textContent?.trim() ?? "");
    const parsed = this.options.parseTitle(raw);
    if (!parsed?.tagged) {
      if (existingRaw !== null) this.restore(node);
      return;
    }
    if (!this.originalNodeState.has(node)) {
      this.originalNodeState.set(node, {
        children: [...node.childNodes].map((child) => child.cloneNode(true)),
        ariaLabel: node.getAttribute("aria-label"),
        title: node.getAttribute("title"),
      });
    }

    const layout = document.createElement("span");
    layout.className = "codex-sidebar-tag-layout";
    const tag = document.createElement("span");
    tag.className = "codex-sidebar-tag-chip";
    tag.style.setProperty("--codex-sidebar-tag-color", parsed.color);
    tag.textContent = parsed.tag;
    const title = document.createElement("span");
    title.className = "codex-sidebar-tag-title";
    title.textContent = parsed.title;
    layout.append(tag, title);
    node.setAttribute(rawTitleAttribute, parsed.raw);
    node.setAttribute(enhancedAttribute, version);
    node.setAttribute("aria-label", parsed.raw);
    node.setAttribute("title", parsed.raw);
    node.replaceChildren(layout);
  }

  refreshColors(nodes: Iterable<HTMLElement>): void {
    for (const node of nodes) {
      const parsed = this.options.parseTitle(node.getAttribute(this.options.rawTitleAttribute));
      const chip = node.querySelector<HTMLElement>(":scope > .codex-sidebar-tag-layout > .codex-sidebar-tag-chip");
      if (parsed && chip) chip.style.setProperty("--codex-sidebar-tag-color", parsed.color);
    }
  }

  restore(node: HTMLElement): void {
    const { enhancedAttribute, rawTitleAttribute } = this.options;
    const raw = node.getAttribute(rawTitleAttribute);
    if (raw === null) return;
    const original = this.originalNodeState.get(node);
    if (original) node.replaceChildren(...original.children.map((child) => child.cloneNode(true)));
    else node.replaceChildren(document.createTextNode(raw));
    node.removeAttribute(enhancedAttribute);
    node.removeAttribute(rawTitleAttribute);
    this.restoreAttribute(node, "aria-label", original?.ariaLabel);
    this.restoreAttribute(node, "title", original?.title);
    this.originalNodeState.delete(node);
  }

  dispose(nodes: Iterable<HTMLElement>): void {
    for (const node of nodes) this.restore(node);
  }

  private restoreAttribute(node: HTMLElement, name: string, value: string | null | undefined): void {
    if (value == null) node.removeAttribute(name);
    else node.setAttribute(name, value);
  }
}
