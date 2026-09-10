import { Fragment } from "preact";
import { render } from "preact";

import type { SessionEntry, SortMode } from "../models";

interface HighlightedTextProps {
  text: string;
  query: string;
}

function HighlightedText({ text, query }: HighlightedTextProps) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const matcher = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
  const parts = [];
  let cursor = 0;
  for (const match of text.matchAll(matcher)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(<mark key={`match-${index}`} class="codex-sidebar-search-mark">{match[0]}</mark>);
    cursor = index + match[0].length;
  }
  if (cursor === 0) return <>{text}</>;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return <Fragment>{parts}</Fragment>;
}

interface ResultsListProps {
  entries: SessionEntry[];
  query: string;
  sort: SortMode;
  emptyMessage: string;
  onOpen: (entry: SessionEntry) => void;
}

function ResultsList({ entries, query, sort, emptyMessage, onOpen }: ResultsListProps) {
  let lastGroup: string | null = null;
  if (entries.length === 0) return <div class="codex-sidebar-results-empty">{emptyMessage}</div>;
  return <>{entries.flatMap((entry) => {
    const nodes = [];
    if (sort === "tag" && entry.tag !== lastGroup) {
      lastGroup = entry.tag;
      nodes.push(<div key={`group-${entry.tag}`} class="codex-sidebar-result-group">{entry.tag}</div>);
    }
    nodes.push(
      <button key={entry.key} type="button" class="codex-sidebar-result" role="listitem" title={entry.raw} onClick={() => onOpen(entry)}>
        <span class="codex-sidebar-result-tag" style={{ "--codex-sidebar-tag-color": entry.color }}>{entry.tag}</span>
        <span class="codex-sidebar-result-content">
          <span class="codex-sidebar-result-title"><HighlightedText text={entry.title} query={query} /></span>
          {entry.snippet ? <span class="codex-sidebar-result-snippet"><HighlightedText text={entry.snippet} query={query} /></span> : null}
        </span>
      </button>,
    );
    return nodes;
  })}</>;
}

export function renderResultsList(host: HTMLElement, props: ResultsListProps): void {
  render(<ResultsList {...props} />, host);
}
