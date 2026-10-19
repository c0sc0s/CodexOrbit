import type { ComponentChildren } from "preact";
import type { TaskSummary } from "../shared/model.js";

const paths = {
  chevron: "m9 5 7 7-7 7",
  close: "m6 6 12 12M6 18 18 6",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7",
  refresh: "M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-1L20 9M4 15l2.3 3A7 7 0 0 0 18 17",
  edit: "m15 4 5 5-11 11H4v-5L15 4ZM12 7l5 5",
  search: "m21 21-4.5-4.5M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
} as const;

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function TaskCheck({ task, disabled, onToggle }: { task: TaskSummary; disabled: boolean; onToggle: () => void }) {
  return <button class={`ot-check ${task.status === "doing" ? "is-doing" : ""}`} disabled={disabled}
    aria-label={`${task.status === "done" ? "重新打开" : "完成"} ${task.title}`} aria-pressed={task.status === "done"} onClick={onToggle}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      {task.status === "done" && <path d="m8 12 3 3 5-6" stroke-linecap="round" stroke-linejoin="round" />}
      {task.status === "doing" && <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />}
    </svg>
  </button>;
}

export function DeleteButton({ task, disabled, onDelete, children }: { task: TaskSummary; disabled: boolean; onDelete: () => void; children?: ComponentChildren }) {
  return <button class={children ? "ot-delete" : "ot-row-delete"} aria-label={`删除 ${task.title}`} title="删除任务及其子任务" disabled={disabled} onClick={onDelete}>
    <Icon name="trash" />{children}
  </button>;
}
