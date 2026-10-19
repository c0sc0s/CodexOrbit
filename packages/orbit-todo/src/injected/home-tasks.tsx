import { useEffect, useRef, useState } from "preact/hooks";
import { createPortal } from "preact/compat";
import type { HomeSectionMountContext } from "@c0sc0s/orbit/ui";
import type { CompletionResult, TaskSummary } from "../shared/model.js";
import { buildTaskView, dueLabel, localDate } from "./task-view.js";
import { useTaskStore } from "./use-task-store.js";
import type { Api } from "./use-task-store.js";
import { Icon, TaskCheck } from "./task-controls.js";

interface Props { api: Api; subscribe: (refresh: () => void) => () => void; openTask: (id: string | null) => void; header?: HomeSectionMountContext }

export function HomeTasks({ api, subscribe, openTask, header }: Props) {
  const store = useTaskStore(api, subscribe), snapshot = store.active;
  const [expandedIds, setExpandedIds] = useState(new Set<string>()), [today, setToday] = useState(localDate());
  const [completed, setCompleted] = useState<CompletionResult | null>(null), [confirmation, setConfirmation] = useState<TaskSummary | null>(null);
  const root = useRef<HTMLDivElement>(null), confirmFocus = useRef<HTMLElement | null>(null), undoFocus = useRef<HTMLButtonElement>(null);
  const view = buildTaskView(snapshot.items, "open", "");
  const error = store.error || snapshot.error;
  const subtree = (task: TaskSummary): TaskSummary[] => [task, ...(view.children.get(task.id) ?? []).flatMap(subtree)];
  const group = (task: TaskSummary) => {
    const items = subtree(task);
    if (items.some(item => item.status === "doing")) return "doing";
    if (items.some(item => item.dueDate && item.dueDate < today)) return "overdue";
    return "pending";
  };
  const groups = ([["doing", "进行中"], ["overdue", "已逾期"], ["pending", "待办"]] as const)
    .map(([value, label]) => ({ value, label, items: view.roots.filter(task => group(task) === value) })).filter(group => group.items.length);
  useEffect(() => {
    if (!header) return;
    header.summary.textContent = snapshot.loading && !snapshot.items.length ? "" : String(view.matches.length);
    header.summary.setAttribute("aria-label", `共 ${view.matches.length} 项未完成`);
    header.setCompact(!snapshot.loading && !error && view.matches.length === 0);
  });
  useEffect(() => { const timer = setInterval(() => setToday(localDate()), 60_000); return () => clearInterval(timer); }, []);
  useEffect(() => { if (confirmation) root.current?.querySelector<HTMLButtonElement>(".oth-confirm .ot-primary")?.focus(); }, [confirmation]);
  const finish = async (task: TaskSummary) => {
    const result = await store.mutate<CompletionResult>("complete", { id: task.id, ifRevision: task.revision, ifGeneration: snapshot.generation });
    if (!result) return;
    setConfirmation(null); setCompleted(result);
    requestAnimationFrame(() => undoFocus.current?.focus({ preventScroll: true }));
  };
  const complete = (task: TaskSummary) => {
    if (subtree(task).length > 1) {
      const scope = root.current?.getRootNode();
      confirmFocus.current = (scope instanceof ShadowRoot ? scope.activeElement : document.activeElement) as HTMLElement | null;
      setConfirmation(task);
    } else void finish(task);
  };
  const cancel = () => { setConfirmation(null); requestAnimationFrame(() => confirmFocus.current?.focus()); };
  const row = (task: TaskSummary) => {
    const children = view.children.get(task.id) ?? [], expanded = expandedIds.has(task.id), blocked = store.busy || Boolean(confirmation);
    return <li key={task.id}>
      <div class="oth-task-row">
        {children.length ? <button class={`ot-expand ${expanded ? "is-expanded" : ""}`} aria-label={`${expanded ? "折叠" : "展开"} ${task.title}`} aria-expanded={expanded} disabled={blocked}
          onClick={() => setExpandedIds(before => { const next = new Set(before); if (next.has(task.id)) next.delete(task.id); else next.add(task.id); return next; })}><Icon name="chevron" /></button> : <span class="ot-expand-space" aria-hidden="true" />}
        <TaskCheck task={task} disabled={blocked} onToggle={() => complete(task)} />
        <button class="oth-task-title" title={task.title} disabled={Boolean(confirmation)} onClick={() => openTask(task.id)}>{task.title}</button>
        {task.project && <span class="oth-project" title={task.project}>{task.project}</span>}
        {task.dueDate && <time class={task.dueDate < today ? "is-overdue" : ""} dateTime={task.dueDate} title={`截止 ${task.dueDate}`}>{dueLabel(task.dueDate, today)}</time>}
      </div>
      {children.length > 0 && expanded && <ul class="oth-children">{children.map(row)}</ul>}
    </li>;
  };
  const allTasks = <button disabled={Boolean(confirmation)} onClick={() => openTask(null)}>全部任务</button>;
  return <div class="oth-home" ref={root}>
    {header ? createPortal(allTasks, header.actions) : <header class="oth-header"><span>{!snapshot.loading && view.matches.length ? `${view.matches.length} 项未完成` : ""}</span>{allTasks}</header>}
    {error && <div class="oth-error" role="alert"><span>{error}</span><button onClick={() => { void store.refresh(); }}>重试</button></div>}
    {confirmation && <div class="oth-confirm" role="alertdialog" aria-modal="true" aria-label="完成父任务" onKeyDown={event => {
      if (event.key === "Escape" && !event.isComposing) { event.preventDefault(); cancel(); }
      if (event.key === "Tab") {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
        const scope = event.currentTarget.getRootNode(), active = scope instanceof ShadowRoot ? scope.activeElement : document.activeElement;
        if (event.shiftKey && active === buttons[0]) { event.preventDefault(); buttons.at(-1)?.focus(); }
        else if (!event.shiftKey && active === buttons.at(-1)) { event.preventDefault(); buttons[0]?.focus(); }
      }
    }}><p>同时完成「{confirmation.title}」及 {subtree(confirmation).length - 1} 个子任务？</p><div><button disabled={store.busy} onClick={cancel}>取消</button><button class="ot-primary" disabled={store.busy} onClick={() => { void finish(confirmation); }}>一并完成</button></div></div>}
    {snapshot.loading && !snapshot.items.length ? <div class="oth-empty" role="status">正在读取待办…</div> : !error && !view.matches.length ? <div class="oth-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></svg><h3>都完成了</h3></div> :
      <div class="oth-task-scroll" role="region" aria-label="待办列表" tabIndex={0}>{groups.map(({ value, label, items }) =>
        <section class={`oth-group ${value === "overdue" ? "is-overdue" : ""}`} key={value} aria-label={label}>
          {groups.length > 1 && <h3>{label}<span>{items.length}</span></h3>}<ul>{items.map(task => <li key={task.id} class="oth-task-group"><ul>{row(task)}</ul></li>)}</ul>
        </section>
      )}</div>}
    {completed && <div class="oth-toast"><span role="status">{completed.undo.length > 1 ? `已完成 ${completed.undo.length} 项任务` : "已完成任务"}</span><button ref={undoFocus} disabled={store.busy || Boolean(confirmation)} onClick={() => {
      void store.mutate("undoCompletion", { changes: completed.undo }).then(result => { if (result) { setCompleted(null); (header?.actions ?? root.current)?.querySelector<HTMLButtonElement>("button")?.focus(); } });
    }}>撤销</button><button class="oth-toast-close" aria-label="关闭提示" onClick={() => setCompleted(null)}><Icon name="close" /></button></div>}
  </div>;
}
