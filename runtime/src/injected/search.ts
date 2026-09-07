import type { ContentSearchMatch, DashboardState, SessionEntry } from "./models";

export function selectVisibleEntries(
  entries: SessionEntry[],
  state: Pick<DashboardState, "query" | "tag" | "sort">,
  contentMatches: ReadonlyMap<string, ContentSearchMatch>,
): SessionEntry[] {
  const query = state.query.trim().toLocaleLowerCase();
  const filtered = entries.flatMap((entry): SessionEntry[] => {
    if (state.tag !== "all" && entry.tag !== state.tag) return [];
    if (!query) return [{ ...entry, matchType: "none", snippet: "" }];
    if (`${entry.tag} ${entry.time} ${entry.title}`.toLocaleLowerCase().includes(query)) {
      return [{ ...entry, matchType: "title", snippet: "" }];
    }
    const contentMatch = contentMatches.get(entry.threadId ?? "");
    if (!contentMatch) return [];
    return [{ ...entry, matchType: "content", snippet: `${contentMatch.role}：${contentMatch.snippet}` }];
  });
  if (state.sort === "time") return filtered.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0) || left.index - right.index);
  if (state.sort === "tag") return filtered.sort((left, right) => left.tag.localeCompare(right.tag, "zh-CN") || left.title.localeCompare(right.title, "zh-CN"));
  if (state.sort === "title") return filtered.sort((left, right) => left.title.localeCompare(right.title, "zh-CN", { numeric: true }));
  return filtered.sort((left, right) => left.index - right.index);
}
