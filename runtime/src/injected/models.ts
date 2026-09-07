export interface ContentSearchMatch {
  role: string;
  snippet: string;
  score: number;
}

export interface TagDefinition {
  name: string;
  color: string;
  description: string;
}

export interface ParsedSessionTitle {
  raw: string;
  tag: string;
  time: string;
  title: string;
  color: string;
  tagged: boolean;
}

export interface SessionRecord {
  raw: string;
  tag: string;
  time: string;
  title: string;
  color: string;
  tagged: boolean;
  key: string;
  threadId?: string;
  index: number;
  pinned: boolean;
  projectId: string | null;
}

export interface SessionHostBinding {
  node?: HTMLElement | null;
  row?: HTMLElement | null;
}

export interface SessionEntry extends SessionRecord, SessionHostBinding {
  matchType?: "none" | "title" | "content";
  snippet?: string;
}

export type SortMode = "sidebar" | "time" | "tag" | "title";
export type TagErrorCode = "" | "duplicate" | "invalid-name";

export interface DashboardState {
  query: string;
  tag: string;
  sort: SortMode;
  sortOpen: boolean;
  open: boolean;
  view: "sessions" | "settings";
  tagError: TagErrorCode;
}
