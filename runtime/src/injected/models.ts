export interface ContentChunk {
  role: string;
  text: string;
}

export interface SessionEntry {
  raw: string;
  tag: string;
  time: string;
  title: string;
  tone: string;
  tagged: boolean;
  key: string;
  threadId?: string;
  index: number;
  pinned: boolean;
  projectId: string | null;
  node?: HTMLElement | null;
  row?: HTMLElement | null;
  matchType?: "none" | "title" | "content";
  snippet?: string;
}

export type SortMode = "sidebar" | "time" | "tag" | "title";

export interface DashboardState {
  query: string;
  tag: string;
  sort: SortMode;
  sortOpen: boolean;
  open: boolean;
  view: "sessions" | "settings";
  tagError: string;
}
