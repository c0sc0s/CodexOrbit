import { describe, expect, it } from "vitest";

import type { SessionEntry } from "../src/injected/models";
import { selectVisibleEntries } from "../src/injected/search";
import { createInitialState } from "../src/injected/store";

const entries: SessionEntry[] = [
  { raw: "[Bug] 修复排序", tag: "Bug", time: "", title: "修复排序", tone: "red", tagged: true, key: "1", threadId: "1", index: 1, pinned: false, projectId: null },
  { raw: "[调研][09-04] 高价值样本", tag: "调研", time: "09-04", title: "高价值样本", tone: "purple", tagged: true, key: "2", threadId: "2", index: 0, pinned: false, projectId: null },
];

describe("selectVisibleEntries", () => {
  it("searches titles and preserves sidebar order", () => {
    const state = { ...createInitialState(), query: "高价值" };
    expect(selectVisibleEntries(entries, state, new Map()).map(({ key }) => key)).toEqual(["2"]);
  });

  it("creates a contextual content snippet", () => {
    const state = { ...createInitialState(), query: "中文关键词" };
    const content = new Map([["1", { role: "你", snippet: "这是一段包含中文关键词的会话正文", score: 1 }]]);
    const [result] = selectVisibleEntries(entries, state, content);
    expect(result.key).toBe("1");
    expect(result.snippet).toContain("你：这是一段包含中文关键词的会话正文");
  });

  it("does not retain full conversation content in the renderer", () => {
    const state = { ...createInitialState(), query: "关键词" };
    const content = new Map([["1", { role: "Codex", snippet: "只返回关键词附近的摘要", score: 1 }]]);
    const [result] = selectVisibleEntries(entries, state, content);
    expect(result.snippet).toBe("Codex：只返回关键词附近的摘要");
  });

  it("combines tag filtering and title sorting", () => {
    const state = { ...createInitialState(), tag: "Bug", sort: "title" as const };
    expect(selectVisibleEntries(entries, state, new Map()).map(({ key }) => key)).toEqual(["1"]);
  });
});
