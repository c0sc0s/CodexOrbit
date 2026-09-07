import { describe, expect, it } from "vitest";

import { SessionRegistry } from "../src/injected/session-registry";

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe("SessionRegistry", () => {
  it("restores serializable records without stale DOM bindings", () => {
    const storage = new MemoryStorage();
    storage.setItem("sessions", JSON.stringify([{
      raw: "[Bug] Fix search",
      tag: "Bug",
      time: "",
      title: "Fix search",
      color: "#000000",
      tagged: true,
      key: "thread-1",
      threadId: "thread-1",
      index: 0,
      pinned: true,
      projectId: null,
    }]));
    const registry = new SessionRegistry(storage, "sessions", () => null, () => "#d95c5c");
    expect(registry.values()).toEqual([expect.objectContaining({ key: "thread-1", color: "#d95c5c", node: null, row: null })]);
    expect(registry.threadIds()).toEqual(["thread-1"]);
  });

  it("removes only its owned persistent cache", () => {
    const storage = new MemoryStorage();
    storage.setItem("sessions", "[]");
    storage.setItem("other", "kept");
    const registry = new SessionRegistry(storage, "sessions", () => null, () => "#888888");
    registry.clearPersistentCache();
    expect(storage.getItem("sessions")).toBeNull();
    expect(storage.getItem("other")).toBe("kept");
  });

  it("reparses cached entries when display locale changes", () => {
    const storage = new MemoryStorage();
    storage.setItem("sessions", JSON.stringify([{
      raw: "Plain title",
      tag: "Uncategorized",
      time: "",
      title: "Plain title",
      color: "#000000",
      tagged: false,
      key: "thread-1",
      threadId: "thread-1",
      index: 0,
      pinned: false,
      projectId: null,
    }]));
    let fallback = "Uncategorized";
    const registry = new SessionRegistry(storage, "sessions", (raw) => ({
      raw,
      tag: fallback,
      time: "",
      title: raw,
      color: "#888888",
      tagged: false,
    }), () => "#888888");
    fallback = "未分类";
    registry.reparse();
    expect(registry.values()[0]?.tag).toBe("未分类");
  });
});
