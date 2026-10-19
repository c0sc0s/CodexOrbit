import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import type { Task, TaskPatch, TaskSummary } from "../shared/model.js";
import type { Api, Mutate } from "./use-task-store.js";
import { DescriptionText, splitDescription } from "./description.js";
import { DeleteButton, Icon, TaskCheck } from "./task-controls.js";
import { createEditor, reconcileEditor, taskPatch } from "./task-editor.js";
import type { TaskEditor } from "./task-editor.js";
import { Select } from "./select.js";

interface Props {
  task: TaskSummary;
  tasks: TaskSummary[];
  api: Api;
  busy: boolean;
  mutate: Mutate;
  add: (title: string, parentId: string) => Promise<boolean>;
  select: (id: string) => void;
  editor: TaskEditor | undefined;
  saveEditor: (id: string, editor: TaskEditor) => void;
  remove: (task: TaskSummary) => Promise<void>;
  changeStatus: (task: TaskSummary, status: Task["status"]) => Promise<void>;
  reveal: (task: TaskSummary) => void;
  branchEdited: (task: TaskSummary) => boolean;
  close: () => void;
}
const statusLabels = { todo: "待办", doing: "进行中", done: "已完成" };

export function TaskDetail({ task, tasks, api, busy, mutate, add, select, editor: cached, saveEditor, remove, changeStatus, reveal, branchEdited, close }: Props) {
  const [editor, setEditor] = useState(cached), [error, setError] = useState("");
  const current = useRef(cached), titleInput = useRef<HTMLTextAreaElement>(null), descriptionInput = useRef<HTMLTextAreaElement>(null);
  const accept = (next: TaskEditor) => { current.current = next; setEditor(next); saveEditor(task.id, next); };
  useEffect(() => {
    let active = true;
    void api<Task>("get", { id: task.id }).then(next => {
      if (active) { accept(reconcileEditor(current.current, next)); setError(""); }
    }).catch(failure => { if (active) setError((failure as Error).message); });
    return () => { active = false; };
  }, [api, task.id, task.revision]);
  useLayoutEffect(() => {
    for (const input of [titleInput.current, descriptionInput.current]) {
      if (input) { input.style.height = "auto"; input.style.height = `${input.scrollHeight}px`; }
    }
  }, [editor?.draft.title, editor?.draft.description, editor?.descriptionOpen]);
  useEffect(() => { if (editor?.descriptionOpen) descriptionInput.current?.focus(); }, [editor?.descriptionOpen]);
  useEffect(() => { if (editor && matchMedia("(max-width: 720px)").matches) titleInput.current?.focus({ preventScroll: true }); }, [Boolean(editor)]);
  if (!editor) return <div class="ot-empty">{error || "正在读取…"}</div>;
  const { draft, base } = editor;
  const dirty = Object.keys(taskPatch(editor)).length > 0;
  const edit = (patch: TaskPatch) => accept({ ...editor, draft: { ...draft, ...patch } });
  const description = splitDescription(draft.description);
  const readonly = Boolean(task.archivedAt || base.archivedAt), parent = tasks.find(item => item.id === task.parentId);
  const children = tasks.filter(item => item.parentId === task.id && Boolean(item.archivedAt) === readonly);
  const forbidden = new Set([task.id]);
  for (let depth = 0; depth < 16; depth++) for (const item of tasks) if (item.parentId && forbidden.has(item.parentId)) forbidden.add(item.id);
  const focusTitle = () => requestAnimationFrame(() => titleInput.current?.focus());
  const useLatest = () => {
    if (editor.incoming) accept({ ...createEditor(editor.incoming), childTitle: editor.childTitle });
    else accept({ ...createEditor(base), childTitle: editor.childTitle });
    focusTitle();
  };
  return <div class="ot-detail-content">
    {error && <div class="ot-error" role="alert">{error}</div>}
    {editor.conflicts.length > 0 && <div class="ot-conflict" role="alert">同一内容已在其他窗口更新，草稿仍保留。<div><button onClick={useLatest}>使用最新内容</button><button onClick={() => {
      if (editor.incoming) accept({ ...editor, base: editor.incoming, draft: { ...editor.incoming, ...taskPatch(editor) }, incoming: null, conflicts: [] });
    }}>保留我的修改</button></div></div>}
    <div class="ot-detail-toolbar">
      {readonly ? <span class="ot-deleted-label">已删除</span> : <Select label="任务状态" className="ot-status-select" value={draft.status} disabled={busy || branchEdited(task)} title={branchEdited(task) ? "保存编辑后可切换状态" : "任务状态"} choices={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} onChange={value => { void changeStatus(task, value as Task["status"]); }} />}
      <div class="ot-detail-actions">{!readonly && <DeleteButton task={task} disabled={busy || branchEdited(task)} onDelete={() => { void remove(task); }}>删除</DeleteButton>}<button class="ot-detail-close" aria-label="返回任务列表" title="返回任务列表" onClick={close}><Icon name="close" /></button></div>
    </div>
    {parent && <button class="ot-parent-link" disabled={busy} onClick={() => reveal(parent)}>← {parent.title}</button>}
    <form class="ot-edit-form" onKeyDown={event => { if (event.key === "Enter" && event.isComposing) event.preventDefault(); }} onSubmit={event => {
      event.preventDefault();
      if (readonly || busy || editor.conflicts.length) return;
      const patch = taskPatch(editor);
      if (!Object.keys(patch).length) { accept({ ...editor, descriptionOpen: false }); focusTitle(); return; }
      void mutate<Task>("update", { id: task.id, ifRevision: base.revision, patch }).then(next => {
        if (next) { accept({ ...createEditor(next), childTitle: current.current?.childTitle ?? "" }); if (next.parentId !== base.parentId) reveal(next); focusTitle(); }
      });
    }}>
      <textarea class="ot-title-input" ref={titleInput} aria-label="任务标题" rows={1} maxLength={300} value={draft.title} readOnly={readonly || busy} onInput={event => edit({ title: event.currentTarget.value })} />
      <div class="ot-description">
        {editor.descriptionOpen ? <textarea ref={descriptionInput} aria-label="任务描述" placeholder="添加描述…" rows={3} maxLength={12000 - description.suffix.length} value={description.body} readOnly={readonly || busy} onInput={event => edit({ description: `${event.currentTarget.value}${description.suffix}` })} /> : <>
          {description.body ? <><DescriptionText value={description.body} />{!readonly && <button class="ot-edit-description" type="button" aria-label="编辑描述" title="编辑描述" onClick={() => accept({ ...editor, descriptionOpen: true })}><Icon name="edit" /></button>}</> : !readonly && <button class="ot-add-description" type="button" onClick={() => accept({ ...editor, descriptionOpen: true })}>添加描述…</button>}
        </>}
      </div>
      <div class="ot-links">{description.source && <a href={description.source} target="_blank" rel="noopener noreferrer">在飞书打开 ↗</a>}{task.threadId && <button type="button" disabled={busy} onClick={() => { void mutate("open", { id: task.id }); }}>打开会话 ↗</button>}</div>
      <details class="ot-metadata"><summary><Icon name="chevron" /><span>属性</span><span class="ot-metadata-preview">{[draft.project, draft.dueDate].filter(Boolean).join(" · ")}</span></summary>
        <fieldset class="ot-fields" disabled={readonly || busy}>
          <label>截止日期<input type="date" aria-label="截止日期" value={draft.dueDate ?? ""} onInput={event => edit({ dueDate: event.currentTarget.value || null })} /></label>
          <label>项目<input aria-label="所属项目" maxLength={1024} value={draft.project ?? ""} onInput={event => edit({ project: event.currentTarget.value || null })} /></label>
          <label class="ot-field-wide">父任务<Select label="父任务" value={draft.parentId ?? ""} disabled={readonly || busy} choices={[{ value: "", label: "无" }, ...tasks.filter(item => !forbidden.has(item.id) && (!item.archivedAt || item.id === draft.parentId)).map(item => ({ value: item.id, label: item.title }))]} onChange={value => edit({ parentId: value || null })} /></label>
        </fieldset>
      </details>
      {!readonly && (dirty || editor.descriptionOpen) && <div class="ot-save-bar"><button type="button" disabled={busy} onClick={useLatest}>取消</button><button class="ot-primary" disabled={busy || !draft.title.trim() || editor.conflicts.length > 0}>保存</button></div>}
    </form>
    <div class="ot-subtasks"><div class="ot-subtask-heading"><span>子任务</span>{children.length > 0 && <span>{children.filter(item => item.status === "done").length}/{children.length}</span>}</div>
      {children.map(item => <div key={item.id} class={`ot-detail-child ${item.status === "done" ? "is-done" : ""}`}>
        <TaskCheck task={item} disabled={busy || branchEdited(item) || readonly} onToggle={() => { void changeStatus(item, item.status === "done" ? "todo" : "done"); }} />
        <button class="ot-child-title" disabled={busy} onClick={() => select(item.id)}>{item.title}</button>
        {!readonly && <DeleteButton task={item} disabled={busy || branchEdited(item)} onDelete={() => { void remove(item); }} />}
      </div>)}
      {!readonly && <form class="ot-add-child" onKeyDown={event => { if (event.key === "Enter" && event.isComposing) event.preventDefault(); }} onSubmit={event => { event.preventDefault(); void add(editor.childTitle, task.id).then(created => { if (created && current.current) accept({ ...current.current, childTitle: "" }); }); }}>
        <Icon name="plus" /><input aria-label="新子任务标题" placeholder="添加子任务…" value={editor.childTitle} maxLength={300} readOnly={busy} onInput={event => accept({ ...editor, childTitle: event.currentTarget.value })} /><button disabled={busy || !editor.childTitle.trim()}>添加</button>
      </form>}
    </div>
  </div>;
}
