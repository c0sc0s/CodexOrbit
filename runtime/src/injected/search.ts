import type { ContentChunk, DashboardState, SessionEntry } from "./models";

function timeRank(value: string): number {
  const match = /^(\d{1,2})[-/.](\d{1,2})$/.exec(value);
  return match ? Number(match[1]) * 100 + Number(match[2]) : -1;
}

export function selectVisibleEntries(
  entries: SessionEntry[],
  state: Pick<DashboardState, "query" | "tag" | "sort">,
  contentByThread: ReadonlyMap<string, ContentChunk[]>,
): SessionEntry[] {
  const query = state.query.trim().toLocaleLowerCase();
  const filtered = entries.flatMap((entry): SessionEntry[] => {
    if (state.tag !== "all" && entry.tag !== state.tag) return [];
    if (!query) return [{ ...entry, matchType: "none", snippet: "" }];
    if (`${entry.tag} ${entry.time} ${entry.title}`.toLocaleLowerCase().includes(query)) {
      return [{ ...entry, matchType: "title", snippet: "" }];
    }
    const contentMatch = (contentByThread.get(entry.threadId ?? "") ?? [])
      .find(({ text }) => text.toLocaleLowerCase().includes(query));
    if (!contentMatch) return [];
    const normalized = contentMatch.text.replace(/\s+/gu, " ");
    const matchIndex = normalized.toLocaleLowerCase().indexOf(query);
    const start = Math.max(0, matchIndex - 46);
    const end = Math.min(normalized.length, matchIndex + query.length + 82);
    const snippet = `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
    return [{ ...entry, matchType: "content", snippet: `${contentMatch.role}：${snippet}` }];
  });
  if (state.sort === "time") return filtered.sort((left, right) => timeRank(right.time) - timeRank(left.time) || left.index - right.index);
  if (state.sort === "tag") return filtered.sort((left, right) => left.tag.localeCompare(right.tag, "zh-CN") || left.title.localeCompare(right.title, "zh-CN"));
  if (state.sort === "title") return filtered.sort((left, right) => left.title.localeCompare(right.title, "zh-CN", { numeric: true }));
  return filtered.sort((left, right) => left.index - right.index);
}
