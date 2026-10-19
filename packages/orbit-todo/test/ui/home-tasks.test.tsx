// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { render } from "preact";
import { act } from "preact/test-utils";
import { HomeTasks } from "../../src/injected/home-tasks";
import type { Api } from "../../src/injected/use-task-store";
import type { HomeSectionMountContext } from "@c0sc0s/orbit/ui";
import type { StatusUndo, Task } from "../../src/shared/model";

afterEach(() => { render(null, document.body); document.body.replaceChildren(); });
const task = (id: string, title: string, parentId: string | null = null): Task => ({
  id, title, parentId, status:"todo", description:"", project:null, threadId:null, dueDate:null,
  position:0, revision:1, createdAt:"2026-10-19T00:00:00Z", updatedAt:"2026-10-19T00:00:00Z", archivedAt:null,
});
async function setup(items: Task[], header?: HomeSectionMountContext) {
  let refresh = () => {};
  const openTask = vi.fn();
  const call = vi.fn(async (method: string, payload: Record<string, unknown>) => {
    if (method === "list") {
      const result = items.filter(item => Boolean(item.archivedAt) === Boolean(payload.archived));
      return { items:result,total:result.length,generation:1 };
    }
    if (method === "complete") {
      const selected = items.find(item => item.id === payload.id)!, ids = new Set([selected.id]);
      for (let depth=0;depth<16;depth++) for(const item of items) if(item.parentId && ids.has(item.parentId)) ids.add(item.id);
      const undo = items.filter(item=>ids.has(item.id)&&item.status!=="done").map(item=>{
        const status=item.status;item.status="done";item.revision++;return {id:item.id,ifRevision:item.revision,status};
      });
      return {task:{...selected},undo};
    }
    if (method === "undoCompletion") {
      for (const change of payload.changes as StatusUndo[]) Object.assign(items.find(item=>item.id===change.id)!,{status:change.status,revision:change.ifRevision+1});
      return {restored:true};
    }
    throw new Error("Unexpected method");
  });
  const subscribe = (callback:()=>void) => {refresh=callback;return()=>{};};
  await act(async()=>render(<HomeTasks api={call as Api} subscribe={subscribe} openTask={openTask} header={header}/>,document.body));
  await vi.waitFor(()=> header ? expect(header.summary.textContent).not.toBe("") : expect(document.querySelector(".oth-header")!.textContent).toContain("未完成"));
  return {call,openTask,refresh:()=>refresh()};
}
function button(label:string): HTMLButtonElement {return document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;}

it("shows only unfinished work with nested context, grouped by status and due date",async()=>{
  const root=task("root","发布版本"), child={...task("child","实现功能","root"),status:"doing" as const};
  const overdue={...task("overdue","补齐文档"),dueDate:"2020-01-01"};
  const {openTask}=await setup([root,child,overdue,task("next","下个想法"),{...task("done","已完成事项"),status:"done"},{...task("trash","已删除事项"),archivedAt:"2026-10-19T00:00:00Z"}]);
  expect(document.body.textContent).not.toContain("已完成事项");expect(document.body.textContent).not.toContain("已删除事项");
  expect(document.querySelector('section[aria-label="进行中"]')!.textContent).toContain("发布版本");
  expect(document.querySelector('section[aria-label="已逾期"]')!.textContent).toContain("补齐文档");
  expect(document.querySelector(".oth-header")!.textContent).toContain("4 项未完成");
  expect(document.querySelector(".oth-children")).toBeNull();
  await act(async()=>button("展开 发布版本").click());expect(document.querySelector(".oth-children")!.textContent).toContain("实现功能");
  await act(async()=>button("折叠 发布版本").click());expect(document.querySelector(".oth-children")).toBeNull();
  await act(async()=>document.querySelector<HTMLButtonElement>(".oth-task-title")!.click());expect(openTask).toHaveBeenCalledWith("root");
});

