import { mountSelect } from "@c0sc0s/orbit/ui";
import type { BugItem, BugStatus } from "../shared/model.js";
import { statusLabel } from "../shared/model.js";
import type { BugStore } from "./store.js";

export function element<K extends keyof HTMLElementTagNameMap>(document: Document, tag: K, className = "", text = "") {
  const node = document.createElement(tag); node.className = className; node.textContent = text;
  if (node instanceof document.defaultView!.HTMLButtonElement) node.type = "button";
  return node;
}
export function icon(document: Document, path: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "14"); svg.setAttribute("height", "14");
  svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "1.6"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round"); svg.setAttribute("aria-hidden", "true");
  const shape = document.createElementNS(svg.namespaceURI, "path"); shape.setAttribute("d", path); svg.append(shape); return svg;
}
const failures = {
  "cli-missing": "未找到 bytedcli，请安装后刷新。", auth: "请在终端运行 bytedcli meego login，完成登录后刷新。",
  permission: "当前账号没有访问权限，请在原平台确认权限后刷新。", network: "连接失败，请检查公司网络后重试。",
  data: "返回的数据格式不受支持，请检查 bytedcli 版本后重试。", storage: "列表已更新，但本地缓存保存失败。",
};
interface ListOptions {
  preview(bug: BugItem): void;
  reference?(bug: BugItem): void;
  selection?: { has(id: string): boolean; toggle(bug: BugItem): void };
}
export function mountBugList(container: HTMLElement, store: BugStore, options: ListOptions) {
  const document = container.ownerDocument, toolbar = element(document, "div", "toolbar");
  const search = element(document, "input", "search"); search.type = "search"; search.placeholder = "搜索 Bug"; search.setAttribute("aria-label", "搜索 Bug 标题或 ID");
  const project = element(document, "button", "project"); project.setAttribute("aria-label", "筛选项目");
  const tabs = element(document, "div", "tabs"); tabs.setAttribute("aria-label", "筛选 Bug 状态");
  let status: BugStatus | null = null;
  const tabButtons = ([null, "IN PROGRESS", "OPEN"] as const).map(value => {
    const button = element(document, "button", "tab");
    button.addEventListener("click", () => { status = value; render(); }); tabs.append(button); return { button, value };
  });
  toolbar.append(search, project, tabs);
  const notice = element(document, "div", "notice"), list = element(document, "div", "list"), foot = element(document, "div", "foot");
  notice.setAttribute("role", "status"); list.setAttribute("aria-label", "分配给我的未解决 Bug");
  container.append(toolbar, notice, list, foot);
  const select = mountSelect(project, { value: "", choices: [{ value: "", label: "全部项目" }], onChange: value => { void store.project(value || null); } });
  function render() {
    const snapshot = store.snapshot, bugs = store.bugs, projectKey = store.preferences.projectKey;
    const projects = new Map(bugs.map(bug => [bug.projectKey, bug.projectName]));
    if (projectKey && !projects.has(projectKey)) projects.set(projectKey, "已选项目（暂无 Bug）");
    select.update({ value: projectKey ?? "", choices: [{ value: "", label: "全部项目" }, ...[...projects].map(([value, label]) => ({ value, label }))] });
    const scoped = bugs.filter(bug => !projectKey || bug.projectKey === projectKey);
    for (const { button, value } of tabButtons) {
      button.textContent = value ? statusLabel(value) : "全部";
      button.setAttribute("aria-pressed", String(status === value));
    }
    notice.textContent = store.error || (snapshot?.error ? `${failures[snapshot.error]}${snapshot.updatedAt && snapshot.error !== "storage" ? " 当前显示上次同步的列表。" : ""}` : "");
    notice.hidden = !notice.textContent;
    const needle = search.value.trim().toLocaleLowerCase();
    const visible = scoped.filter(bug => (!status || bug.status === status) && `${bug.title} ${bug.workItemId} ${bug.projectName}`.toLocaleLowerCase().includes(needle));
    const active = container.getRootNode() instanceof document.defaultView!.ShadowRoot ? (container.getRootNode() as ShadowRoot).activeElement : document.activeElement;
    const focusedId = active instanceof document.defaultView!.HTMLElement && list.contains(active) ? active.dataset.bugFocus : null;
    const scrollTop = list.scrollTop, fragment = document.createDocumentFragment();
    for (const state of ["IN PROGRESS", "OPEN"] as const) {
      const group = visible.filter(bug => bug.status === state); if (!group.length) continue;
      fragment.append(element(document, "div", "group", `${statusLabel(state)} · ${group.length}`));
      for (const bug of group) {
        const row = element(document, "div", "row");
        if (options.selection) {
          const checkbox = element(document, "input"); checkbox.type = "checkbox"; checkbox.checked = options.selection.has(bug.id);
          checkbox.dataset.bugFocus = `select:${bug.id}`; checkbox.setAttribute("aria-label", `选择 ${bug.title}`);
          checkbox.addEventListener("change", () => options.selection!.toggle(bug)); row.append(checkbox);
        } else row.append(element(document, "span", `dot${state === "IN PROGRESS" ? " progress" : ""}`));
        const main = element(document, "button", "row-main"); main.dataset.bugFocus = `preview:${bug.id}`;
        main.setAttribute("aria-label", `查看 ${bug.title}`); main.append(element(document, "span", "title", bug.title), element(document, "div", "meta", `#${bug.workItemId} · ${bug.projectName}`));
        main.addEventListener("click", () => options.preview(bug)); row.append(main);
        if (options.reference) {
          const cite = element(document, "button", "cite"); cite.append(icon(document, "M12 5v14M5 12h14"));
          cite.title = "引用此 Bug"; cite.setAttribute("aria-label", `引用 ${bug.title}`);
          cite.addEventListener("click", () => options.reference!(bug)); row.append(cite);
        }
        fragment.append(row);
      }
    }
    if (!visible.length) fragment.append(element(document, "div", "empty", !snapshot?.updatedAt ? (notice.textContent ? "" : "正在获取列表…") : notice.textContent ? "" : bugs.length ? "没有符合当前筛选的 Bug" : snapshot.complete ? "当前没有分配给你的 OPEN / IN PROGRESS Bug" : "列表尚未取全，请刷新重试。"));
    list.replaceChildren(fragment); list.scrollTop = scrollTop;
    if (focusedId) [...list.querySelectorAll<HTMLElement>("[data-bug-focus]")].find(node => node.dataset.bugFocus === focusedId)?.focus({ preventScroll: true });
    foot.textContent = snapshot?.updatedAt && !snapshot.complete ? "仅显示部分结果" : ""; foot.hidden = !foot.textContent;
  }
  search.addEventListener("input", render); const unsubscribe = store.subscribe(render); render();
  return { render, search, dispose() { unsubscribe(); select.dispose(); toolbar.remove(); notice.remove(); list.remove(); foot.remove(); } };
}
