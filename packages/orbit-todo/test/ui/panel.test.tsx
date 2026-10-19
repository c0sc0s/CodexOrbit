// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { useCallback, useRef, useState } from "preact/hooks";
import { TodoPanel } from "../../src/injected/panel";
import type { Task } from "../../src/shared/model";
import type { Api } from "../../src/injected/panel";
import { activate } from "../../src/injected/entry";

afterEach(() => { render(null, document.body); document.body.replaceChildren(); });
const task = (id: string, title: string, parentId: string | null = null): Task => ({
  id, title, parentId, status: "todo", description: "背景", project: null, threadId: null, dueDate: null,
  position: 0, revision: 1, createdAt: "2026-10-19T00:00:00Z", updatedAt: "2026-10-19T00:00:00Z", archivedAt: null,
});
function Fixture({ api, subscribe }: { api: Api; subscribe: (refresh: () => void) => () => void }) {
  const [open, setOpen] = useState(false), launcher = useRef<HTMLButtonElement>(null);
  const returnFocus = useCallback(() => launcher.current, []);
  return <><button ref={launcher} aria-label="打开待办任务" onClick={() => setOpen(true)}>Todo</button>
    <TodoPanel api={api} subscribe={subscribe} open={open} onClose={() => setOpen(false)} returnFocus={returnFocus} /></>;
}
async function setup(description = "背景", initial?: Task[]) {
  const items = initial ?? [task("root", "父任务"), task("child", "子任务", "root"), task("leaf", "孙任务", "child")];
  items[0].description = description;
  const requests = new Map<unknown, { tasks: Task[] }>();
  let refresh: () => void = () => {};
  const call = vi.fn(async (method: string, payload: Record<string, unknown>) => {
    if (method === "list") {
      const visible = items.filter(item => Boolean(item.archivedAt) === Boolean(payload.archived));
      return { items: visible.map(({ description, ...item }) => item), total: visible.length, generation: 1 };
    }
    if (method === "get") return { ...items.find(item => item.id === payload.id)! };
    if (method === "update") return Object.assign(items.find(item => item.id === payload.id)!, payload.patch, { revision: Number(payload.ifRevision) + 1 });
    if (method === "create") {
      if (requests.has(payload.requestId)) return requests.get(payload.requestId);
      const created = { ...task(`created-${items.length}`, String(payload.title), payload.parentId as string | null), description: "" };
      items.push(created);
      let parentId = created.parentId;
      while (parentId) { const parent = items.find(item => item.id === parentId)!; if (parent.status === "done") { parent.status = "todo"; parent.revision++; } parentId = parent.parentId; }
      const result = { tasks: [created] }; requests.set(payload.requestId,result); return result;
    }
    if (method === "complete") {
      const ids = new Set([payload.id]);
      for (let depth = 0; depth < 16; depth++) for (const item of items) if (ids.has(item.parentId)) ids.add(item.id);
      const affected = items.filter(item => ids.has(item.id) && !item.archivedAt && item.status !== "done");
      const undo = affected.map(item => ({ id: item.id, ifRevision: item.revision + 1, status: item.status }));
      for (const item of affected) { item.status = "done"; item.revision++; }
      return { task: { ...items.find(item => item.id === payload.id)! }, undo };
    }
    if (method === "undoCompletion") {
      for (const change of payload.changes as Array<{id: string; status: Task["status"]}>) { const item = items.find(item => item.id === change.id)!; item.status = change.status; item.revision++; }
      return { restored: true };
    }
    if (method === "archive" || method === "restore") {
      const ids = new Set([payload.id]);
      for (let depth = 0; depth < 16; depth++) for (const item of items) if (ids.has(item.parentId)) ids.add(item.id);
      for (const item of items) if (ids.has(item.id)) { item.archivedAt = method === "archive" ? "2026-10-19T00:00:00Z" : null; item.revision++; }
      return { ...items.find(item => item.id === payload.id)! };
    }
    return { tasks: [] };
  });
  await act(async () => render(<Fixture api={call as Api} subscribe={callback => { refresh = callback; return () => {}; }} />, document.body));
  await act(async () => button("打开待办任务").click());
  return { items, call, refresh: () => refresh() };
}
function button(label: string): HTMLButtonElement { return document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!; }
async function startCapture() {
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-new-task")!.click());
  return document.querySelector<HTMLInputElement>('[aria-label="新任务标题"]')!;
}

