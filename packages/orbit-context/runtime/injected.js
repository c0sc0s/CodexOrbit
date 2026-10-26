"use strict";
var CodexPlugin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/injected/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    activate: () => activate
  });

  // ../orbit-tags/dist/host-adapter/codex-dom-adapter.js
  function contextUsageTrigger(target) {
    if (!(target instanceof Element))
      return null;
    const trigger = target.closest('[role="img"][aria-label]');
    return trigger && /^(?:Context usage:|上下文用量[：:]|情境使用量[：:])\s*[\d.,]+\s*[%％]$/u.test(trigger.getAttribute("aria-label") ?? "") ? trigger : null;
  }
  function contextUsageTriggers(document2) {
    return [...document2.querySelectorAll('[role="img"][aria-label]')].filter((element2) => contextUsageTrigger(element2) === element2);
  }
  function selectedThreadId() {
    return document.querySelector('[data-app-action-sidebar-thread-selected="true"]')?.getAttribute("data-app-action-sidebar-thread-id") ?? null;
  }

  // src/shared/model.ts
  var RUNTIME_VERSION = "0.1.2";
  var SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
  var categories = {
    system: { label: "\u7CFB\u7EDF\u63D0\u793A\u8BCD", color: "#b9a3f5" },
    tools: { label: "\u5DE5\u5177\u5B9A\u4E49", color: "#73cce6" },
    skills: { label: "\u6280\u80FD", color: "#9baac3" },
    results: { label: "\u5DE5\u5177\u7ED3\u679C", color: "#e5a2c9" },
    conversation: { label: "\u4F1A\u8BDD\u5185\u5BB9", color: "#9faef7" },
    unknown: { label: "\u672A\u5F52\u56E0", color: "#9b9ba4" },
    free: { label: "\u5269\u4F59\u7A7A\u95F4", color: "#77777f" }
  };
  function localSessionId(value) {
    const id = value?.startsWith("local:") ? value.slice("local:".length) : value;
    return id && SESSION_ID.test(id) ? id.toLowerCase() : null;
  }
  function sessionFromUrl(value) {
    try {
      const url = new URL(value);
      for (const part of url.pathname.split("/").reverse()) if (SESSION_ID.test(part)) return part.toLowerCase();
    } catch {
    }
    return null;
  }
  function formatTokens(value) {
    return value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}K` : String(Math.round(value));
  }

  // src/injected/treemap.ts
  function treemap(items, width, height, x = 0, y = 0) {
    const sorted = items.filter((item) => Number.isFinite(item.tokens) && item.tokens > 0).sort((a, b) => b.tokens - a.tokens || a.id.localeCompare(b.id));
    if (!sorted.length || width <= 0 || height <= 0) return [];
    const split = (values, left, top, w, h) => {
      if (values.length === 1) return [{ item: values[0], x: left, y: top, width: w, height: h }];
      const total = values.reduce((sum2, value) => sum2 + value.tokens, 0);
      let sum = values[0].tokens, boundary = 1;
      while (boundary < values.length - 1 && Math.abs(sum + values[boundary].tokens - total / 2) < Math.abs(sum - total / 2)) sum += values[boundary++].tokens;
      const fraction = sum / total;
      return w >= h ? [...split(values.slice(0, boundary), left, top, w * fraction, h), ...split(values.slice(boundary), left + w * fraction, top, w * (1 - fraction), h)] : [...split(values.slice(0, boundary), left, top, w, h * fraction), ...split(values.slice(boundary), left, top + h * fraction, w, h * (1 - fraction))];
    };
    return split(sorted, x, y, width, height);
  }

  // src/injected/styles.ts
  var styles = `
