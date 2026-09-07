import type { ParsedSessionTitle, SessionEntry } from "./models";

interface SessionRegistryBindings {
  rawTitleAttribute: string;
  rowAttribute: string;
  rowForTitle(node: HTMLElement): HTMLElement | null;
  threadIdForRow(row: HTMLElement | null): string | undefined;
  isPinnedRow(row: HTMLElement | null): boolean;
  projectIdForRow(row: HTMLElement | null): string | null;
  sectionToggleForRow(row: HTMLElement | null): HTMLElement | null;
  onPinnedToggle(toggle: HTMLElement): void;
}

export class SessionRegistry {
  private catalogIds: Set<string> | null = null;
  private readonly entriesByKey = new Map<string, SessionEntry>();
  private persistedCacheJson: string | null = null;

  constructor(
    private readonly storage: Storage,
    private readonly cacheKey: string,
    private readonly parseTitle: (value: string) => ParsedSessionTitle | null,
    private readonly colorForTag: (tag: string) => string,
  ) {
    this.restore();
  }

  ingest(nodes: HTMLElement[], bindings: SessionRegistryBindings): SessionEntry[] {
    nodes.forEach((node, index) => {
      const raw = node.getAttribute(bindings.rawTitleAttribute) ?? node.textContent?.trim() ?? "";
      const parsed = this.parseTitle(raw);
      if (!parsed) return;
      const row = bindings.rowForTitle(node);
      row?.setAttribute(bindings.rowAttribute, "true");
      const threadId = bindings.threadIdForRow(row);
      const localId = threadId?.replace(/^local:/u, "");
      const key = localId ?? `title:${raw}`;
      if (this.catalogIds && localId && !localId.includes(":") && !this.catalogIds.has(localId)) return;
      const pinned = bindings.isPinnedRow(row);
      if (pinned) {
        const toggle = bindings.sectionToggleForRow(row);
        if (toggle) bindings.onPinnedToggle(toggle);
      }
      this.entriesByKey.set(key, {
        ...this.entriesByKey.get(key),
        ...parsed,
        key,
        threadId,
        node,
        row,
        index: this.entriesByKey.get(key)?.index ?? index,
        pinned,
        projectId: bindings.projectIdForRow(row),
      });
    });
    this.persist();
    return this.values();
  }

  values(): SessionEntry[] {
    return Array.from(this.entriesByKey.values(), (entry) => ({
      ...entry,
      node: entry.node?.isConnected ? entry.node : null,
      row: entry.row?.isConnected ? entry.row : null,
    }));
  }

  applyCatalog(items: unknown[]): void {
    const ids = new Set<string>();
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Record<string, unknown>;
      if (typeof candidate.threadId !== "string" || typeof candidate.raw !== "string") continue;
      const parsed = this.parseTitle(candidate.raw);
      if (!parsed) continue;
      const key = candidate.threadId;
      ids.add(key);
      this.entriesByKey.set(key, {
        ...this.entriesByKey.get(key), ...parsed, key, threadId: this.entriesByKey.get(key)?.threadId ?? key,
        updatedAt: typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : 0,
        index: this.entriesByKey.get(key)?.index ?? ids.size,
        pinned: typeof candidate.pinned === "boolean" ? candidate.pinned : this.entriesByKey.get(key)?.pinned ?? false,
        projectId: typeof candidate.projectId === "string" ? candidate.projectId : this.entriesByKey.get(key)?.projectId ?? null,
      });
    }
    this.catalogIds = ids;
    for (const [key, entry] of this.entriesByKey) {
      const localId = entry.threadId?.replace(/^local:/u, "");
      if (localId && !localId.includes(":") && !ids.has(localId)) this.entriesByKey.delete(key);
    }
    this.persist();
  }

  updateColors(): void {
    this.entriesByKey.forEach((entry) => {
      entry.color = this.colorForTag(entry.tag);
    });
    this.persist();
  }

  reparse(): void {
    this.entriesByKey.forEach((entry) => {
      const parsed = this.parseTitle(entry.raw);
      if (parsed) Object.assign(entry, parsed);
    });
    this.persist();
  }

  delete(key: string): void {
    this.entriesByKey.delete(key);
    this.persist();
  }

  threadIds(): string[] {
    return Array.from(this.entriesByKey.values(), ({ threadId }) => threadId).filter((threadId): threadId is string => Boolean(threadId));
  }

  debugIndex(): Array<Pick<SessionEntry, "key" | "threadId" | "title" | "projectId" | "pinned">> {
    return Array.from(this.entriesByKey.values(), ({ key, threadId, title, projectId, pinned }) => ({ key, threadId, title, projectId, pinned }));
  }

  get size(): number {
    return this.entriesByKey.size;
  }

  clearPersistentCache(): void {
    try {
      this.storage.removeItem(this.cacheKey);
    } catch {
      // Storage can be unavailable in hardened renderer contexts; runtime cleanup must continue.
    }
  }

  private restore(): void {
    try {
      const savedEntries: unknown = JSON.parse(this.storage.getItem(this.cacheKey) ?? "[]");
      if (!Array.isArray(savedEntries)) return;
      savedEntries.forEach((candidate) => {
        if (!candidate || typeof candidate !== "object") return;
        const entry = candidate as Partial<SessionEntry>;
        if (typeof entry.key !== "string" || typeof entry.raw !== "string" || typeof entry.tag !== "string") return;
        const key = entry.threadId?.replace(/^local:/u, "") ?? entry.key;
        this.entriesByKey.set(key, {
          ...entry,
          key,
          color: this.colorForTag(entry.tag),
          node: null,
          row: null,
        } as SessionEntry);
      });
      this.persistedCacheJson = JSON.stringify(savedEntries);
    } catch {
      // An invalid cache is ignored; the native DOM repopulates the registry immediately.
    }
  }

  private persist(): void {
    try {
      const savedEntries = Array.from(this.entriesByKey.values(), ({ node: _node, row: _row, ...entry }) => entry);
      const nextCacheJson = JSON.stringify(savedEntries);
      if (nextCacheJson === this.persistedCacheJson) return;
      this.storage.setItem(this.cacheKey, nextCacheJson);
      this.persistedCacheJson = nextCacheJson;
    } catch {
      // Persistence is an optimization; live DOM bindings remain authoritative for navigation.
    }
  }
}
