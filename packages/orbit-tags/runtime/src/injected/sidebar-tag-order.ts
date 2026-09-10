import type { SidebarOrderItem } from "./codex-dom-adapter";

export class SidebarTagOrder {
  private readonly originals = new Map<HTMLElement, { value: string; priority: string }>();

  apply(groups: SidebarOrderItem[][], definitions: string[], tagForTitle: (title: HTMLElement) => string): void {
    const configured = definitions.map((name) => name.toLocaleLowerCase());
    const active = new Set<HTMLElement>();
    for (const group of groups) {
      const tags = group.map(({ title }) => tagForTitle(title).toLocaleLowerCase());
      const unknown = [...new Set(tags.filter((tag) => !configured.includes(tag)))].sort();
      const order = [...configured, ...unknown];
      group.forEach(({ element }, index) => {
        active.add(element);
        if (!this.originals.has(element)) this.originals.set(element, {
          value: element.style.getPropertyValue("order"), priority: element.style.getPropertyPriority("order"),
        });
        // Equal CSS order keeps native DOM order, including host time updates and drag reordering.
        const value = String(order.indexOf(tags[index]) - order.length);
        if (element.style.order !== value) element.style.setProperty("order", value);
      });
    }
    for (const element of this.originals.keys()) if (!active.has(element)) this.restore(element);
  }

  dispose(): void {
    for (const element of this.originals.keys()) this.restore(element);
  }

  private restore(element: HTMLElement): void {
    const original = this.originals.get(element)!;
    if (original.value) element.style.setProperty("order", original.value, original.priority);
    else element.style.removeProperty("order");
    this.originals.delete(element);
  }
}
