import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { progress } from "../shared/model.js";
import type { CompletionResult, Task, TaskSummary } from "../shared/model.js";
import { DeleteButton, Icon, TaskCheck } from "./task-controls.js";
import { TaskDetail } from "./task-detail.js";
import { buildTaskView, dueLabel, localDate, matchesFilter, taskPath } from "./task-view.js";
import type { TaskFilter } from "./task-view.js";
import { taskPatch } from "./task-editor.js";
import type { TaskEditor } from "./task-editor.js";
import { useTaskStore } from "./use-task-store.js";
import type { Api } from "./use-task-store.js";
export type { Api, Mutate } from "./use-task-store.js";

interface Props {
  api: Api;
  subscribe: (refresh: () => void) => () => void;
  open: boolean;
  onClose: () => void;
  returnFocus?: () => HTMLElement | null;
  selectionRequest?: { id: string | null; sequence: number };
}
interface Notice { message: string; undo: () => Promise<void> }
const filters = [["open", "未完成"], ["all", "全部"], ["done", "已完成"]] as const;

function subtreeOf(task: TaskSummary, tasks: TaskSummary[]): TaskSummary[] {
  const ids = new Set([task.id]), result = [task];
  for (let depth = 0; depth < 16; depth++) for (const item of tasks) if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) { ids.add(item.id); result.push(item); }
  return result;
}