it("keeps all tasks in a keyboard-accessible scroll region with its total and action in the shared heading",async()=>{
  const header={summary:document.createElement('span'),actions:document.createElement('div'),setCompact:vi.fn()};
  const items=Array.from({length:7},(_,index)=>task(String(index),`工作 ${index}`));items[6].status="doing";
  const {openTask}=await setup(items,header);
  expect(document.querySelectorAll('.oth-task-title')).toHaveLength(7);
  expect(document.querySelector('.oth-task-title')!.textContent).toBe("工作 6");
  expect(header.summary.textContent).toBe("7");expect(document.querySelector('.oth-header')).toBeNull();
  const region=document.querySelector<HTMLElement>('[role="region"][aria-label="待办列表"]')!;
  expect(region.tabIndex).toBe(0);expect(region.querySelectorAll('.oth-task-title')).toHaveLength(7);
  expect(region.contains(header.actions)).toBe(false);
  await act(async()=>header.actions.querySelector<HTMLButtonElement>('button')!.click());expect(openTask).toHaveBeenCalledWith(null);
  expect(header.setCompact).toHaveBeenLastCalledWith(false);
});

it("expands the full subtree inside the task list and completes it atomically",async()=>{
  const items=[task("parent","主任务"),...Array.from({length:7},(_,index)=>task(`child-${index}`,`子任务 ${index}`,"parent")),task("other","其他工作")];
  const header={summary:document.createElement('span'),actions:document.createElement('div'),setCompact:vi.fn()};
  const {call}=await setup(items,header);
  expect(document.querySelectorAll('.oth-task-title')).toHaveLength(2);
  await act(async()=>button("展开 主任务").click());
  expect(document.querySelectorAll('.oth-task-title')).toHaveLength(9);
  expect(header.summary.textContent).toBe("9");
  expect(document.body.textContent).toContain("其他工作");
  await act(async()=>button("完成 主任务").click());
  expect(document.querySelector('[role="alertdialog"]')!.textContent).toContain("7 个子任务");
  await act(async()=>document.querySelector<HTMLButtonElement>('.oth-confirm .ot-primary')!.click());
  await vi.waitFor(()=>expect(items.filter(item=>item.status==='done')).toHaveLength(8));
  expect(call.mock.calls.find(([method])=>method==='complete')![1].id).toBe("parent");
});

it("expands children inline for tasks further down the list",async()=>{
  const items=[...Array.from({length:5},(_,index)=>task(String(index),`工作 ${index}`)),task("child","子任务","4")];
  const {openTask}=await setup(items);
  await act(async()=>button("展开 工作 4").click());
  expect(openTask).not.toHaveBeenCalled();
  expect(document.querySelectorAll('.oth-task-title')).toHaveLength(6);
  expect(document.querySelector('.oth-children')!.textContent).toContain("子任务");
});

it("confirms parent completion once and atomically undoes the whole subtree",async()=>{
  const items=[task("root","发布版本"),{...task("child","实现功能","root"),status:"doing" as const}];
  const {call}=await setup(items);
  await act(async()=>button("完成 发布版本").click());
  expect(document.querySelector('[role="alertdialog"]')!.textContent).toContain("1 个子任务");
  expect(call.mock.calls.some(([method])=>method==="complete")).toBe(false);
  await act(async()=>document.querySelector<HTMLButtonElement>(".oth-confirm .ot-primary")!.click());
  await vi.waitFor(()=>expect(document.body.textContent).toContain("都完成了"));
  await vi.waitFor(()=>expect(document.querySelector(".oth-toast button")).not.toBeNull());
  expect(call.mock.calls.find(([method])=>method==="complete")![1]).toEqual({id:"root",ifRevision:1,ifGeneration:1});
  await act(async()=>[...document.querySelectorAll<HTMLButtonElement>(".oth-toast button")].find(item=>item.textContent==="撤销")!.click());
  await vi.waitFor(()=>expect(document.querySelector(".oth-header")!.textContent).toContain("2 项未完成"));
  expect(items.map(item=>item.status)).toEqual(["todo","doing"]);
});

it("refreshes after agent changes and opens the full task center",async()=>{
  const items=[task("one","当前工作")],{refresh,openTask}=await setup(items);
  items[0].status="done";await act(async()=>refresh());
  await vi.waitFor(()=>expect(document.body.textContent).toContain("都完成了"));
  await act(async()=>document.querySelector<HTMLButtonElement>(".oth-header button")!.click());expect(openTask).toHaveBeenCalledWith(null);
});
