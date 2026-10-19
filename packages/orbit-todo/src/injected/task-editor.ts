import type { Task, TaskPatch } from "../shared/model.js";

const editableFields = ["title", "description", "status", "parentId", "project", "dueDate"] as const;
export interface TaskEditor {
  base: Task;
  draft: Task;
  conflicts: string[];
  incoming: Task | null;
  descriptionOpen: boolean;
  childTitle: string;
}
export function taskPatch(editor: TaskEditor): TaskPatch {
  return Object.fromEntries(editableFields.filter(field => editor.draft[field] !== editor.base[field]).map(field => [field, editor.draft[field]]));
}
export function createEditor(task: Task): TaskEditor {
  return { base: task, draft: task, conflicts: [], incoming: null, descriptionOpen: false, childTitle: "" };
}
export function reconcileEditor(editor: TaskEditor | undefined, latest: Task): TaskEditor {
  if (!editor) return createEditor(latest);
  if (latest.revision < editor.base.revision) return editor;
  const patch = taskPatch(editor);
  const conflicts = editableFields.filter(field => field in patch && latest[field] !== editor.base[field] && latest[field] !== editor.draft[field]);
  if (conflicts.length) return { ...editor, conflicts, incoming: latest };
  return { ...editor, base: latest, draft: { ...latest, ...patch }, conflicts: [], incoming: null };
}
