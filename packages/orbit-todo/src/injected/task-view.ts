import type { TaskSummary } from "../shared/model.js";

export type TaskFilter = "open" | "all" | "done";
export function matchesFilter(task: TaskSummary, filter: TaskFilter): boolean {
  return !task.archivedAt && (filter === "all" || (filter === "open" ? task.status !== "done" : task.status === "done"));
}

export function taskPath(task: TaskSummary, byId: Map<string, TaskSummary>): string {
  const titles: string[] = [], seen = new Set([task.id]);
  let parentId = task.parentId;
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = byId.get(parentId);
    if (!parent) break;
    titles.unshift(parent.title); parentId = parent.parentId;
  }
  return titles.join(" / ");
}

export function buildTaskView(tasks: TaskSummary[], filter: TaskFilter, query: string) {
  const byId = new Map(tasks.map(task => [task.id, task]));
  const needle = query.trim().toLocaleLowerCase();
  const matches = tasks.filter(task => matchesFilter(task, filter) && (!needle || `${task.title}\n${task.project ?? ""}`.toLocaleLowerCase().includes(needle)));
  const flat = filter === "done" || Boolean(needle);
  const children = new Map<string, TaskSummary[]>();
  const ids = new Set(matches.map(task => task.id));
  for (const task of matches) if (task.parentId && ids.has(task.parentId)) {
    const siblings = children.get(task.parentId) ?? [];
    siblings.push(task); children.set(task.parentId, siblings);
  }
  const roots = flat ? [...matches].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : matches.filter(task => !task.parentId || !ids.has(task.parentId));
  return { matches, roots, flat, children, byId };
}

export function dueLabel(date: string, today: string): string {
  if (date === today) return "今天";
  return date.slice(0, 4) === today.slice(0, 4) ? date.slice(5).replace("-", "/") : date.replaceAll("-", "/");
}

export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
