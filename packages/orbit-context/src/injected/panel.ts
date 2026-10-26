import { categories, formatTokens } from "../shared/model.js";
import type { Category, ContextEntry, ContextResult, ContextSnapshot } from "../shared/model.js";
import { treemap } from "./treemap.js";
import { styles } from "./styles.js";

type UsedCategory = Exclude<Category, "free">;
interface Group { id: UsedCategory; label: string; tokens: number; entries: ContextEntry[] }
const percent = (value: number, total: number) => {
  const ratio = total > 0 ? value / total * 100 : 0;
  return ratio > 0 && ratio < .1 ? "<0.1%" : `${ratio.toFixed(1).replace(/\.0$/u, "")}%`;
};
function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
}
function button(label: string, action: () => void, className = "control"): HTMLButtonElement {
  const node = element("button", className, label); node.type = "button"; node.addEventListener("click", action); return node;
}

export function createPanel(onClose: () => void, onLayout: () => void = () => {}) {
  const host = element("div"); host.id = "orbit-context-panel";
  host.style.cssText = "position:fixed;z-index:10001;inset:auto;zoom:var(--codex-window-zoom,1);";
  const root = host.attachShadow({ mode: "open" }), style = element("style"); style.textContent = styles;
  const panel = element("section", "panel"); panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "上下文构成"); panel.tabIndex = -1;
  const header = element("header", "header"), title = element("h2", "title", "上下文");
  const close = button("×", onClose, "close"); close.setAttribute("aria-label", "关闭上下文窗口"); header.append(title, close);
  const summary = element("div", "summary"), numbers = element("div", "numbers"), usedValue = element("strong", "usage-value"), denominator = element("span", "muted");
  const occupancy = element("span", "occupancy"); numbers.append(usedValue, denominator); summary.append(numbers, occupancy);
  const capacity = element("div", "capacity"); capacity.setAttribute("role", "meter"); capacity.setAttribute("aria-label", "上下文用量");
  const toolbar = element("div", "toolbar"), back = button("", () => {
    if (information) { information = false; render(); infoButton.focus({ preventScroll: true }); return; }
    const key = `group:${selected}`; selected = null; render();
    [...root.querySelectorAll<HTMLElement>("[data-key]")].find(node => node.dataset.key === key)?.focus({ preventScroll: true });
  }, "back");
  const heading = element("span", "section-title"), modeControls = element("div", "modes");
  const listButton = button("列表", () => { mode = "list"; render(); }), mapButton = button("矩形图", () => { mode = "map"; render(); });
  listButton.setAttribute("aria-label", "分类列表"); mapButton.setAttribute("aria-label", "矩形图");
  modeControls.append(listButton, mapButton); toolbar.append(back, heading, modeControls);
  const content = element("div", "content"), footer = element("footer", "footer"), cache = element("span", "cache muted");
  const infoButton = button("统计口径", () => { information = !information; render(); }, "info-button");
  infoButton.setAttribute("aria-controls", "context-content"); content.id = "context-content"; footer.append(cache, infoButton);
  panel.append(header, summary, capacity, toolbar, content, footer); root.append(style, panel);
  let snapshot: ContextSnapshot | null = null, selected: UsedCategory | null = null, mode: "list" | "map" = "list", information = false;

  function render() {
    if (!snapshot) return;
    const focused = (root.activeElement as HTMLElement | null)?.dataset.key;
    const used = snapshot.usage?.total ?? snapshot.estimatedTokens, windowSize = snapshot.window;
    const groups: Group[] = (Object.keys(categories) as Category[]).filter((key): key is UsedCategory => key !== "free").map(id => {
      const entries = snapshot!.entries.filter(entry => entry.category === id).sort((a, b) => b.tokens - a.tokens);
      return { id, label: categories[id].label, entries, tokens: entries.reduce((sum, entry) => sum + entry.tokens, 0) };
    }).filter(group => group.tokens > 0).sort((a, b) => b.tokens - a.tokens);
    const group = groups.find(item => item.id === selected);
    if (selected && !group) selected = null;
    panel.dataset.measured = String(Boolean(snapshot.usage));
    panel.dataset.view = information ? "information" : selected ? "sources" : mode;
    usedValue.textContent = `${snapshot.usage ? "" : "≈ "}${formatTokens(used)}`;
    denominator.textContent = windowSize ? ` / ${formatTokens(windowSize)}` : " token";
    numbers.title = `${used.toLocaleString()}${windowSize ? ` / ${windowSize.toLocaleString()}` : ""} token`;
    occupancy.textContent = windowSize ? `${percent(used, windowSize)} 已用` : "上限未知";
    occupancy.dataset.level = windowSize && used / windowSize >= .95 ? "high" : windowSize && used / windowSize >= .8 ? "medium" : "normal";
    occupancy.title = windowSize ? `剩余 ${Math.max(0, windowSize - used).toLocaleString()} token` : "尚无上下文上限计数";
    capacity.replaceChildren(); capacity.hidden = !windowSize;
    capacity.setAttribute("aria-valuenow", String(Math.min(used, windowSize ?? used)));
    capacity.setAttribute("aria-valuemin", "0"); capacity.setAttribute("aria-valuemax", String(windowSize ?? used));
    capacity.setAttribute("aria-valuetext", windowSize ? `已用 ${percent(used, windowSize)}，剩余 ${formatTokens(Math.max(0, windowSize - used))} token` : "上限未知");
    capacity.title = capacity.getAttribute("aria-valuetext")!;
    for (const item of groups) {
      const segment = element("span", "segment"); segment.style.width = `${item.tokens / Math.max(used, windowSize ?? used, 1) * 100}%`;
      segment.style.background = categories[item.id].color; capacity.append(segment);
    }
    back.hidden = !selected && !information; back.textContent = information ? "‹ 返回" : "‹ 全部";
    heading.textContent = information ? "统计口径" : group ? `${group.label} · ${formatTokens(group.tokens)} · 占已用` : "已用构成 · 估算";
    modeControls.hidden = Boolean(selected || information);
    listButton.setAttribute("aria-pressed", String(mode === "list")); mapButton.setAttribute("aria-pressed", String(mode === "map"));
    infoButton.setAttribute("aria-expanded", String(information));
    infoButton.textContent = snapshot.partial ? "记录不完整 ⓘ" : "统计口径 ⓘ";
    infoButton.dataset.warning = String(snapshot.partial);
    const usage = snapshot.usage, cached = usage?.cached;
    cache.textContent = usage && cached !== null && cached !== undefined && usage.input > 0
      ? `缓存 ${percent(cached, usage.input)} · 新增 ${formatTokens(usage.input - cached)}` : "缓存计数未上报";
    content.replaceChildren();
    if (information) {
      const explanation = element("div", "explanation");
      const date = snapshot.measuredAt ? new Date(snapshot.measuredAt) : null;
      explanation.append(element("p", "", `${snapshot.model ?? "模型未记录"}${date && Number.isFinite(date.getTime()) ? ` · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`));
      explanation.append(element("p", "", "总量来自最近一次请求。分类按本地记录估算，占比以已用上下文为分母。"));
      explanation.append(element("p", "muted", snapshot.scaled ? "分类估算超出实测总量，已按比例校准。" : "未归因包含未记录的内容和编码差异。"));
      if (snapshot.compactions) explanation.append(element("p", "muted", `已按 ${snapshot.compactions} 次压缩更新。`));
      if (snapshot.partial) explanation.append(element("p", "muted", "部分记录无法分析，分类可能缺失。"));
      if (snapshot.pendingRecords) explanation.append(element("p", "muted", "新增内容等待下一次 token 计数。"));
      content.append(explanation);
    } else if (!groups.length) content.append(element("div", "empty muted", "暂无可分析内容"));
    else if (selected && group) {
      const list = element("div", "source-list"); list.setAttribute("role", "list"); list.setAttribute("aria-label", `${group.label}来源`);
      for (const entry of group.entries) {
        const row = element("div", "source-row"); row.setAttribute("role", "listitem"); row.tabIndex = 0; row.dataset.key = entry.id;
        row.title = `${entry.label} · 约 ${entry.tokens.toLocaleString()} token · ${entry.records} 条记录`;
        row.append(element("span", "source-name", entry.label), element("span", "row-tokens", formatTokens(entry.tokens)), element("span", "row-share muted", percent(entry.tokens, used)));
        list.append(row);
      }
      content.append(list);
    } else if (mode === "map") {
      const chart = element("div", "chart"); chart.setAttribute("aria-label", "已用上下文分类矩形图");
      for (const tile of treemap(groups, 324, 144)) {
        const item = tile.item, node = button("", () => { selected = item.id; render(); }, `tile${tile.width < 54 || tile.height < 36 ? " tiny" : ""}`);
        node.style.cssText = `left:${tile.x / 324 * 100}%;top:${tile.y / 144 * 100}%;width:${tile.width / 324 * 100}%;height:${tile.height / 144 * 100}%;--item-color:${categories[item.id].color}`;
        node.dataset.key = `group:${item.id}`; node.title = `${item.label} · 约 ${formatTokens(item.tokens)} token · ${percent(item.tokens, used)}`; node.setAttribute("aria-label", node.title);
        node.append(element("span", "tile-name", item.label), element("span", "tile-value", formatTokens(item.tokens))); chart.append(node);
      }
      content.append(chart);
    } else {
      const list = element("div", "category-list"); list.setAttribute("aria-label", "按占用排序的上下文分类");
      for (const item of groups) {
        const row = button("", () => { selected = item.id; render(); }, "category-row"); row.dataset.key = `group:${item.id}`;
        row.style.setProperty("--item-color", categories[item.id].color); row.style.setProperty("--share", `${item.tokens / Math.max(1, used) * 100}%`);
        row.setAttribute("aria-label", `${item.label} · 约 ${formatTokens(item.tokens)} token · ${percent(item.tokens, used)}，查看来源`);
        row.append(element("span", "swatch"), element("span", "row-name", item.label), element("span", "row-tokens", formatTokens(item.tokens)), element("span", "row-share muted", percent(item.tokens, used)), element("span", "chevron muted", "›"));
        list.append(row);
      }
      content.append(list);
    }
    if (focused) ([...root.querySelectorAll<HTMLElement>("[data-key]")].find(node => node.dataset.key === focused) ?? (selected ? back : listButton)).focus({ preventScroll: true });
    onLayout();
  }
  function unavailable(message: string) {
    snapshot = null; delete panel.dataset.measured; panel.dataset.view = "unavailable";
    summary.hidden = capacity.hidden = toolbar.hidden = footer.hidden = true;
    content.replaceChildren(element("div", "empty muted", message)); onLayout();
  }
  return {
    host, root, panel,
    update(result: ContextResult) {
      if (result.status === "ready") { snapshot = result.snapshot; summary.hidden = toolbar.hidden = footer.hidden = false; render(); }
      else unavailable(result.status === "missing" ? "此会话暂无本地记录" : result.status === "too-large" ? "会话记录过大，暂时无法分析" : "暂时无法读取，请稍后再试");
    },
    loading() { unavailable("正在读取上下文…"); },
    focus() { close.focus({ preventScroll: true }); },
    resize: render,
  };
}
