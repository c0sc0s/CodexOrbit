export const RUNTIME_VERSION = "0.1.13";
export const MAX_DEPTH = 16;
export const PAGE_SIZE = 200;
export type TaskStatus = "todo" | "doing" | "done";
export interface TaskSummary {
  id: string;
  parentId: string | null;
  title: string;
  status: TaskStatus;
  project: string | null;
  threadId: string | null;
  dueDate: string | null;
  position: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}
export interface Task extends TaskSummary { description: string }
export interface StatusUndo { id: string; ifRevision: number; status: TaskStatus }
export interface CompletionResult { task: Task; undo: StatusUndo[] }
export interface CreateTask {
  title: string;
  description?: string;
  parentId?: string | null;
  project?: string | null;
  threadId?: string | null;
  dueDate?: string | null;
  children?: CreateTask[];
}
export interface TaskPatch {
  title?: string;
  description?: string;
  parentId?: string | null;
  project?: string | null;
  threadId?: string | null;
  dueDate?: string | null;
  status?: TaskStatus;
}
export interface TaskQuery {
  status?: "open" | TaskStatus;
  project?: string;
  threadId?: string;
  query?: string;
  archived?: boolean;
  offset?: number;
  limit?: number;
}
export interface TaskPage { items: TaskSummary[]; total: number; generation: number }
export type Result<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
export class TodoError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
export function failure(error: unknown): Result<never> {
  return { ok: false, error: error instanceof TodoError
    ? { code: error.code, message: error.message }
    : { code: "storage_error", message: "无法访问本地任务库，请检查数据目录和数据库状态。" } };
}
export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new TodoError(result.error.code, result.error.message);
  return result.data;
}
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TodoError("invalid_input", "需要一个 JSON 对象。");
  return value as Record<string, unknown>;
}
export function text(value: unknown, name: string, max: number, nullable = false): string | null {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || value.length > max) throw new TodoError("invalid_input", `${name} 必须是至多 ${max} 字的文本。`);
  return value.trim();
}
export function taskId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(value)) throw new TodoError("invalid_input", "需要完整的任务 UUID。");
  return value;
}
export function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw new TodoError("invalid_input", "更新任务需要最新的 ifRevision。请先 get 读取任务。");
  return value as number;
}
export function parsePatch(value: unknown, create = false): TaskPatch {
  const input = object(value), result: TaskPatch = {};
  const allowed = ["title", "description", "parentId", "project", "threadId", "dueDate", ...(create ? ["children", "requestId"] : ["status"])];
  if (Object.keys(input).some(key => !allowed.includes(key))) throw new TodoError("invalid_input", "包含未知任务字段。");
  if ("title" in input || create) {
    const title = text(input.title, "title", 300)!;
    if (!title) throw new TodoError("invalid_input", "任务标题不能为空。");
    result.title = title;
  }
  if ("description" in input) result.description = text(input.description, "description", 12000)!;
  if ("parentId" in input) result.parentId = input.parentId === null ? null : taskId(input.parentId);
  if ("project" in input) result.project = text(input.project, "project", 1024, true) || null;
  if ("threadId" in input) result.threadId = input.threadId === null ? null : taskId(input.threadId);
  if ("dueDate" in input) {
    const date = text(input.dueDate, "dueDate", 10, true);
    if (date !== null && (!/^\d{4}-\d{2}-\d{2}$/u.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new TodoError("invalid_input", "dueDate 使用 YYYY-MM-DD 或 null。");
    result.dueDate = date;
  }
  if ("status" in input) {
    if (!["todo", "doing", "done"].includes(String(input.status))) throw new TodoError("invalid_input", "status 使用 todo、doing 或 done。");
    result.status = input.status as TaskStatus;
  }
  if (!create && !Object.keys(result).length) throw new TodoError("invalid_input", "至少提供一个需要修改的字段。");
  return result;
}
export function progress(task: TaskSummary, tasks: TaskSummary[]): { done: number; total: number } {
  const children = tasks.filter(item => item.parentId === task.id && !item.archivedAt);
  return { done: children.filter(item => item.status === "done").length, total: children.length };
}
