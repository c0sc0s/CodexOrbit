// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { getHomeSections } from "@c0sc0s/orbit/ui";
import { installRuntime } from "../../src/injected/runtime";
import { summarizeTags } from "../../src/injected/tag-summary";
import { createRuntimeMessage, RuntimeMessageType } from "../../src/shared/protocol";
import type { SessionEntry } from "../../src/injected/models";

vi.mock("../../src/injected/motion", () => ({ enterDashboard: vi.fn(), enterDashboardContent: vi.fn(), enterSortMenu: vi.fn(), exitDashboard: vi.fn(), refreshResults: vi.fn() }));

afterEach(()=>{window.__codexSidebarTags?.dispose();document.body.replaceChildren();localStorage.clear();});
it("counts tags case-insensitively and retains configured tags with no sessions",()=>{
  const rows=summarizeTags([{tag:"bug",color:"#112233"},{tag:"Bug",color:"#112233"},{tag:"Other",color:"#445566"}] as SessionEntry[],[{name:"Bug",color:"#112233",description:""},{name:"Research",color:"#778899",description:""}]);
  expect(rows.map(({name,count})=>({name,count}))).toEqual([{name:"Bug",count:2},{name:"Research",count:0},{name:"Other",count:1}]);
});
it("owns a Home contribution, refreshes from the complete catalog and opens the filtered dashboard",async()=>{
  document.body.innerHTML='<button>Plugins</button>';
  installRuntime({version:"home-test",protocolVersion:1,settingsSource:"repository",tagDefinitions:[{name:"Bug",color:"#d95c5c",description:""},{name:"Research",color:"#778899",description:""}],colorPresets:[{name:"Coral",color:"#d95c5c"}],legacyToneColors:{neutral:"#7c8798",blue:"#4f8fd7"}},async()=>{});
  const section=getHomeSections().find(section=>section.id==="orbit-tags")!;expect(section.slot).toBe("overview");
  const container=document.createElement('div');document.body.append(container);const unmount=section.mount(container);
  const shadow=container.firstElementChild!.shadowRoot!;
  window.__codexSidebarTags!.handleMessage(createRuntimeMessage(RuntimeMessageType.catalogSnapshot,{complete:true,items:[{threadId:"a",raw:"[Bug] One"},{threadId:"b",raw:"[bug] Two"},{threadId:"c",raw:"Untagged"}]}));
  expect(shadow.querySelector('.tags-home-total strong')!.textContent).toBe("3");
  expect(shadow.querySelector('[data-tag="Bug"]')!.textContent).toBe("Bug2");
  expect(shadow.querySelector('[data-tag="Research"]')!.textContent).toBe("Research0");
  const button=shadow.querySelector<HTMLButtonElement>('[data-tag="Bug"]')!;button.focus();button.click();
  await vi.waitFor(()=>expect(document.querySelector('.codex-sidebar-dashboard-overlay')).not.toBeNull());
  expect(document.querySelectorAll('.codex-sidebar-result')).toHaveLength(2);
  expect(document.querySelector('[data-value="Bug"] .codex-sidebar-filter-count')!.textContent).toBe("2");
  window.__codexSidebarTags!.handleMessage(createRuntimeMessage(RuntimeMessageType.catalogSnapshot,{complete:true,items:[{threadId:"a",raw:"[Bug] One"},{threadId:"b",raw:"[bug] Two"},{threadId:"d",raw:"[Bug] Three"}]}));
  expect(shadow.querySelector('[data-tag="Bug"]')).toBe(button);
  document.querySelector<HTMLButtonElement>('.codex-sidebar-dashboard-close')!.click();
  await vi.waitFor(()=>expect(shadow.activeElement).toBe(button));
  unmount();window.__codexSidebarTags!.dispose();expect(getHomeSections().some(section=>section.id==="orbit-tags")).toBe(false);
});