it("shows the list without an empty detail pane and restores a draft after returning to the list", async () => {
  await setup();
  expect(document.querySelector(".ot-detail")).toBeNull();
  expect(document.querySelector(".ot-quick-add")).toBeNull();
  const trigger = document.querySelector<HTMLButtonElement>(".ot-task-name")!;
  await act(async () => trigger.click());
  await vi.waitFor(() => expect(document.querySelector('[aria-label="任务标题"]')).not.toBeNull());
  const input = document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!;
  await act(async () => { input.value = "保留这个草稿"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => button("返回任务列表").click());
  await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  expect(document.querySelector(".ot-detail")).toBeNull();
  await act(async () => trigger.click());
  await vi.waitFor(() => expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!.value).toBe("保留这个草稿"));
});

it("focuses capture on demand and uses Escape to collapse it while retaining its draft", async () => {
  const { call } = await setup();
  const input = await startCapture();
  await vi.waitFor(() => expect(document.activeElement).toBe(input));
  expect(document.querySelector<HTMLButtonElement>(".ot-create-submit")!.disabled).toBe(true);
  await act(async () => { input.value = "稍后创建"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(document.querySelector<HTMLButtonElement>(".ot-create-submit")!.disabled).toBe(false);
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
  await vi.waitFor(() => expect(document.activeElement).toBe(document.querySelector(".ot-new-task")));
  expect(document.querySelector<HTMLDivElement>(".ot-panel")!.hidden).toBe(false);
  expect(document.querySelector(".ot-quick-add")).toBeNull();
  expect((await startCapture()).value).toBe("稍后创建");
  expect(call.mock.calls.some(([method]) => method === "create")).toBe(false);
});

it("expands multiple task levels and selects details without completing a task", async () => {
  const { call } = await setup();
  expect(document.body.textContent).not.toContain("孙任务");
  await act(async () => button("展开 父任务").click());
  await act(async () => button("展开 子任务").click());
  expect(document.body.textContent).toContain("孙任务");
  const title = [...document.querySelectorAll<HTMLButtonElement>(".ot-task-name")].find(item => item.textContent === "孙任务")!;
  await act(async () => title.click());
  await vi.waitFor(() => expect(document.querySelector('[aria-label="任务标题"]')).not.toBeNull());
  expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!.value).toBe("孙任务");
  expect(call.mock.calls.some(([method]) => method === "update")).toBe(false);
});

it("preserves conflicting drafts and requires an explicit choice before saving over newer content", async () => {
  const { items, call, refresh } = await setup();
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(() => expect(document.querySelector('[aria-label="编辑描述"]')).not.toBeNull());
  await act(async () => button("编辑描述").click());
  await vi.waitFor(() => expect(document.querySelector('[aria-label="任务描述"]')).not.toBeNull());
  const input = document.querySelector<HTMLTextAreaElement>('[aria-label="任务描述"]')!;
  await act(async () => { input.value = "用户正在输入"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  items[0] = { ...items[0], revision: 2, description: "Agent 新内容" };
  await act(async () => refresh());
  await vi.waitFor(() => expect(document.body.textContent).toContain("草稿仍保留"));
  expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务描述"]')!.value).toBe("用户正在输入");
  expect(document.body.textContent).toContain("草稿仍保留");
  await act(async () => document.querySelector<HTMLFormElement>(".ot-detail form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(call.mock.calls.some(([method]) => method === "update")).toBe(false);
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>(".ot-conflict button")].find(item => item.textContent === "保留我的修改")!.click());
  await act(async () => document.querySelector<HTMLFormElement>(".ot-edit-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  const update = call.mock.calls.find(([method]) => method === "update")!;
  expect(update[1].ifRevision).toBe(2);
  expect(update[1].patch).toEqual({ description: "用户正在输入" });
});

it("deletes a task subtree from its visible detail action and can undo it", async () => {
  const { items, call } = await setup();
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(() => expect(document.querySelector(".ot-detail .ot-delete")).not.toBeNull());
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-detail .ot-delete")!.click());
  expect(items.every(item => item.archivedAt)).toBe(true);
  await vi.waitFor(() => expect(document.querySelectorAll(".ot-tree .ot-row")).toHaveLength(0));
  expect(document.querySelector('[role="status"]')!.textContent).toBe("已删除任务及 2 个子任务");
  expect(document.activeElement).toBe(document.querySelector(".ot-search"));
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>(".ot-toast button")].find(item => item.textContent === "撤销")!.click());
  expect(items.every(item => item.archivedAt === null)).toBe(true);
  await vi.waitFor(() => expect(document.querySelectorAll(".ot-tree .ot-row")).toHaveLength(1));
  expect(call.mock.calls.find(([method]) => method === "restore")![1]).toEqual({ id: "root", ifRevision: 2 });
});

it("exposes delete on subtasks and reveals a deleted child when undoing", async () => {
  const { items, call } = await setup();
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(() => expect(document.querySelector('.ot-detail-child [aria-label="删除 子任务"]')).not.toBeNull());
  await act(async () => document.querySelector<HTMLButtonElement>('.ot-detail-child [aria-label="删除 子任务"]')!.click());
  expect(items[0].archivedAt).toBeNull();
  expect(items[1].archivedAt).not.toBeNull();
  await vi.waitFor(() => expect(document.querySelectorAll(".ot-detail-child")).toHaveLength(0));
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>(".ot-toast button")].find(item => item.textContent === "撤销")!.click());
  expect(items.every(item => item.archivedAt === null)).toBe(true);
  await vi.waitFor(() => expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!.value).toBe("子任务"));
  expect(button("折叠 父任务").getAttribute("aria-expanded")).toBe("true");
  expect(document.querySelectorAll(".ot-tree .ot-row")).toHaveLength(2);
  expect(call.mock.calls.some(([method, payload]) => method === "list" && payload.archived)).toBe(false);
});

