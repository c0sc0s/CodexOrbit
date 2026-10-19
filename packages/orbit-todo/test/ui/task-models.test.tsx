import { expect, it } from "vitest";
import { buildTaskView, dueLabel } from "../../src/injected/task-view";
import { createEditor, reconcileEditor, taskPatch } from "../../src/injected/task-editor";
import type { Task } from "../../src/shared/model";

const task = (id: string, status: Task["status"], parentId: string | null = null): Task => ({
  id, title:id, status, parentId, description:"原描述", project:null, threadId:null, dueDate:null,
  position:0,revision:1,createdAt:"2026-10-19T00:00:00Z",updatedAt:"2026-10-19T00:00:00Z",archivedAt:null,
});
const tasks = [task("父任务", "todo"), task("已完成子任务", "done", "父任务"), task("进行中子任务", "doing", "父任务"), task("已完成父任务", "done"), task("已完成孙任务", "done", "已完成父任务"), { ...task("已删除任务", "done"), archivedAt:"2026-10-19T01:00:00Z" }];

it("partitions the active task tree exactly between unfinished and completed views", () => {
  const all = buildTaskView(tasks,"all","").matches.map(item => item.id);
  const open = buildTaskView(tasks,"open","").matches.map(item => item.id);
  const done = buildTaskView(tasks,"done","").matches.map(item => item.id);
  expect(new Set([...open,...done])).toEqual(new Set(all));
  expect(open.some(id => done.includes(id))).toBe(false);
  expect(done).toEqual(["已完成子任务","已完成父任务","已完成孙任务"]);
  expect(buildTaskView(tasks,"done","").roots.every(item => item.status === "done")).toBe(true);
  expect(all).not.toContain("已删除任务");
});

it("intersects search with status and never includes nonmatching ancestors or siblings", () => {
  expect(buildTaskView(tasks,"done","子任务").matches.map(item => item.id)).toEqual(["已完成子任务"]);
  expect(buildTaskView(tasks,"open","已完成").matches).toHaveLength(0);
  expect(buildTaskView(tasks,"all","子任务").roots.map(item => item.id)).toEqual(["已完成子任务","进行中子任务"]);
});

it("retains local changes while incorporating unrelated agent updates", () => {
  const base = task("任务","todo"), editor = { ...createEditor(base), draft:{...base,description:"本地描述"}, childTitle:"下一步" };
  const merged = reconcileEditor(editor,{...base,revision:2,status:"doing",project:"Agent 项目"});
  expect(merged.conflicts).toEqual([]);
  expect(merged.base.revision).toBe(2);
  expect(merged.draft.status).toBe("doing");
  expect(merged.draft.project).toBe("Agent 项目");
  expect(merged.childTitle).toBe("下一步");
  expect(taskPatch(merged)).toEqual({description:"本地描述"});
});

it("keeps conflicting drafts intact and safely rebases them after deletion and restoration", () => {
  const base = task("任务","todo"), editor = { ...createEditor(base), draft:{...base,title:"本地标题"} };
  const conflict = reconcileEditor(editor,{...base,revision:2,title:"远端标题"});
  expect(conflict.conflicts).toEqual(["title"]);
  expect(conflict.draft.title).toBe("本地标题");
  expect(conflict.base.revision).toBe(1);
  expect(conflict.incoming!.revision).toBe(2);
  const deleted = reconcileEditor(editor,{...base,revision:2,archivedAt:"2026-10-19T01:00:00Z"});
  const restored = reconcileEditor(deleted,{...base,revision:3});
  expect(restored.conflicts).toEqual([]);
  expect(restored.draft.title).toBe("本地标题");
  expect(restored.draft.archivedAt).toBeNull();
  expect(restored.base.revision).toBe(3);
});

it("formats due dates using local calendar dates across years", () => {
  expect(dueLabel("2026-10-19","2026-10-19")).toBe("今天");
  expect(dueLabel("2026-10-20","2026-10-19")).toBe("10/20");
  expect(dueLabel("2027-01-01","2026-12-31")).toBe("2027/01/01");
});
