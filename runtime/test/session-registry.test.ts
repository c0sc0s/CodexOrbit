import { describe, expect, it } from "vitest";

import { SessionRegistry } from "../src/injected/session-registry";
import { selectVisibleEntries } from "../src/injected/search";

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
  it("removes cached internal sessions from counts, search scope and stale search results", () => {
    const storage = new MemoryStorage();
    storage.setItem("sessions", JSON.stringify(["user", "child", "review"].map((id) => ({ key: `local:${id}`, threadId: `local:${id}`, raw: "Task", tag: "Bug" }))));
    const registry = new SessionRegistry(storage, "sessions", (raw) => ({ raw, tag: "Bug", title: raw, time: "", color: "#123456", tagged: true }), () => "#123456");
    registry.applyCatalog([{ threadId: "user", raw: "Task" }]);
    expect(registry.size).toBe(1);
    expect(registry.threadIds()).toEqual(["local:user"]);
    expect(JSON.parse(storage.getItem("sessions")!).map((item: { key: string }) => item.key)).toEqual(["user"]);
    const matches = new Map([["local:child", { threadId: "local:child", role: "Codex", snippet: "internal match", score: 1 }]]);
    expect(selectVisibleEntries(registry.values(), { query: "internal", tag: "all", sort: "default" }, matches)).toEqual([]);
  });
  it("merges legacy local-prefixed cache keys with authoritative catalog entries", () => {
    const storage = new MemoryStorage();
    storage.setItem("sessions", JSON.stringify([{ key: "local:123", threadId: "local:123", raw: "Old title", tag: "Bug", pinned: true, projectId: "project-1" }]));
    const registry = new SessionRegistry(storage, "sessions", (raw) => ({ raw, tag: "Bug", title: raw, time: "", color: "#123456", tagged: true }), () => "#123456");
    registry.applyCatalog([{ threadId: "123", raw: "New title", updatedAt: 100 }]);
    expect(registry.values()).toHaveLength(1);
    expect(registry.values()[0].title).toBe("New title");
    expect(registry.values()[0].pinned).toBe(true);
    expect(registry.values()[0].projectId).toBe("project-1");
    registry.applyCatalog([]);
    expect(registry.values()).toHaveLength(0);
  });
  it("accepts never-mounted sessions and removes archived entries on the next catalog", () => {
    const storage = new MemoryStorage();
    const registry = new SessionRegistry(storage, "sessions", (raw) => ({ raw, tag: "Bug", title: raw, time: "", color: "#123456", tagged: true }), () => "#123456");
    registry.applyCatalog([{ threadId: "1", raw: "[Bug]Never expanded", updatedAt: 100 }]);
    expect(registry.values()[0].updatedAt).toBe(100);
    expect(registry.values()[0].node).toBeNull();
    registry.applyCatalog([]);
    expect(registry.values()).toHaveLength(0);
  });
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