export function TodoPanel({ api, subscribe, open, onClose, returnFocus, selectionRequest }: Props) {
  const store = useTaskStore(api, subscribe);
  const [selected, setSelected] = useState<string | null>(null), [filter, setFilter] = useState<TaskFilter>("open");
  const [query, setQuery] = useState(""), [title, setTitle] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [expanded, setExpanded] = useState(new Set<string>());
  const [edited, setEdited] = useState(new Set<string>()), [notice, setNotice] = useState<Notice | null>(null);
  const [confirmation, setConfirmation] = useState<TaskSummary | null>(null), [today, setToday] = useState(localDate());
  const editors = useRef(new Map<string, TaskEditor>()), requests = useRef(new Map<string, { title: string; id: string }>());
  const panel = useRef<HTMLDivElement>(null), confirmationFocus = useRef<HTMLElement | null>(null);
  const captureInput = useRef<HTMLInputElement>(null), captureTrigger = useRef<HTMLButtonElement>(null);
  const { busy, mutate, setError } = store;
  const snapshot = store.active, allTasks = snapshot.items;
  const view = buildTaskView(allTasks, filter, query);
  const blocked = busy || Boolean(confirmation);
  const counts = { open: allTasks.filter(item => item.status !== "done").length, all: allTasks.length, done: allTasks.filter(item => item.status === "done").length };
  const saveEditor = useCallback((id: string, editor: TaskEditor) => {
    editors.current.set(id, editor);
    const dirty = Object.keys(taskPatch(editor)).length > 0;
    setEdited(before => {
      if (before.has(id) === dirty) return before;
      const next = new Set(before); if (dirty) next.add(id); else next.delete(id); return next;
    });
  }, []);
  useEffect(() => {
    if (!open) return;
    const scope = panel.current?.getRootNode();
    const previous = (scope instanceof ShadowRoot ? scope.activeElement : document.activeElement) as HTMLElement | null;
    panel.current?.querySelector<HTMLInputElement>(".ot-search")?.focus({ preventScroll: true });
    setToday(localDate());
    const timer = setInterval(() => setToday(localDate()), 60_000);
    return () => {
      clearInterval(timer);
      if (previous?.isConnected && previous !== document.body) previous.focus({ preventScroll: true });
      else returnFocus?.()?.focus({ preventScroll: true });
    };
  }, [open, returnFocus]);
  useEffect(() => { if (confirmation) panel.current?.querySelector<HTMLButtonElement>(".ot-confirm .ot-primary")?.focus(); }, [confirmation]);
  useEffect(() => {
    if (!selectionRequest) return;
    setFilter("all"); setQuery(""); setSelected(selectionRequest.id); setError("");
  }, [selectionRequest]);
  const select = (id: string | null) => { setSelected(id); setError(""); };
  const startCapture = () => { setCapturing(true); requestAnimationFrame(() => captureInput.current?.focus()); };
  const hideCapture = () => { setCapturing(false); requestAnimationFrame(() => captureTrigger.current?.focus()); };
  const closeDetail = () => {
    const trigger = panel.current?.querySelector<HTMLButtonElement>('.ot-task-name[aria-current="true"]');
    select(null);
    requestAnimationFrame(() => {
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      else panel.current?.querySelector<HTMLInputElement>(".ot-search")?.focus({ preventScroll: true });
    });
  };
  const close = () => { setConfirmation(null); onClose(); };
  const reveal = (task: TaskSummary, focus = true) => {
    setFilter(filter === "all" ? "all" : task.status === "done" ? "done" : "open");
    setQuery(""); setSelected(task.id); setError("");
    const ancestors = new Set<string>();
    let parent = task.parentId;
    while (parent && !ancestors.has(parent)) { ancestors.add(parent); parent = view.byId.get(parent)?.parentId ?? null; }
    setExpanded(before => new Set([...before, ...ancestors]));
    if (focus) requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>('.ot-task-name[aria-current="true"]')?.focus());
  };
  const branchEdited = (task: TaskSummary) => subtreeOf(task, allTasks).some(item => !item.archivedAt && edited.has(item.id));
  const add = async (value: string, parentId: string | null = null) => {
    if (!value.trim() || blocked) return false;
    const key = parentId ?? "root", previous = requests.current.get(key);
    const request = previous?.title === value ? previous : { title: value, id: crypto.randomUUID() };
    requests.current.set(key, request);
    const result = await mutate<{ tasks: Task[] }>("create", { title: value, parentId, requestId: request.id });
    if (!result) return false;
    requests.current.delete(key);
    if (parentId) {
      const parent = view.byId.get(parentId);
      if (parent) reveal({ ...parent, status: "todo" }, false);
      setExpanded(before => new Set([...before, parentId]));
    }
    else {
      reveal(result.tasks[0], false);
      if (matchMedia("(max-width: 720px)").matches) setSelected(null);
    }
    return true;
  };
  const remove = async (task: TaskSummary) => {
    const subtree = subtreeOf(task, allTasks).filter(item => !item.archivedAt);
    const next = await mutate<Task>("archive", { id: task.id, ifRevision: task.revision });
    if (!next) return;
    setNotice({ message: subtree.length > 1 ? `已删除任务及 ${subtree.length - 1} 个子任务` : "已删除任务", undo: async () => {
      const restored = await mutate<Task>("restore", { id: next.id, ifRevision: next.revision });
      if (restored) { setNotice(null); reveal(restored); }
    } });
    const parent = task.parentId ? view.byId.get(task.parentId) : undefined;
    if (subtree.some(item => item.id === selected)) setSelected(parent && matchesFilter(parent, filter) ? parent.id : null);
    panel.current?.querySelector<HTMLInputElement>(".ot-search")?.focus({ preventScroll: true });
  };
  const finish = async (task: TaskSummary) => {
    setConfirmation(null);
    const result = await mutate<CompletionResult>("complete", { id: task.id, ifRevision: task.revision, ifGeneration: store.active.generation });
    if (!result) return;
    setNotice({ message: result.undo.length > 1 ? `已完成 ${result.undo.length} 项任务` : "已完成任务", undo: async () => {
      const restored = await mutate("undoCompletion", { changes: result.undo });
      if (restored) { setNotice(null); reveal(task); }
    } });
    if (filter === "open" && selected && result.undo.some(item => item.id === selected)) setSelected(null);
    requestAnimationFrame(() => panel.current?.querySelector<HTMLInputElement>(".ot-search")?.focus({ preventScroll: true }));
  };
  const changeStatus = async (task: TaskSummary, status: Task["status"]) => {
    if (branchEdited(task)) { setError("请先保存该任务及子任务的修改。"); return; }
    if (status === "done") {
      const unfinished = subtreeOf(task, store.active.items).filter(item => item.id !== task.id && item.status !== "done");
      if (unfinished.length) {
        const scope = panel.current?.getRootNode();
        confirmationFocus.current = (scope instanceof ShadowRoot ? scope.activeElement : document.activeElement) as HTMLElement | null;
        setConfirmation(task);
      } else await finish(task);
      return;
    }
    const next = await mutate<Task>("update", { id: task.id, ifRevision: task.revision, patch: { status } });
    if (!next) return;
    setNotice({ message: status === "doing" ? "已开始任务" : "已重新打开任务", undo: async () => {
      const restored = await mutate<Task>("update", { id: next.id, ifRevision: next.revision, patch: { status: task.status } });
      if (restored) { setNotice(null); reveal(restored); }
    } });
    if (filter === "done") setSelected(null);
  };
  const changeFilter = (next: TaskFilter) => { setFilter(next); setSelected(null); setError(""); };
  const cancelCompletion = () => { setConfirmation(null); requestAnimationFrame(() => {
    if (confirmationFocus.current?.isConnected) confirmationFocus.current.focus();
    else panel.current?.querySelector<HTMLInputElement>(".ot-search")?.focus();
  }); };
  const row = (task: TaskSummary) => {
    const children = view.children.get(task.id) ?? [], count = progress(task, store.active.items);
    const isExpanded = expanded.has(task.id), path = view.flat ? taskPath(task, view.byId) : "";
    const locked = blocked || branchEdited(task);
    return <li key={task.id} class="ot-branch">
      <div class={`ot-row ${selected === task.id ? "is-selected" : ""} ${task.status === "done" ? "is-done" : ""}`}>
        {!view.flat && children.length ? <button class={`ot-expand ${isExpanded ? "is-expanded" : ""}`} aria-label={`${isExpanded ? "折叠" : "展开"} ${task.title}`} aria-expanded={isExpanded} disabled={blocked}
          onClick={() => setExpanded(before => { const next = new Set(before); if (isExpanded) next.delete(task.id); else next.add(task.id); return next; })}><Icon name="chevron" /></button> : <span class="ot-expand-space" aria-hidden="true" />}
        <TaskCheck task={task} disabled={locked} onToggle={() => { void changeStatus(task, task.status === "done" ? "todo" : "done"); }} />
        <button class="ot-task-name" disabled={Boolean(confirmation)} onClick={() => select(task.id)} aria-current={selected === task.id ? "true" : undefined}><span>{task.title}{edited.has(task.id) && <span class="ot-draft-dot" aria-label="未保存修改"> ·</span>}</span>{path && <small class="ot-task-path" title={path}>{path}</small>}</button>
        <span class="ot-row-meta">{task.dueDate && <time dateTime={task.dueDate} title={`截止 ${task.dueDate}`} class={task.status !== "done" && task.dueDate < today ? "is-overdue" : ""}>{dueLabel(task.dueDate, today)}</time>}{!view.flat && count.total > 0 && <span aria-label={`已完成 ${count.done} / ${count.total} 个子任务`} title={`已完成 ${count.done} / ${count.total} 个子任务`}>{count.done}/{count.total}</span>}</span>
        <DeleteButton task={task} disabled={locked} onDelete={() => { void remove(task); }} />
      </div>
      {!view.flat && children.length > 0 && isExpanded && <ul class="ot-children">{children.map(row)}</ul>}
    </li>;
  };
  const current = selected ? view.byId.get(selected) : undefined;
  const error = store.error || snapshot.error;
  return <div class="ot-overlay" hidden={!open} onPointerDown={event => { if (event.target === event.currentTarget) close(); }}>
    <div class={`ot-panel ${current ? "has-detail" : ""}`} ref={panel} hidden={!open} role="dialog" aria-modal="true" aria-label="待办任务" tabIndex={-1} onKeyDown={event => {
      if (event.key === "Escape" && !event.isComposing) { event.preventDefault(); event.stopPropagation(); if (confirmation) cancelCompletion(); else close(); }
      if (event.key === "Tab") {
        const scope = panel.current?.querySelector(".ot-confirm") ?? panel.current;
        const controls = [...(scope?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary, a[href]') ?? [])].filter(item => item.tabIndex >= 0 && item.getClientRects().length > 0 && (item.tagName === "SUMMARY" || !item.closest("details:not([open])")));
        const first = controls[0], last = controls[controls.length - 1];
        const active = panel.current?.getRootNode() instanceof ShadowRoot ? (panel.current.getRootNode() as ShadowRoot).activeElement : document.activeElement;
        if (event.shiftKey && (active === first || active === panel.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (active === last || active === panel.current)) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <header class="ot-header"><h2>待办任务</h2><div class="ot-header-actions"><button aria-label="刷新任务" title="刷新" disabled={snapshot.loading || blocked} onClick={() => { void store.refresh(); }}><Icon name="refresh" /></button><button aria-label="关闭待办" title="关闭" onClick={close}><Icon name="close" /></button></div></header>
      {error && <div role="alert" class="ot-error">{error}</div>}
      {confirmation && <div class="ot-confirm" role="alertdialog" aria-modal="true" aria-label="完成父任务"><div><strong>完成「{confirmation.title}」？</strong><p>将同时完成 {subtreeOf(confirmation, store.active.items).filter(item => item.id !== confirmation.id && item.status !== "done").length} 个未完成子任务。</p></div><button onClick={cancelCompletion}>取消</button><button class="ot-primary" onClick={() => { void finish(confirmation); }}>一并完成</button></div>}
      <div class="ot-workspace"><section class="ot-list" aria-label="任务树">
        <div class="ot-list-tools"><div class="ot-list-toolbar"><div class="ot-search-field"><Icon name="search" /><input class="ot-search" aria-label="搜索任务" placeholder="搜索任务或项目" disabled={Boolean(confirmation)} value={query} onInput={event => setQuery(event.currentTarget.value)} />{query && <button type="button" aria-label="清除搜索" disabled={Boolean(confirmation)} onClick={() => { setQuery(""); panel.current?.querySelector<HTMLInputElement>(".ot-search")?.focus(); }}><Icon name="close" /></button>}</div>
          <button class="ot-new-task" ref={captureTrigger} disabled={blocked} aria-expanded={capturing} aria-controls="ot-task-capture" onClick={startCapture}><Icon name="plus" /><span>新建任务</span></button></div>
          <div class="ot-filters" role="tablist" aria-label="任务筛选" onKeyDown={event => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const index = filters.findIndex(([value]) => value === filter);
            const next = event.key === "Home" ? 0 : event.key === "End" ? filters.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + filters.length) % filters.length;
            changeFilter(filters[next][0]); panel.current?.querySelector<HTMLButtonElement>(`#ot-filter-${filters[next][0]}`)?.focus();
          }}>
            {filters.map(([value, label]) => <button key={value} id={`ot-filter-${value}`} role="tab" aria-selected={filter === value} aria-controls="ot-task-results" tabIndex={filter === value ? 0 : -1} disabled={blocked} class={filter === value ? "is-active" : ""} onClick={() => changeFilter(value)}>{label}<span class="ot-filter-count">{counts[value]}</span></button>)}
          </div>
          {capturing && <form class="ot-quick-add" id="ot-task-capture" onKeyDown={event => {
            if (event.isComposing) { if (event.key === "Enter") event.preventDefault(); return; }
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); hideCapture(); }
          }} onSubmit={event => { event.preventDefault(); void add(title).then(saved => { if (saved) { setTitle(""); captureInput.current?.focus(); } }); }}>
            <div class="ot-capture-field"><input ref={captureInput} aria-label="新任务标题" aria-describedby="ot-capture-hint" placeholder="任务名称" value={title} maxLength={300} readOnly={busy} disabled={Boolean(confirmation)} onInput={event => setTitle(event.currentTarget.value)} /><button class="ot-primary ot-create-submit" disabled={blocked || !title.trim()}>创建</button><button type="button" class="ot-capture-cancel" aria-label="收起新建任务" title="收起 · Esc" disabled={busy} onClick={hideCapture}><Icon name="close" /></button></div>
            <p id="ot-capture-hint" class="ot-capture-hint">Enter 创建 · Esc 收起</p>
          </form>}
        </div>
        <div class="ot-tree-scroll" id="ot-task-results" role="tabpanel" aria-labelledby={`ot-filter-${filter}`} aria-busy={snapshot.loading}>{view.matches.length ? <ul class="ot-tree">{view.roots.map(row)}</ul> : <div class="ot-empty">{snapshot.loading ? "正在读取…" : query.trim() ? "没有符合条件的任务" : filter === "done" ? "暂无已完成任务" : filter === "open" ? "没有未完成任务" : "暂无任务"}</div>}</div>
      </section>{current && <section class="ot-detail" aria-label="任务详情"><TaskDetail key={current.id} task={current} tasks={allTasks} api={api} busy={blocked} mutate={mutate} add={add} select={select} editor={editors.current.get(current.id)} saveEditor={saveEditor} remove={remove} changeStatus={changeStatus} reveal={reveal} branchEdited={branchEdited} close={closeDetail} /></section>}</div>
      {notice && <div class="ot-toast"><span role="status">{notice.message}</span><button disabled={blocked} onClick={() => { void notice.undo(); }}>撤销</button><button class="ot-toast-close" aria-label="关闭提示" onClick={() => setNotice(null)}><Icon name="close" /></button></div>}
    </div>
  </div>;
}
