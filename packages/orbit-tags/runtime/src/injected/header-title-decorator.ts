import { parseTitleMetadata } from "../shared/title-format.js";

interface HeaderTitleState {
  raw: string;
  display: string;
}

export class HeaderTitleDecorator {
  private readonly originals = new Map<Text, HeaderTitleState>();

  refresh(nodes: Iterable<Text>): void {
    const current = new Set(nodes);
    for (const [node, original] of this.originals) {
      if (current.has(node)) continue;
      this.restore(node, original);
      this.originals.delete(node);
    }
    for (const node of current) {
      if (node.data === this.originals.get(node)?.display) continue;
      const raw = node.data;
      const parsed = parseTitleMetadata(raw);
      if (!parsed) {
        this.originals.delete(node);
        continue;
      }
      this.originals.set(node, { raw, display: parsed.title });
      // Keep the host's text node so native reconciliation and title controls retain their references.
      node.data = parsed.title;
    }
  }

  dispose(): void {
    for (const [node, original] of this.originals) this.restore(node, original);
    this.originals.clear();
  }

  private restore(node: Text, original: HeaderTitleState): void {
    if (node.data === original.display) node.data = original.raw;
  }
}
