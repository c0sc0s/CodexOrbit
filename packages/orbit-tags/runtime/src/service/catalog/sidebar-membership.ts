import { readFile } from "node:fs/promises";
import { join } from "node:path";

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const ids = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.some((id) => typeof id !== "string")) throw new Error("Unsupported sidebar membership");
  return value.map((id) => id.replace(/^local:/u, ""));
};

export async function readSidebarMembership(root: string) {
  const state = JSON.parse(await readFile(join(root, ".codex-global-state.json"), "utf8"));
  if (!record(state) || !record(state["local-projects"]) || !record(state["thread-project-assignments"])
    || !record(state["sidebar-project-thread-orders"])) throw new Error("Sidebar membership unavailable");
  const projects = new Set(Object.keys(state["local-projects"]));
  const pinned = new Set(ids(state["pinned-thread-ids"]));
  const projectless = new Set(ids(state["projectless-thread-ids"]));
  const assignments = new Map<string, string>();
  for (const [project, order] of Object.entries(state["sidebar-project-thread-orders"])) {
    if (!projects.has(project)) continue;
    for (const id of ids(record(order) ? order.threadIds : undefined)) assignments.set(id, project);
  }
  // Explicit assignments override old positions after a task moves between projects.
  for (const [id, assignment] of Object.entries(state["thread-project-assignments"])) {
    if (record(assignment) && assignment.projectKind === "local" && typeof assignment.projectId === "string" && projects.has(assignment.projectId)) {
      assignments.set(id.replace(/^local:/u, ""), assignment.projectId);
    } else assignments.delete(id.replace(/^local:/u, ""));
  }
  return {
    forThread(row: { threadId: string; projectId: string | null; pinned: number | null }) {
      const projectId = assignments.get(row.threadId) ?? (row.projectId !== null && projects.has(row.projectId) ? row.projectId : null);
      const isPinned = pinned.has(row.threadId) || row.pinned === 1;
      if (!isPinned && !projectId && !projectless.has(row.threadId)) return null;
      return { projectId: projectless.has(row.threadId) ? null : projectId, pinned: isPinned };
    },
  };
}
