export const RUNTIME_VERSION = "0.7.0";
export const PLUGIN_ID = "better-work-tree";
export const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export type GitState = { status: "ready"; root: string; branch: string | null; commit: string | null; worktree: boolean }
  | { status: "not-git" | "unavailable" };
export interface ExecutionRecord { cwd: string; recordedAt: string | null; turnId: string | null }
export interface ToolDirectoryRecord { directories: string[]; recordedAt: string | null; tool: "exec_command"; unresolved?: boolean }
export interface ToolDirectorySnapshot { directory: string; git: GitState }
export interface WorkspaceSnapshot {
  sessionId: string;
  directory: string;
  displayDirectory: string;
  source: "applied" | "turn" | "catalog";
  registeredDirectory: string;
  lastExecution: ExecutionRecord | null;
  appliedDirectory: string | null;
  pendingDirectory: string | null;
  disagreement: boolean;
  toolActivity: { recordedAt: string | null; tool: "exec_command"; directories: ToolDirectorySnapshot[]; unresolved?: boolean } | null;
  git: GitState;
  checkedAt: number;
}
export type WorkspaceResult = { status: "ready"; snapshot: WorkspaceSnapshot }
  | { status: "missing" | "unavailable" | "directory-missing" };
export function localSessionId(value: string | null): string | null {
  const id = value?.startsWith("local:") ? value.slice(6) : value;
  return id && SESSION_ID.test(id) ? id.toLowerCase() : null;
}
export function sessionFromUrl(value: string): string | null {
  try {
    const match = new URL(value).pathname.match(/\/(?:threads|thread|chat)\/([^/]+)\/?$/u);
    return localSessionId(match?.[1] ?? null);
  } catch { return null; }
}
export function localSessionIdentity(selected: string | null, url: string): { key: string; id: string | null } | null {
  const id = selected ? localSessionId(selected) : sessionFromUrl(url);
  if (id) return { key: id, id };
  const prefix = "local:client-new-thread:";
  return selected?.startsWith(prefix) && SESSION_ID.test(selected.slice(prefix.length)) ? { key: selected, id: null } : null;
}
export function currentWorkspace(snapshot: WorkspaceSnapshot): ToolDirectorySnapshot | null {
  if (snapshot.toolActivity?.unresolved) return null;
  const directories = snapshot.toolActivity?.directories ?? [];
  if (directories.length > 1) return null;
  return directories[0] ?? { directory: snapshot.directory, git: snapshot.git };
}