:host{font:12px/1.4 var(--font-sans,system-ui,sans-serif);color:var(--color-text-primary,CanvasText);color-scheme:inherit}
*{box-sizing:border-box}[hidden]{display:none!important}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible,[tabindex]:focus-visible{outline:2px solid var(--color-text-primary,CanvasText);outline-offset:1px}
.panel{width:352px;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);overflow:auto;padding:12px 14px 10px;border:1px solid var(--color-border,color-mix(in srgb,CanvasText 14%,transparent));border-radius:12px;background:var(--color-background-elevated-primary-opaque,var(--color-background-elevated-base,Canvas));box-shadow:0 8px 28px #0004,0 2px 6px #0002}
.header,.summary,.numbers,.toolbar,.modes,.footer{display:flex;align-items:center}.header,.summary,.toolbar,.footer{justify-content:space-between;gap:8px}.title{font-size:12px;font-weight:550;margin:0}.muted{color:var(--color-text-secondary,GrayText)}.close{display:grid;place-items:center;width:20px;height:20px;border:0;border-radius:5px;background:none;color:var(--color-text-secondary,GrayText);font-size:17px;line-height:1;padding:0}.close:hover,.control:hover,.back:hover,.info-button:hover{background:color-mix(in srgb,CanvasText 7%,transparent)}
.summary{margin-top:3px;white-space:nowrap}.numbers{gap:3px;font-variant-numeric:tabular-nums;align-items:baseline;min-width:0}.usage-value{font-size:22px;line-height:1.4;font-weight:600;letter-spacing:-.6px}.numbers>.muted{font-size:11px}.occupancy{font-size:11px;color:var(--color-text-secondary,GrayText);font-variant-numeric:tabular-nums}.occupancy[data-level=medium]{color:light-dark(#986300,#e2b565)}.occupancy[data-level=high]{color:light-dark(#b43e43,#ee8c91)}
.capacity{display:flex;height:4px;margin-top:6px;border-radius:3px;overflow:hidden;background:color-mix(in srgb,CanvasText 9%,transparent);gap:0}.segment{height:100%;flex-shrink:0}.toolbar{margin:11px 0 4px;min-height:22px;gap:6px}.section-title{font-size:10px;color:var(--color-text-secondary,GrayText);flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.modes{gap:2px}.control,.back{border:0;background:none;border-radius:4px;font-size:10px;line-height:18px;padding:1px 5px;white-space:nowrap;color:var(--color-text-secondary,GrayText)}.control[aria-pressed=true]{background:color-mix(in srgb,CanvasText 8%,transparent);color:var(--color-text-primary,CanvasText)}.back{padding-left:0;color:var(--color-text-primary,CanvasText)}
.category-list{display:grid;gap:2px}.category-row{display:grid;grid-template-columns:6px minmax(0,1fr) 48px 43px 6px;gap:7px;align-items:center;width:100%;height:25px;padding:3px 6px;border:0;border-radius:5px;text-align:left;background:linear-gradient(to right,color-mix(in srgb,var(--item-color) 9%,transparent) var(--share),transparent var(--share));font-size:11px}.category-row:hover{background:color-mix(in srgb,var(--item-color) 17%,transparent)}.swatch{width:5px;height:5px;border-radius:2px;background:var(--item-color)}.row-name,.source-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.row-tokens,.row-share{font-variant-numeric:tabular-nums;text-align:right;white-space:nowrap}.row-share{font-size:10px}.chevron{text-align:right;font-size:13px;opacity:.6}
.source-list{max-height:160px;overflow:auto;scrollbar-width:thin}.source-row{display:grid;grid-template-columns:minmax(0,1fr) 50px 46px;gap:7px;align-items:center;min-height:26px;padding:4px 3px;font-size:11px;border-bottom:1px solid color-mix(in srgb,CanvasText 5%,transparent)}.source-row:last-child{border:0}.source-row:hover{background:color-mix(in srgb,CanvasText 4%,transparent)}
.chart{position:relative;height:144px;width:100%;overflow:hidden;border-radius:6px}.tile{position:absolute;display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:1px;overflow:hidden;border:1.5px solid var(--color-background-elevated-primary-opaque,var(--color-background-elevated-base,Canvas));border-radius:6px;padding:6px 7px;min-width:0;text-align:left;background:color-mix(in srgb,var(--item-color) 17%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--item-color) 24%,transparent)}.tile:hover,.tile:focus-visible{background:color-mix(in srgb,var(--item-color) 28%,transparent)}.tile-name,.tile-value{display:block;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tile-name{font-size:11px;font-weight:500}.tile-value{font-size:10px;color:var(--color-text-secondary,GrayText)}.tile.tiny{padding:0}.tile.tiny>span{display:none}
.footer{margin-top:9px;padding-top:7px;border-top:1px solid color-mix(in srgb,CanvasText 8%,transparent);font-size:10px;min-height:25px}.cache{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-variant-numeric:tabular-nums}.info-button{border:0;border-radius:4px;background:none;padding:2px 0 2px 4px;font-size:10px;white-space:nowrap;color:var(--color-text-secondary,GrayText)}.info-button[data-warning=true]{color:light-dark(#986300,#e2b565)}.explanation{max-height:160px;overflow:auto;font-size:11px;line-height:1.6;scrollbar-width:thin}.explanation p{margin:5px 0}.explanation p:first-child{font:10px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.empty{padding:18px 0 10px;font-size:11px}
@media(max-width:380px){.panel{padding:10px 12px}.category-row{gap:5px}.usage-value{font-size:20px}}
`;

  // src/injected/panel.ts
  var percent = (value, total) => {
    const ratio = total > 0 ? value / total * 100 : 0;
    return ratio > 0 && ratio < 0.1 ? "<0.1%" : `${ratio.toFixed(1).replace(/\.0$/u, "")}%`;
  };
  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }
  function button(label, action, className = "control") {
    const node = element("button", className, label);
    node.type = "button";
    node.addEventListener("click", action);
    return node;
  }
  function createPanel(onClose, onLayout = () => {
  }) {
    const host = element("div");
    host.id = "orbit-context-panel";
    host.style.cssText = "position:fixed;z-index:10001;inset:auto;zoom:var(--codex-window-zoom,1);";
    const root = host.attachShadow({ mode: "open" }), style = element("style");
    style.textContent = styles;
    const panel = element("section", "panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "\u4E0A\u4E0B\u6587\u6784\u6210");
    panel.tabIndex = -1;
    const header = element("header", "header"), title = element("h2", "title", "\u4E0A\u4E0B\u6587");
    const close = button("\xD7", onClose, "close");
    close.setAttribute("aria-label", "\u5173\u95ED\u4E0A\u4E0B\u6587\u7A97\u53E3");
    header.append(title, close);
    const summary = element("div", "summary"), numbers = element("div", "numbers"), usedValue = element("strong", "usage-value"), denominator = element("span", "muted");
    const occupancy = element("span", "occupancy");
    numbers.append(usedValue, denominator);
    summary.append(numbers, occupancy);
    const capacity = element("div", "capacity");
    capacity.setAttribute("role", "meter");
    capacity.setAttribute("aria-label", "\u4E0A\u4E0B\u6587\u7528\u91CF");
    const toolbar = element("div", "toolbar"), back = button("", () => {
      if (information) {
        information = false;
        render();
        infoButton.focus({ preventScroll: true });
        return;
      }
      const key = `group:${selected}`;
      selected = null;
      render();
      [...root.querySelectorAll("[data-key]")].find((node) => node.dataset.key === key)?.focus({ preventScroll: true });
    }, "back");
    const heading = element("span", "section-title"), modeControls = element("div", "modes");
    const listButton = button("\u5217\u8868", () => {
      mode = "list";
      render();
    }), mapButton = button("\u77E9\u5F62\u56FE", () => {
      mode = "map";
      render();
    });
    listButton.setAttribute("aria-label", "\u5206\u7C7B\u5217\u8868");
    mapButton.setAttribute("aria-label", "\u77E9\u5F62\u56FE");
    modeControls.append(listButton, mapButton);
    toolbar.append(back, heading, modeControls);
    const content = element("div", "content"), footer = element("footer", "footer"), cache = element("span", "cache muted");
    const infoButton = button("\u7EDF\u8BA1\u53E3\u5F84", () => {
      information = !information;
      render();
    }, "info-button");
    infoButton.setAttribute("aria-controls", "context-content");
    content.id = "context-content";
    footer.append(cache, infoButton);
    panel.append(header, summary, capacity, toolbar, content, footer);
    root.append(style, panel);
    let snapshot = null, selected = null, mode = "list", information = false;
    function render() {
      if (!snapshot) return;
      const focused = root.activeElement?.dataset.key;
      const used = snapshot.usage?.total ?? snapshot.estimatedTokens, windowSize = snapshot.window;
      const groups = Object.keys(categories).filter((key) => key !== "free").map((id) => {
        const entries = snapshot.entries.filter((entry) => entry.category === id).sort((a, b) => b.tokens - a.tokens);
        return { id, label: categories[id].label, entries, tokens: entries.reduce((sum, entry) => sum + entry.tokens, 0) };
      }).filter((group2) => group2.tokens > 0).sort((a, b) => b.tokens - a.tokens);
      const group = groups.find((item) => item.id === selected);
      if (selected && !group) selected = null;
      panel.dataset.measured = String(Boolean(snapshot.usage));
      panel.dataset.view = information ? "information" : selected ? "sources" : mode;
      usedValue.textContent = `${snapshot.usage ? "" : "\u2248 "}${formatTokens(used)}`;
      denominator.textContent = windowSize ? ` / ${formatTokens(windowSize)}` : " token";
      numbers.title = `${used.toLocaleString()}${windowSize ? ` / ${windowSize.toLocaleString()}` : ""} token`;
      occupancy.textContent = windowSize ? `${percent(used, windowSize)} \u5DF2\u7528` : "\u4E0A\u9650\u672A\u77E5";
      occupancy.dataset.level = windowSize && used / windowSize >= 0.95 ? "high" : windowSize && used / windowSize >= 0.8 ? "medium" : "normal";
      occupancy.title = windowSize ? `\u5269\u4F59 ${Math.max(0, windowSize - used).toLocaleString()} token` : "\u5C1A\u65E0\u4E0A\u4E0B\u6587\u4E0A\u9650\u8BA1\u6570";
      capacity.replaceChildren();
      capacity.hidden = !windowSize;
      capacity.setAttribute("aria-valuenow", String(Math.min(used, windowSize ?? used)));
      capacity.setAttribute("aria-valuemin", "0");
      capacity.setAttribute("aria-valuemax", String(windowSize ?? used));
      capacity.setAttribute("aria-valuetext", windowSize ? `\u5DF2\u7528 ${percent(used, windowSize)}\uFF0C\u5269\u4F59 ${formatTokens(Math.max(0, windowSize - used))} token` : "\u4E0A\u9650\u672A\u77E5");
      capacity.title = capacity.getAttribute("aria-valuetext");
      for (const item of groups) {
        const segment = element("span", "segment");
        segment.style.width = `${item.tokens / Math.max(used, windowSize ?? used, 1) * 100}%`;
        segment.style.background = categories[item.id].color;
        capacity.append(segment);
      }
      back.hidden = !selected && !information;
      back.textContent = information ? "\u2039 \u8FD4\u56DE" : "\u2039 \u5168\u90E8";
      heading.textContent = information ? "\u7EDF\u8BA1\u53E3\u5F84" : group ? `${group.label} \xB7 ${formatTokens(group.tokens)} \xB7 \u5360\u5DF2\u7528` : "\u5DF2\u7528\u6784\u6210 \xB7 \u4F30\u7B97";
      modeControls.hidden = Boolean(selected || information);
      listButton.setAttribute("aria-pressed", String(mode === "list"));
      mapButton.setAttribute("aria-pressed", String(mode === "map"));
      infoButton.setAttribute("aria-expanded", String(information));
      infoButton.textContent = snapshot.partial ? "\u8BB0\u5F55\u4E0D\u5B8C\u6574 \u24D8" : "\u7EDF\u8BA1\u53E3\u5F84 \u24D8";
      infoButton.dataset.warning = String(snapshot.partial);
      const usage = snapshot.usage, cached = usage?.cached;
      cache.textContent = usage && cached !== null && cached !== void 0 && usage.input > 0 ? `\u7F13\u5B58 ${percent(cached, usage.input)} \xB7 \u65B0\u589E ${formatTokens(usage.input - cached)}` : "\u7F13\u5B58\u8BA1\u6570\u672A\u4E0A\u62A5";
      content.replaceChildren();
      if (information) {
        const explanation = element("div", "explanation");
        const date = snapshot.measuredAt ? new Date(snapshot.measuredAt) : null;
        explanation.append(element("p", "", `${snapshot.model ?? "\u6A21\u578B\u672A\u8BB0\u5F55"}${date && Number.isFinite(date.getTime()) ? ` \xB7 ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}`));
        explanation.append(element("p", "", "\u603B\u91CF\u6765\u81EA\u6700\u8FD1\u4E00\u6B21\u8BF7\u6C42\u3002\u5206\u7C7B\u6309\u672C\u5730\u8BB0\u5F55\u4F30\u7B97\uFF0C\u5360\u6BD4\u4EE5\u5DF2\u7528\u4E0A\u4E0B\u6587\u4E3A\u5206\u6BCD\u3002"));
        explanation.append(element("p", "muted", snapshot.scaled ? "\u5206\u7C7B\u4F30\u7B97\u8D85\u51FA\u5B9E\u6D4B\u603B\u91CF\uFF0C\u5DF2\u6309\u6BD4\u4F8B\u6821\u51C6\u3002" : "\u672A\u5F52\u56E0\u5305\u542B\u672A\u8BB0\u5F55\u7684\u5185\u5BB9\u548C\u7F16\u7801\u5DEE\u5F02\u3002"));
        if (snapshot.compactions) explanation.append(element("p", "muted", `\u5DF2\u6309 ${snapshot.compactions} \u6B21\u538B\u7F29\u66F4\u65B0\u3002`));
        if (snapshot.partial) explanation.append(element("p", "muted", "\u90E8\u5206\u8BB0\u5F55\u65E0\u6CD5\u5206\u6790\uFF0C\u5206\u7C7B\u53EF\u80FD\u7F3A\u5931\u3002"));
        if (snapshot.pendingRecords) explanation.append(element("p", "muted", "\u65B0\u589E\u5185\u5BB9\u7B49\u5F85\u4E0B\u4E00\u6B21 token \u8BA1\u6570\u3002"));
        content.append(explanation);
      } else if (!groups.length) content.append(element("div", "empty muted", "\u6682\u65E0\u53EF\u5206\u6790\u5185\u5BB9"));
      else if (selected && group) {
        const list = element("div", "source-list");
        list.setAttribute("role", "list");
        list.setAttribute("aria-label", `${group.label}\u6765\u6E90`);
        for (const entry of group.entries) {
          const row = element("div", "source-row");
          row.setAttribute("role", "listitem");
          row.tabIndex = 0;
          row.dataset.key = entry.id;
          row.title = `${entry.label} \xB7 \u7EA6 ${entry.tokens.toLocaleString()} token \xB7 ${entry.records} \u6761\u8BB0\u5F55`;
          row.append(element("span", "source-name", entry.label), element("span", "row-tokens", formatTokens(entry.tokens)), element("span", "row-share muted", percent(entry.tokens, used)));
          list.append(row);
        }
        content.append(list);
      } else if (mode === "map") {
        const chart = element("div", "chart");
        chart.setAttribute("aria-label", "\u5DF2\u7528\u4E0A\u4E0B\u6587\u5206\u7C7B\u77E9\u5F62\u56FE");
        for (const tile of treemap(groups, 324, 144)) {
          const item = tile.item, node = button("", () => {
            selected = item.id;
            render();
          }, `tile${tile.width < 54 || tile.height < 36 ? " tiny" : ""}`);
          node.style.cssText = `left:${tile.x / 324 * 100}%;top:${tile.y / 144 * 100}%;width:${tile.width / 324 * 100}%;height:${tile.height / 144 * 100}%;--item-color:${categories[item.id].color}`;
          node.dataset.key = `group:${item.id}`;
          node.title = `${item.label} \xB7 \u7EA6 ${formatTokens(item.tokens)} token \xB7 ${percent(item.tokens, used)}`;
          node.setAttribute("aria-label", node.title);
          node.append(element("span", "tile-name", item.label), element("span", "tile-value", formatTokens(item.tokens)));
          chart.append(node);
        }
        content.append(chart);
      } else {
        const list = element("div", "category-list");
        list.setAttribute("aria-label", "\u6309\u5360\u7528\u6392\u5E8F\u7684\u4E0A\u4E0B\u6587\u5206\u7C7B");
        for (const item of groups) {
          const row = button("", () => {
            selected = item.id;
            render();
          }, "category-row");
          row.dataset.key = `group:${item.id}`;
          row.style.setProperty("--item-color", categories[item.id].color);
          row.style.setProperty("--share", `${item.tokens / Math.max(1, used) * 100}%`);
          row.setAttribute("aria-label", `${item.label} \xB7 \u7EA6 ${formatTokens(item.tokens)} token \xB7 ${percent(item.tokens, used)}\uFF0C\u67E5\u770B\u6765\u6E90`);
          row.append(element("span", "swatch"), element("span", "row-name", item.label), element("span", "row-tokens", formatTokens(item.tokens)), element("span", "row-share muted", percent(item.tokens, used)), element("span", "chevron muted", "\u203A"));
          list.append(row);
        }
        content.append(list);
      }
      if (focused) ([...root.querySelectorAll("[data-key]")].find((node) => node.dataset.key === focused) ?? (selected ? back : listButton)).focus({ preventScroll: true });
      onLayout();
    }
    function unavailable(message) {
      snapshot = null;
      delete panel.dataset.measured;
      panel.dataset.view = "unavailable";
      summary.hidden = capacity.hidden = toolbar.hidden = footer.hidden = true;
      content.replaceChildren(element("div", "empty muted", message));
      onLayout();
    }
    return {
      host,
      root,
      panel,
      update(result) {
        if (result.status === "ready") {
          snapshot = result.snapshot;
          summary.hidden = toolbar.hidden = footer.hidden = false;
          render();
        } else unavailable(result.status === "missing" ? "\u6B64\u4F1A\u8BDD\u6682\u65E0\u672C\u5730\u8BB0\u5F55" : result.status === "too-large" ? "\u4F1A\u8BDD\u8BB0\u5F55\u8FC7\u5927\uFF0C\u6682\u65F6\u65E0\u6CD5\u5206\u6790" : "\u6682\u65F6\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5");
      },
      loading() {
        unavailable("\u6B63\u5728\u8BFB\u53D6\u4E0A\u4E0B\u6587\u2026");
      },
      focus() {
        close.focus({ preventScroll: true });
      },
      resize: render
    };
  }

  // src/injected/entry.ts
  function activate(context) {
    const original = /* @__PURE__ */ new Map();
    let view = null, anchor = null, sessionId = null;
    let opening, closing, reconcileTimer;
    let poll, controller = null, disposed = false, lastRead = 0, signature = "", keyboard = false, keyboardInput = false, restoringFocus = false;
    const currentSession = () => sessionFromUrl(window.location.href) ?? localSessionId(selectedThreadId());
    const cancelClose = () => {
      clearTimeout(closing);
      closing = void 0;
    };
    const close = (restoreFocus = false) => {
      clearTimeout(opening);
      opening = void 0;
      cancelClose();
      clearInterval(poll);
      poll = void 0;
      controller?.abort();
      controller = null;
      const target = anchor, focused = Boolean(view?.root.activeElement);
      view?.host.remove();
      view = null;
      sessionId = null;
      signature = "";
      keyboard = false;
      if (target) target.setAttribute("aria-expanded", "false");
      anchor = null;
      if (restoreFocus && focused && target?.isConnected) {
        restoringFocus = true;
        target.focus({ preventScroll: true });
        restoringFocus = false;
      }
    };
    const position = () => {
      if (!view || !anchor) return;
      const rect = anchor.getBoundingClientRect(), zoom = Number.parseFloat(window.getComputedStyle(view.host).zoom) || 1;
      view.panel.style.maxWidth = `${Math.max(0, window.innerWidth - 24) / zoom}px`;
      view.panel.style.maxHeight = `${Math.max(0, window.innerHeight - 24) / zoom}px`;
      const bounds = view.host.getBoundingClientRect();
      const left = Math.max(12, Math.min(rect.right - bounds.width, window.innerWidth - bounds.width - 12));
      const above = rect.top - bounds.height - 8, top = above >= 12 ? above : Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - bounds.height - 12));
      view.host.style.left = `${left / zoom}px`;
      view.host.style.top = `${top / zoom}px`;
    };
    const read = async () => {
      if (!view || !sessionId || controller || document.hidden) return;
      const target = view, id = sessionId, request = new AbortController();
      controller = request;
      lastRead = Date.now();
      try {
        const result = await context.rpc.call("context.read", { sessionId: id }, { signal: request.signal, timeoutMs: 3e4 });
        if (disposed || view !== target || sessionId !== id || request.signal.aborted) return;
        const next = JSON.stringify(result);
        if (signature !== next) {
          signature = next;
          target.update(result);
          position();
        }
      } catch {
        if (view === target && !request.signal.aborted) {
          target.update({ status: "unavailable" });
          position();
        }
      } finally {
        if (controller === request) controller = null;
      }
    };
    const scheduleClose = () => {
      clearTimeout(opening);
      opening = void 0;
      cancelClose();
      closing = setTimeout(() => {
        if (!keyboard || !view?.root.activeElement && document.activeElement !== anchor) close(true);
      }, 240);
    };
    const open = (target, fromKeyboard = false) => {
      const id = currentSession();
      if (!id || disposed || !target.isConnected) return;
      clearTimeout(opening);
      opening = void 0;
      cancelClose();
      if (anchor === target && sessionId === id && view) {
        if (fromKeyboard) {
          keyboard = true;
          view.focus();
        }
        return;
      }
      close();
      anchor = target;
      sessionId = id;
      keyboard = fromKeyboard;
      view = createPanel(() => close(true), position);
      view.loading();
      document.body.append(view.host);
      target.setAttribute("aria-expanded", "true");
      view.host.addEventListener("pointerenter", cancelClose);
      view.host.addEventListener("pointerleave", scheduleClose);
      view.host.addEventListener("focusout", scheduleClose);
      view.host.addEventListener("focusin", () => {
        keyboard = keyboardInput;
        cancelClose();
      });
      position();
      if (fromKeyboard) view.focus();
      void read();
      poll = setInterval(() => {
        if (!target.isConnected || currentSession() !== id || target.getBoundingClientRect().width === 0) {
          close();
          return;
        }
        if (Date.now() - lastRead >= 5e3) void read();
      }, 300);
    };
    const onOver = (event) => {
      const trigger = contextUsageTrigger(event.target);
      if (!trigger || !currentSession()) return;
      event.stopPropagation();
      cancelClose();
      if (anchor === trigger && view || opening) return;
      opening = setTimeout(() => open(trigger), 120);
    };
    const onMove = (event) => {
      if (contextUsageTrigger(event.target) && currentSession()) event.stopPropagation();
    };
    const onOut = (event) => {
      const trigger = contextUsageTrigger(event.target);
      if (!trigger || !currentSession()) return;
      const related = event.relatedTarget;
      if (related instanceof Node && trigger.contains(related)) return;
      scheduleClose();
    };
    const onKey = (event) => {
      if (["Tab", "Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) {
        keyboardInput = true;
        keyboard = true;
      }
      if (event.key === "Escape" && view) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      }
      const trigger = contextUsageTrigger(event.target);
      if (trigger && ["Enter", " ", "ArrowDown"].includes(event.key) && currentSession()) {
        event.preventDefault();
        event.stopPropagation();
        open(trigger, true);
      }
    };
    const onFocus = (event) => {
      const trigger = contextUsageTrigger(event.target);
      if (trigger && currentSession()) {
        event.stopPropagation();
        if (!restoringFocus) {
          open(trigger);
          keyboard = keyboardInput;
        }
      }
    };
    const onBlur = (event) => {
      if (contextUsageTrigger(event.target)) scheduleClose();
    };
    const onDown = (event) => {
      keyboardInput = false;
      keyboard = false;
      if (view && !event.composedPath().includes(view.host) && !contextUsageTrigger(event.target)) close();
    };
    const restore = (node) => {
      const state = original.get(node);
      if (!state) return;
      for (const [attribute, value] of [["tabindex", state.tabIndex], ["aria-haspopup", state.popup], ["aria-expanded", state.expanded], ["aria-controls", state.controls]]) {
        if (value === null) node.removeAttribute(attribute);
        else node.setAttribute(attribute, value);
      }
      original.delete(node);
    };
    const reconcile = () => {
      reconcileTimer = void 0;
      for (const node of original.keys()) if (!node.isConnected || !contextUsageTrigger(node)) restore(node);
      for (const node of contextUsageTriggers(document)) {
        if (original.has(node)) continue;
        original.set(node, { tabIndex: node.getAttribute("tabindex"), popup: node.getAttribute("aria-haspopup"), expanded: node.getAttribute("aria-expanded"), controls: node.getAttribute("aria-controls") });
        node.tabIndex = 0;
        node.setAttribute("aria-haspopup", "dialog");
        node.setAttribute("aria-expanded", "false");
        node.setAttribute("aria-controls", "orbit-context-panel");
      }
    };
    const observer = new MutationObserver(() => {
      if (!reconcileTimer) reconcileTimer = setTimeout(reconcile, 100);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
    const listeners = [["pointerover", onOver], ["mouseover", onOver], ["pointermove", onMove], ["pointerout", onOut], ["mouseout", onOut], ["keydown", onKey], ["focusin", onFocus], ["focusout", onBlur], ["pointerdown", onDown]];
    for (const [type, listener] of listeners) document.addEventListener(type, listener, true);
    const onResize = () => {
      view?.resize();
      position();
    };
    const onScroll = (event) => {
      if (view && !event.composedPath().includes(view.host)) position();
    };
    window.addEventListener("resize", onResize);
    document.addEventListener("scroll", onScroll, true);
    reconcile();
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      close(true);
      observer.disconnect();
      clearTimeout(reconcileTimer);
      for (const [type, listener] of listeners) document.removeEventListener(type, listener, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("scroll", onScroll, true);
      for (const node of original.keys()) restore(node);
    };
    context.onDispose(dispose);
    return { dispose, status: () => ({ version: RUNTIME_VERSION, anchors: original.size, sessionResolved: Boolean(currentSession()), visible: Boolean(view), loading: Boolean(controller) }) };
  }
  return __toCommonJS(entry_exports);
})();
