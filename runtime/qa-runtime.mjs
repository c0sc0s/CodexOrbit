import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

async function command(target, method, params = {}) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  try {
    return await new Promise((resolve, reject) => {
      socket.addEventListener("message", (event) => {
        const message = JSON.parse(event.data);
        if (message.id !== 1) return;
        if (message.error) reject(new Error(message.error.message));
        else if (message.result?.exceptionDetails) reject(new Error(message.result.exceptionDetails.exception?.description ?? message.result.exceptionDetails.text));
        else resolve(message.result);
      });
      socket.send(JSON.stringify({ id: 1, method, params }));
    });
  } finally { socket.close(); }
}

async function evaluate(target, expression) {
  const result = await command(target, "Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  return result.result?.value;
}

const targets = (await (await fetch("http://127.0.0.1:9341/json/list")).json())
  .filter((target) => target.type === "page" && target.url.startsWith("app://-"));
let selected = null;
for (const target of targets) {
  if (await evaluate(target, "Boolean(document.getElementById('codex-sidebar-tags-toolbar'))")) { selected = target; break; }
}
assert.ok(selected, "找不到已注入的侧栏导航器");

const opened = await evaluate(selected, `(() => {
  document.querySelector(".codex-sidebar-dashboard-launcher")?.click();
  const dialog = document.querySelector(".codex-sidebar-dashboard-dialog");
  const plugins = [...document.querySelectorAll("button")].find((item) => item.textContent?.trim() === "Plugins");
  const kanban = document.querySelector(".codex-sidebar-dashboard-launcher");
  return { dialog: Boolean(dialog), role: dialog?.getAttribute("role"), label: kanban?.textContent?.trim(), afterPlugins: plugins?.parentElement?.nextElementSibling?.contains(kanban) ?? false };
})()`);
assert.deepEqual(opened, { dialog: true, role: "dialog", label: "Tags", afterPlugins: true });

const collapseRetention = await evaluate(selected, `(async () => {
  const wait = () => new Promise((resolve) => setTimeout(resolve, 500));
  const count = () => {
    if (!document.querySelector(".codex-sidebar-dashboard-overlay")) document.querySelector(".codex-sidebar-dashboard-launcher")?.click();
    const all = [...document.querySelectorAll(".codex-sidebar-filter-chip")].find((item) => item.firstChild?.textContent === "全部");
    return Number(all?.querySelector(".codex-sidebar-filter-count")?.textContent);
  };
  const pinned = [...document.querySelectorAll("[data-app-action-sidebar-section-toggle]")].find((item) => item.textContent?.trim() === "Pinned");
  const targetEntry = window.__codexSidebarTags.debugIndex().find((item) => item.title.includes("Codex 会话标签"));
  const project = [...document.querySelectorAll("[data-app-action-sidebar-project-row]")].find((item) => item.getAttribute("data-app-action-sidebar-project-id") === targetEntry?.projectId);
  if (!document.querySelector("[data-app-action-sidebar-thread-pinned='true']")) pinned?.click();
  if (project?.getAttribute("data-app-action-sidebar-project-collapsed") === "true") project.click();
  await wait();
  const baseline = { indexed: window.__codexSidebarTags.status().indexed, count: count() };
  pinned?.click(); await wait();
  const pinnedCollapsed = { indexed: window.__codexSidebarTags.status().indexed, count: count() };
  if (!document.querySelector("[data-app-action-sidebar-thread-pinned='true']")) pinned?.click();
  await wait(); project?.click(); await wait();
  const projectCollapsed = { indexed: window.__codexSidebarTags.status().indexed, count: count() };
  if (!document.querySelector(".codex-sidebar-dashboard-overlay")) document.querySelector(".codex-sidebar-dashboard-launcher")?.click();
  const input = document.querySelector(".codex-sidebar-search-input");
  input.value = "Codex 会话标签";
  input.dispatchEvent(new InputEvent("input", { bubbles: true, data: input.value }));
  document.querySelector(".codex-sidebar-result")?.click();
  await new Promise((resolve) => setTimeout(resolve, 2600));
  const currentProject = [...document.querySelectorAll("[data-app-action-sidebar-project-row]")].find((item) => item.getAttribute("data-app-action-sidebar-project-id") === targetEntry?.projectId);
  return { baseline, pinnedCollapsed, projectCollapsed, projectExpanded: currentProject?.getAttribute("data-app-action-sidebar-project-collapsed") !== "true", modalClosed: !document.querySelector(".codex-sidebar-dashboard-overlay") };
})()`);
assert.ok(collapseRetention.baseline.indexed > 0);
assert.equal(collapseRetention.baseline.indexed, collapseRetention.baseline.count);
assert.deepEqual(collapseRetention.pinnedCollapsed, collapseRetention.baseline);
assert.deepEqual(collapseRetention.projectCollapsed, collapseRetention.baseline);
assert.equal(collapseRetention.projectExpanded, true);
assert.equal(collapseRetention.modalClosed, true);

const layout = await evaluate(selected, `(() => {
  const host = document.getElementById("codex-sidebar-tags-toolbar");
  const before = host.getBoundingClientRect().height;
  document.querySelector(".codex-sidebar-dashboard-launcher")?.click();
  return { before, after: host.getBoundingClientRect().height, position: getComputedStyle(document.querySelector(".codex-sidebar-dashboard-overlay")).position };
})()`);
assert.ok(Math.abs(layout.after - layout.before) < 0.5);
assert.equal(layout.position, "fixed");

const typography = await evaluate(selected, `(() => {
  return {
    heading: parseFloat(getComputedStyle(document.querySelector(".codex-sidebar-dashboard-heading")).fontSize),
    search: parseFloat(getComputedStyle(document.querySelector(".codex-sidebar-search-input")).fontSize),
    filter: parseFloat(getComputedStyle(document.querySelector(".codex-sidebar-filter-chip")).fontSize),
    title: parseFloat(getComputedStyle(document.querySelector(".codex-sidebar-result-title")).fontSize),
  };
})()`);
assert.deepEqual(typography, { heading: 17, search: 14, filter: 12, title: 13 });

const interaction = await evaluate(selected, `(async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const titleNode = document.querySelector("[data-thread-title][data-codex-sidebar-tags-raw]");
  const original = titleNode.getAttribute("data-codex-sidebar-tags-raw");
  const stress = async (control) => {
    control.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 1 }));
    const before = window.__codexSidebarTags.status().renderCount;
    titleNode.setAttribute("data-codex-sidebar-tags-raw", original + " · pending");
    titleNode.appendChild(Object.assign(document.createElement("span"), { hidden: true }));
    await wait(50);
    const result = { connected: control.isConnected, delta: window.__codexSidebarTags.status().renderCount - before };
    titleNode.setAttribute("data-codex-sidebar-tags-raw", original);
    control.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 1 }));
    return result;
  };
  const chip = [...document.querySelectorAll(".codex-sidebar-filter-chip")].find((item) => item.firstChild?.textContent === "需求");
  const chipResult = await stress(chip);
  chip.click(); await wait(20);
  const selectedTag = document.querySelector(".codex-sidebar-filter-chip[aria-pressed='true']")?.firstChild?.textContent;
  document.querySelector(".codex-sidebar-filter-chip[aria-pressed='true']")?.click();
  const sort = document.querySelector(".codex-sidebar-sort-trigger");
  sort.focus();
  const sortResult = await stress(sort); await wait(20);
  return { chipResult, sortResult, selectedTag, focused: document.activeElement?.classList.contains("codex-sidebar-sort-trigger") === true, modal: Boolean(document.querySelector(".codex-sidebar-dashboard-overlay")), deferred: window.__codexSidebarTags.debug().some((item) => item.event === "render-deferred") };
})()`);
assert.deepEqual(interaction.chipResult, { connected: true, delta: 0 });
assert.deepEqual(interaction.sortResult, { connected: true, delta: 0 });
assert.equal(interaction.selectedTag, "需求");
assert.equal(interaction.focused, true);
assert.equal(interaction.modal, true);
assert.equal(interaction.deferred, true);

const chineseInput = await evaluate(selected, `(() => {
  const chip = [...document.querySelectorAll(".codex-sidebar-filter-chip")].find((item) => item.firstChild?.textContent === "调研");
  const expected = Number(chip?.title.match(/\\d+/)?.[0]);
  const input = document.querySelector(".codex-sidebar-search-input");
  input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
  input.value = "调研";
  input.dispatchEvent(new InputEvent("input", { bubbles: true, data: input.value, isComposing: true }));
  const preserved = input.isConnected;
  input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: input.value }));
  return { expected, actual: document.querySelectorAll(".codex-sidebar-result").length, preserved };
})()`);
assert.ok(chineseInput.actual >= chineseInput.expected);
assert.equal(chineseInput.preserved, true);

const sessionFeatures = await evaluate(selected, `(() => {
  const input = document.querySelector(".codex-sidebar-search-input");
  input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector(".codex-sidebar-sort-trigger").click();
  const menu = document.querySelector(".codex-sidebar-sort-menu");
  const menuStyle = getComputedStyle(menu);
  const menuBackground = menuStyle.backgroundColor;
  const menuColor = menuStyle.color;
  const options = [...menu.querySelectorAll(".codex-sidebar-sort-option")].map((item) => item.firstChild.textContent);
  menu.querySelector("[data-value='tag']").click();
  const groups = document.querySelectorAll(".codex-sidebar-result-group").length;
  document.querySelector(".codex-sidebar-sort-trigger").click();
  document.querySelector(".codex-sidebar-sort-option[data-value='sidebar']").click();
  const search = document.querySelector(".codex-sidebar-search-input");
  search.value = "Passport"; search.dispatchEvent(new Event("input", { bubbles: true }));
  return { options, groups, menuBackground, menuColor, titles: [...document.querySelectorAll(".codex-sidebar-result-title")].map((item) => item.textContent) };
})()`);
assert.deepEqual(sessionFeatures.options, ["默认", "日期↓", "标签", "标题"]);
assert.ok(sessionFeatures.groups > 0);
assert.notEqual(sessionFeatures.menuBackground, "rgb(255, 255, 255)");
assert.notEqual(sessionFeatures.menuColor, sessionFeatures.menuBackground);
assert.ok(sessionFeatures.titles.includes("修复 App Passport 重试验签"));

const contentSearch = await evaluate(selected, `(async () => {
  const input = document.querySelector(".codex-sidebar-search-input");
  input.value = "按钮做的也太丑了";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  for (let attempt = 0; window.__codexSidebarTags.status().searchLoading && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return {
    count: document.querySelectorAll(".codex-sidebar-result").length,
    snippets: [...document.querySelectorAll(".codex-sidebar-result-snippet")].map((item) => item.textContent),
    snippetFont: parseFloat(getComputedStyle(document.querySelector(".codex-sidebar-result-snippet")).fontSize),
    status: window.__codexSidebarTags.status(),
  };
})()`);
assert.equal(contentSearch.status.searchLoading, false);
assert.equal(contentSearch.status.searchIndexStatus.phase, "ready");
assert.ok(contentSearch.count > 0);
assert.ok(contentSearch.snippets.some((text) => text.includes("按钮做的也太丑了")));
assert.equal(contentSearch.snippetFont, 11);

const highlightedSearch = await evaluate(selected, `(async () => {
  const input = document.querySelector(".codex-sidebar-search-input");
  input.value = "高价值";
  input.dispatchEvent(new Event("input", { bubbles: true }));
  for (let attempt = 0; window.__codexSidebarTags.status().searchLoading && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return {
    count: document.querySelectorAll(".codex-sidebar-result").length,
    titleMarks: [...document.querySelectorAll(".codex-sidebar-result-title .codex-sidebar-search-mark")].map((item) => item.textContent),
    snippetMarks: [...document.querySelectorAll(".codex-sidebar-result-snippet .codex-sidebar-search-mark")].map((item) => item.textContent),
  };
})()`);
assert.ok(highlightedSearch.count > 0);
assert.ok(highlightedSearch.titleMarks.includes("高价值"));
assert.ok(highlightedSearch.snippetMarks.includes("高价值"));

const outputDir = join(homedir(), "Library", "Application Support", "Codex Sidebar Tags", "previews");
await mkdir(outputDir, { recursive: true });
const highlightPath = join(outputDir, "sidebar-v3-highlight.png");
const highlightShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(highlightPath, Buffer.from(highlightShot.data, "base64"));
await evaluate(selected, `(() => { document.querySelector(".codex-sidebar-sort-trigger")?.click(); return Boolean(document.querySelector(".codex-sidebar-sort-menu")); })()`);
const sortMenuPath = join(outputDir, "sidebar-v3-sort-menu.png");
const sortMenuShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(sortMenuPath, Buffer.from(sortMenuShot.data, "base64"));
await evaluate(selected, `(() => { const trigger = document.querySelector(".codex-sidebar-sort-trigger"); trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return !document.querySelector(".codex-sidebar-sort-menu"); })()`);
const dashboardPath = join(outputDir, "sidebar-v3-dashboard.png");
const dashboardShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(dashboardPath, Buffer.from(dashboardShot.data, "base64"));

const tagSettings = await evaluate(selected, `(() => {
  document.querySelectorAll(".codex-sidebar-dashboard-tab")[1]?.click();
  const before = document.querySelectorAll(".codex-sidebar-tag-config-row").length;
  const input = document.querySelector(".codex-sidebar-tag-input");
  input.value = "QA临时标签";
  document.querySelector(".codex-sidebar-tag-tone").value = "green";
  document.querySelector(".codex-sidebar-tag-form").requestSubmit();
  const added = [...document.querySelectorAll(".codex-sidebar-tag-config-row")].find((item) => item.querySelector(".codex-sidebar-result-tag")?.textContent === "QA临时标签");
  const afterAdd = document.querySelectorAll(".codex-sidebar-tag-config-row").length;
  added?.querySelector(".codex-sidebar-tag-delete")?.click();
  return { before, afterAdd, afterDelete: document.querySelectorAll(".codex-sidebar-tag-config-row").length };
})()`);
assert.equal(tagSettings.afterAdd, tagSettings.before + 1);
assert.equal(tagSettings.afterDelete, tagSettings.before);
const settingsPath = join(outputDir, "sidebar-v3-settings.png");
const settingsShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(settingsPath, Buffer.from(settingsShot.data, "base64"));

const cleared = await evaluate(selected, `(async () => {
  document.querySelectorAll(".codex-sidebar-dashboard-tab")[0]?.click();
  const sort = document.querySelector(".codex-sidebar-sort-trigger");
  sort.click();
  document.querySelector(".codex-sidebar-sort-option[data-value='sidebar']")?.click();
  document.querySelector(".codex-sidebar-dashboard-close")?.click();
  for (let attempt = 0; document.querySelector(".codex-sidebar-dashboard-overlay") && attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return { modal: Boolean(document.querySelector(".codex-sidebar-dashboard-overlay")), results: window.__codexSidebarTags.status().visibleResults };
})()`);
assert.deepEqual(cleared, { modal: false, results: 0 });

const scroll = await evaluate(selected, `(async () => {
  const host = document.getElementById("codex-sidebar-tags-toolbar");
  let scroller = host.parentElement;
  while (scroller && scroller !== document.body) {
    const overflow = getComputedStyle(scroller).overflowY;
    if (["auto", "scroll"].includes(overflow) && scroller.scrollHeight > scroller.clientHeight) break;
    scroller = scroller.parentElement;
  }
  if (!scroller || scroller === document.body) return { available: false };
  scroller.scrollTop = Math.min(180, scroller.scrollHeight - scroller.clientHeight);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const before = scroller.scrollTop;
  const renders = window.__codexSidebarTags.status().renderCount;
  document.body.appendChild(Object.assign(document.createElement("span"), { hidden: true })).remove();
  await new Promise((resolve) => setTimeout(resolve, 150));
  return { available: true, before, after: scroller.scrollTop, delta: window.__codexSidebarTags.status().renderCount - renders };
})()`);
assert.equal(scroll.available, true);
assert.ok(Math.abs(scroll.after - scroll.before) < 1);
assert.equal(scroll.delta, 0);

console.log(JSON.stringify({ opened, collapseRetention, layout, typography, interaction, chineseInput, sessionFeatures, contentSearch, highlightedSearch, tagSettings, cleared, scroll, highlightPath, sortMenuPath, dashboardPath, settingsPath }, null, 2));