it("keeps the imported source link separate while preserving it on description edits", async () => {
  const source = "https://applink.larkoffice.com/client/todo/detail?guid=example";
  const { call } = await setup(`验收条件\n\n飞书任务：${source}`);
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(() => expect(document.querySelector(".ot-links a")).not.toBeNull());
  expect(document.querySelector(".ot-description-text")!.textContent).toBe("验收条件");
  expect(document.querySelector<HTMLAnchorElement>(".ot-links a")!.href).toBe(source);
  await act(async () => button("编辑描述").click());
  const input = document.querySelector<HTMLTextAreaElement>('[aria-label="任务描述"]')!;
  expect(input.value).toBe("验收条件");
  await act(async () => { input.value = "修改后的描述"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => document.querySelector<HTMLFormElement>(".ot-edit-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(call.mock.calls.find(([method]) => method === "update")![1].patch).toEqual({ description: `修改后的描述\n\n飞书任务：${source}` });
});

it("keeps unsaved details when closing and reopening, and Escape closes the panel", async () => {
  await setup();
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(() => expect(document.querySelector('[aria-label="任务标题"]')).not.toBeNull());
  const input = document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!;
  await act(async () => { input.value = "暂未保存"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => document.querySelector(".ot-panel")!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.querySelector<HTMLDivElement>(".ot-panel")!.hidden).toBe(true);
  await act(async () => button("打开待办任务").click());
  expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!.value).toBe("暂未保存");
});

it("does not submit task creation while an IME composition is being confirmed", async () => {
  const { call } = await setup();
  const input = await startCapture();
  await act(async () => { input.value = "中文输入"; input.dispatchEvent(new Event("input", { bubbles: true })); });
  const enter = new KeyboardEvent("keydown", { key: "Enter", isComposing: true, cancelable: true, bubbles: true });
  input.dispatchEvent(enter);
  expect(enter.defaultPrevented).toBe(true);
  expect(input.value).toBe("中文输入");
  expect(call.mock.calls.some(([method]) => method === "create")).toBe(false);
});

it("shows only direct search matches with their parent path", async () => {
  await setup();
  const search = document.querySelector<HTMLInputElement>(".ot-search")!;
  await act(async () => { search.value = "孙任务"; search.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(document.querySelectorAll(".ot-tree .ot-task-name")).toHaveLength(1);
  expect(document.querySelector(".ot-task-path")!.textContent).toBe("父任务 / 子任务");
  expect(document.querySelector('.ot-tree [aria-label="完成 孙任务"]')).not.toBeNull();
});

it("separates all, unfinished and completed tasks without injecting unfinished ancestors", async () => {
  const completed = { ...task("done", "已完成子任务", "root"), status: "done" as const };
  await setup("背景", [task("root", "未完成父任务"), completed, task("pending", "未完成子任务", "root"), { ...task("done-root", "已完成独立任务"), status: "done" }]);
  expect([...document.querySelectorAll('[role="tab"]')].map(item => item.id)).toEqual(["ot-filter-open", "ot-filter-all", "ot-filter-done"]);
  await act(async () => document.querySelector("#ot-filter-open")!.dispatchEvent(new KeyboardEvent("keydown", {key:"End",bubbles:true,cancelable:true})));
  expect(document.activeElement).toBe(document.querySelector("#ot-filter-done"));
  await act(async () => document.querySelector("#ot-filter-done")!.dispatchEvent(new KeyboardEvent("keydown", {key:"ArrowRight",bubbles:true,cancelable:true})));
  expect(document.activeElement).toBe(document.querySelector("#ot-filter-open"));
  const names = () => [...document.querySelectorAll(".ot-tree .ot-task-name > span:first-child")].map(item => item.textContent);
  await act(async () => document.querySelector<HTMLButtonElement>("#ot-filter-all")!.click());
  await act(async () => button("展开 未完成父任务").click());
  expect(names()).toEqual(["未完成父任务", "已完成子任务", "未完成子任务", "已完成独立任务"]);
  await act(async () => document.querySelector<HTMLButtonElement>("#ot-filter-done")!.click());
  expect(names()).toEqual(["已完成子任务", "已完成独立任务"]);
  expect(document.querySelector(".ot-task-path")!.textContent).toBe("未完成父任务");
  expect([...document.querySelectorAll('.ot-tree .ot-check')].every(item => item.getAttribute("aria-pressed") === "true")).toBe(true);
  expect(document.querySelector("#ot-filter-done .ot-filter-count")!.textContent).toBe("2");
  await act(async () => document.querySelector<HTMLButtonElement>("#ot-filter-open")!.click());
  expect(names()).toEqual(["未完成父任务", "未完成子任务"]);
});

it("preserves separate drafts across task and filter changes without locking task capture", async () => {
  await setup("背景", [task("one", "第一条"), task("two", "第二条")]);
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(() => expect(document.querySelector('[aria-label="任务标题"]')).not.toBeNull());
  const input = document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!;
  await act(async () => { input.value = "第一条草稿"; input.dispatchEvent(new Event("input", {bubbles:true})); });
  expect(document.querySelector<HTMLButtonElement>(".ot-new-task")!.disabled).toBe(false);
  expect((await startCapture()).disabled).toBe(false);
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>(".ot-task-name")].find(item => item.textContent === "第二条")!.click());
  await vi.waitFor(() => expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!.value).toBe("第二条"));
  await act(async () => document.querySelector<HTMLButtonElement>("#ot-filter-done")!.click());
  expect(document.querySelector(".ot-empty")!.textContent).toBe("暂无已完成任务");
  await act(async () => document.querySelector<HTMLButtonElement>("#ot-filter-all")!.click());
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!.value).toBe("第一条草稿");
});

it("confirms completion of unfinished descendants and undoes the whole operation", async () => {
  const {items,call} = await setup();
  await act(async () => button("完成 父任务").click());
  expect(document.querySelector('[role="alertdialog"]')!.textContent).toContain("2 个未完成子任务");
  expect(call.mock.calls.some(([method]) => method === "complete")).toBe(false);
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-confirm .ot-primary")!.click());
  await vi.waitFor(() => expect(items.every(item => item.status === "done")).toBe(true));
  await vi.waitFor(() => expect(document.querySelector('[role="status"]')!.textContent).toBe("已完成 3 项任务"));
  expect(document.querySelectorAll(".ot-tree .ot-row")).toHaveLength(0);
  await act(async () => [...document.querySelectorAll<HTMLButtonElement>(".ot-toast button")].find(item => item.textContent === "撤销")!.click());
  await vi.waitFor(() => expect(items.every(item => item.status === "todo")).toBe(true));
  await vi.waitFor(() => expect(document.querySelector<HTMLTextAreaElement>('[aria-label="任务标题"]')!.value).toBe("父任务"));
});

it("creates tasks into the unfinished view and preserves keyboard focus for rapid capture", async () => {
  const {call} = await setup();
  await act(async () => document.querySelector<HTMLButtonElement>("#ot-filter-done")!.click());
  const input = await startCapture();
  input.focus();
  await act(async () => { input.value = "新任务"; input.dispatchEvent(new Event("input",{bubbles:true})); });
  await act(async () => document.querySelector<HTMLFormElement>(".ot-quick-add")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  await vi.waitFor(() => expect(document.querySelector("#ot-filter-open")!.getAttribute("aria-selected")).toBe("true"));
  expect(document.activeElement).toBe(input);
  expect(call.mock.calls.find(([method]) => method === "create")![1].requestId).toMatch(/^[0-9a-f-]{36}$/u);
});

it("keeps narrow-window capture in the list after creating a task", async () => {
  const media = vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
  try {
    await setup();
    const input = await startCapture();
    await act(async () => { input.value = "连续录入"; input.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => document.querySelector<HTMLFormElement>(".ot-quick-add")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await vi.waitFor(() => expect(input.value).toBe(""));
    expect(document.querySelector(".ot-detail")).toBeNull();
    expect(document.activeElement).toBe(input);
    expect(document.querySelector(".ot-tree")!.textContent).toContain("连续录入");
  } finally { media.mockRestore(); }
});

it("reopens a completed parent and reveals a newly added unfinished child", async () => {
  await setup("背景", [{...task("root","父任务"),status:"done"}]);
  await act(async () => document.querySelector<HTMLButtonElement>("#ot-filter-done")!.click());
  await act(async () => document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(() => expect(document.querySelector('[aria-label="新子任务标题"]')).not.toBeNull());
  const input = document.querySelector<HTMLInputElement>('[aria-label="新子任务标题"]')!;
  await act(async () => { input.value = "新的子任务"; input.dispatchEvent(new Event("input",{bubbles:true})); });
  await act(async () => document.querySelector<HTMLFormElement>(".ot-add-child")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  await vi.waitFor(() => expect(document.querySelector("#ot-filter-open")!.getAttribute("aria-selected")).toBe("true"));
  expect(document.querySelectorAll(".ot-tree .ot-row")).toHaveLength(2);
  expect(document.querySelector<HTMLSelectElement>('[aria-label="任务状态"]')!.value).toBe("todo");
});

it("retries an uncertain creation response with the same request id", async () => {
  const {items,call} = await setup();
  const original = call.getMockImplementation()!;
  let fail = true;
  call.mockImplementation(async (method,payload) => { const result = await original(method,payload); if (method === "create" && fail) { fail = false; throw new Error("响应中断"); } return result; });
  const input = await startCapture();
  await act(async () => { input.value = "只创建一次"; input.dispatchEvent(new Event("input",{bubbles:true})); });
  const submit = () => document.querySelector<HTMLFormElement>(".ot-quick-add")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
  await act(async () => { submit(); });
  await vi.waitFor(() => expect(document.querySelector('[role="alert"]')!.textContent).toBe("响应中断"));
  expect(input.value).toBe("只创建一次");
  await vi.waitFor(() => expect(document.querySelector<HTMLButtonElement>(".ot-quick-add button")!.disabled).toBe(false));
  await act(async () => { submit(); });
  await vi.waitFor(() => expect(call.mock.calls.filter(([method]) => method === "create")).toHaveLength(2));
  await vi.waitFor(() => expect(document.querySelector<HTMLInputElement>('[aria-label="新任务标题"]')!.value).toBe(""));
  const creates = call.mock.calls.filter(([method]) => method === "create");
  expect(creates[0][1].requestId).toBe(creates[1][1].requestId);
  expect(items.filter(item => item.title === "只创建一次")).toHaveLength(1);
});

it("uses themed status and parent selectors with keyboard cancel and explicit parent save", async () => {
  const {call}=await setup("背景",[task("root","当前任务"),task("other","另一任务")]);
  await act(async()=>document.querySelector<HTMLButtonElement>(".ot-task-name")!.click());
  await vi.waitFor(()=>expect(button("任务状态").getAttribute("role")).toBe("combobox"));
  await act(async()=>button("任务状态").click());
  expect(document.querySelector('[role="listbox"]')!.textContent).toBe("待办进行中已完成");
  await act(async()=>button("任务状态").dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true})));
  expect(document.querySelector('[role="listbox"]')).toBeNull();
  expect(document.querySelector<HTMLElement>(".ot-panel")!.hidden).toBe(false);
  await act(async()=>button("任务状态").click());
  await act(async()=>[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(item=>item.textContent==="进行中")!.click());
  await vi.waitFor(()=>expect(button("任务状态").value).toBe("doing"));
  expect(call.mock.calls.find(([method])=>method==="update")![1].patch).toEqual({status:"doing"});
  await vi.waitFor(()=>expect(button("任务状态").disabled).toBe(false));
  expect(document.activeElement).toBe(button("任务状态"));
  await act(async()=>{document.querySelector<HTMLDetailsElement>(".ot-metadata")!.open=true;button("父任务").click();});
  expect([...document.querySelectorAll('[role="option"]')].map(item=>item.textContent)).toEqual(["无","另一任务"]);
  await act(async()=>[...document.querySelectorAll<HTMLElement>('[role="option"]')].find(item=>item.textContent==="另一任务")!.click());
  expect(call.mock.calls.filter(([method])=>method==="update")).toHaveLength(1);
  await act(async()=>document.querySelector<HTMLFormElement>(".ot-edit-form")!.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true})));
  await vi.waitFor(()=>expect(call.mock.calls.filter(([method])=>method==="update")).toHaveLength(2));
  expect(call.mock.calls.filter(([method])=>method==="update")[1][1].patch).toEqual({parentId:"other"});
});

it("restores focus through its shadow root and removes owned UI on unload", async () => {
  const disposers: Array<() => unknown> = [];
  const navigation = document.createElement("nav");
  navigation.innerHTML = '<button class="native-tool"><svg width="20" height="20"></svg><span>Plugins</span></button>';
  document.body.append(navigation);
  await act(async () => { activate({ id: "orbit-todo", config: {}, signal: new AbortController().signal,
    onDispose: callback => disposers.push(callback),
    rpc: { call: async <T,>() => ({ ok: true, data: { items: [], total: 0, generation: 0 } }) as T },
    events: { subscribe: () => () => {} },
  }); });
  const host = document.querySelector("#orbit-todo-root")!, shadow = host.shadowRoot!;
  const launcher = document.querySelector<HTMLButtonElement>("#orbit-todo-launcher")!;
  launcher.focus();
  await act(async () => launcher.click());
  expect(shadow.activeElement).toBe(shadow.querySelector(".ot-search"));
  await act(async () => shadow.querySelector<HTMLButtonElement>('[aria-label="关闭待办"]')!.click());
  expect(document.activeElement).toBe(launcher);
  await act(async () => { for (const dispose of disposers.reverse()) await dispose(); });
  expect(host.isConnected).toBe(false);
  expect(launcher.isConnected).toBe(false);
  expect(navigation.querySelector(".native-tool")).not.toBeNull();
});
