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

const outputDir = join(homedir(), "Library", "Application Support", "Codex Sidebar Tags", "previews");
await mkdir(outputDir, { recursive: true });

const sidebarFilter = await evaluate(selected, `(() => {
  const host = document.getElementById("codex-sidebar-tags-filter-bar");
  const pinned = [...document.querySelectorAll("[data-app-action-sidebar-section-toggle]")]
    .find((item) => ["Pinned", "置顶", "已置顶"].includes(item.textContent?.trim()));
  const heading = host?.querySelector(".codex-sidebar-tags-section-heading");
  const rail = host?.querySelector(".codex-sidebar-quick-filter-rail");
  const connectedTag = document.querySelector("[data-thread-title][data-codex-sidebar-tags-raw] .codex-sidebar-tag-chip")?.textContent;
  const filter = [...document.querySelectorAll(".codex-sidebar-quick-filter")]
    .find((item) => item.dataset.value === connectedTag);
  const headingStyle = heading ? getComputedStyle(heading) : null;
  const pinnedStyle = pinned ? getComputedStyle(pinned) : null;
  const typographyMatches = ["color", "fontFamily", "fontSize", "fontStyle", "fontWeight", "letterSpacing", "lineHeight"]
    .every((property) => headingStyle?.[property] === pinnedStyle?.[property]);
  if (rail) rail.scrollLeft = rail.scrollWidth;
  filter?.focus();
  const scrollBefore = rail?.scrollLeft ?? 0;
  const idleColor = filter ? getComputedStyle(filter).color : null;
  filter?.click();
  const rows = [...document.querySelectorAll("[data-app-action-sidebar-thread-row]")];
  const selectedButton = document.querySelector(".codex-sidebar-quick-filter[aria-pressed='true']");
  const visibleRows = rows.filter((row) => row.getAttribute("data-codex-sidebar-tags-filtered") !== "true");
  const filteredState = {
    selected: window.__codexSidebarTags.status().activeTag,
    hidden: rows.filter((row) => row.getAttribute("data-codex-sidebar-tags-filtered") === "true").length,
    mismatchedVisible: rows.filter((row) => row.getAttribute("data-codex-sidebar-tags-filtered") !== "true")
      .filter((row) => row.querySelector(".codex-sidebar-tag-chip")?.textContent !== connectedTag).length,
    focused: document.activeElement?.dataset.value === connectedTag,
    scrollPreserved: !rail || scrollBefore === 0 || Math.abs((document.querySelector(".codex-sidebar-quick-filter-rail")?.scrollLeft ?? 0) - scrollBefore) < 1,
    activeAttribute: document.documentElement.getAttribute("data-codex-sidebar-tags-filter-active"),
    repeatedLabelsHidden: visibleRows.every((row) => {
      const chip = row.querySelector(".codex-sidebar-tag-chip");
      return !chip || getComputedStyle(chip).display === "none";
    }),
    selectedColorChanged: Boolean(selectedButton && idleColor && getComputedStyle(selectedButton).color !== idleColor),
    selectedBackground: selectedButton ? getComputedStyle(selectedButton).backgroundColor : null,
  };
  selectedButton?.click();
  document.activeElement?.blur();
  return {
    exists: Boolean(host),
    heading: heading?.textContent,
    beforePinned: host?.nextElementSibling?.contains(pinned) === true,
    typographyMatches,
    filteredState,
    reset: {
      selected: window.__codexSidebarTags.status().activeTag,
      hidden: document.querySelectorAll("[data-codex-sidebar-tags-filtered='true']").length,
      activeAttribute: document.documentElement.hasAttribute("data-codex-sidebar-tags-filter-active"),
      visibleLabels: [...document.querySelectorAll(".codex-sidebar-tag-chip")].filter((chip) => getComputedStyle(chip).display !== "none").length,
    },
  };
})()`);
assert.equal(sidebarFilter.exists, true);
assert.equal(sidebarFilter.heading, "Tags");
assert.equal(sidebarFilter.beforePinned, true);
assert.equal(sidebarFilter.typographyMatches, true);
assert.ok(sidebarFilter.filteredState.hidden > 0);
assert.equal(sidebarFilter.filteredState.mismatchedVisible, 0);
assert.equal(sidebarFilter.filteredState.focused, true);
assert.equal(sidebarFilter.filteredState.scrollPreserved, true);
assert.equal(sidebarFilter.filteredState.activeAttribute, "true");
assert.equal(sidebarFilter.filteredState.repeatedLabelsHidden, true);
assert.equal(sidebarFilter.filteredState.selectedColorChanged, true);
assert.notEqual(sidebarFilter.filteredState.selectedBackground, "rgba(0, 0, 0, 0)");
assert.equal(sidebarFilter.reset.selected, "all");
assert.equal(sidebarFilter.reset.hidden, 0);
assert.equal(sidebarFilter.reset.activeAttribute, false);
assert.ok(sidebarFilter.reset.visibleLabels > 0);
const sidebarPath = join(outputDir, "sidebar-filter.png");
const sidebarShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(sidebarPath, Buffer.from(sidebarShot.data, "base64"));

const opened = await evaluate(selected, `(() => {
  document.querySelector(".codex-sidebar-dashboard-launcher")?.click();
  const dialog = document.querySelector(".codex-sidebar-dashboard-dialog");
  const plugins = [...document.querySelectorAll("button")].find((item) => ["Plugins", "插件"].includes(item.textContent?.trim()));
  const kanban = document.querySelector(".codex-sidebar-dashboard-launcher");
  const icon = kanban?.querySelector("svg");
  return {
    dialog: Boolean(dialog),
    role: dialog?.getAttribute("role"),
    label: kanban?.textContent?.trim(),
    afterPlugins: plugins?.parentElement?.nextElementSibling?.contains(kanban) ?? false,
    icon: { paths: icon?.querySelectorAll("path").length ?? 0, apertures: icon?.querySelectorAll("circle").length ?? 0, legacyTiles: icon?.querySelectorAll("rect").length ?? 0 },
  };
})()`);
assert.deepEqual(opened, { dialog: true, role: "dialog", label: "Tags", afterPlugins: true, icon: { paths: 1, apertures: 1, legacyTiles: 0 } });

const localization = await evaluate(selected, `(async () => {
  const root = document.documentElement;
  const originalLanguage = root.lang;
  const snapshot = () => ({
    locale: window.__codexSidebarTags.status().locale,
    heading: document.querySelector(".codex-sidebar-dashboard-heading")?.textContent,
    placeholder: document.querySelector(".codex-sidebar-search-input")?.placeholder,
    sort: document.querySelector(".codex-sidebar-sort-label")?.textContent,
    all: document.querySelector(".codex-sidebar-filter-chip[data-value='all']")?.firstChild?.textContent,
    launcherLabel: document.querySelector(".codex-sidebar-dashboard-launcher")?.getAttribute("aria-label"),
  });
  const setLanguage = async (language) => {
    root.lang = language;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return snapshot();
  };
  const chinese = await setLanguage("zh-CN");
  const english = await setLanguage("en-US");
  const restored = await setLanguage(originalLanguage);
  return { originalLanguage, chinese, english, restored };
})()`);
assert.deepEqual(localization.chinese, {
  locale: "zh-CN",
  heading: "会话看板",
  placeholder: "搜索会话名称或内容…",
  sort: "排序",
  all: "全部",
  launcherLabel: "打开 Tags",
});
assert.deepEqual(localization.english, {
  locale: "en-US",
  heading: "Sessions",
  placeholder: "Search session titles or content…",
  sort: "Sort",
  all: "All",
  launcherLabel: "Open Tags",
});
assert.equal(localization.restored.locale, localization.originalLanguage.toLocaleLowerCase().startsWith("zh") ? "zh-CN" : "en-US");

const collapseRetention = await evaluate(selected, `(async () => {
  const wait = () => new Promise((resolve) => setTimeout(resolve, 500));
  const count = () => {
    if (!document.querySelector(".codex-sidebar-dashboard-overlay")) document.querySelector(".codex-sidebar-dashboard-launcher")?.click();
    const all = document.querySelector(".codex-sidebar-filter-chip[data-value='all']");
    return Number(all?.querySelector(".codex-sidebar-filter-count")?.textContent);
  };
  const pinned = [...document.querySelectorAll("[data-app-action-sidebar-section-toggle]")].find((item) => ["Pinned", "置顶", "已置顶"].includes(item.textContent?.trim()));
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
    await wait(0);
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
  return { chipResult, sortResult, selectedTag, focused: document.activeElement?.classList.contains("codex-sidebar-sort-trigger") === true, modal: Boolean(document.querySelector(".codex-sidebar-dashboard-overlay")) };
})()`);
assert.equal(interaction.chipResult.connected, true);
assert.equal(interaction.sortResult.connected, true);
assert.equal(interaction.selectedTag, "需求");
assert.equal(interaction.focused, true);
assert.equal(interaction.modal, true);

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
const expectedSortOptions = localization.restored.locale === "zh-CN"
  ? ["默认", "日期↓", "标签", "标题"]
  : ["Default", "Newest", "Tag", "Title"];
assert.deepEqual(sessionFeatures.options, expectedSortOptions);
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

const highlightPath = join(outputDir, "sidebar-search-highlight.png");
const highlightShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(highlightPath, Buffer.from(highlightShot.data, "base64"));
await evaluate(selected, `(() => { document.querySelector(".codex-sidebar-sort-trigger")?.click(); return Boolean(document.querySelector(".codex-sidebar-sort-menu")); })()`);
const sortMenuPath = join(outputDir, "sidebar-sort-menu.png");
const sortMenuShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(sortMenuPath, Buffer.from(sortMenuShot.data, "base64"));
await evaluate(selected, `(() => { const trigger = document.querySelector(".codex-sidebar-sort-trigger"); trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return !document.querySelector(".codex-sidebar-sort-menu"); })()`);
const dashboardPath = join(outputDir, "sidebar-dashboard.png");
const dashboardShot = await command(selected, "Page.captureScreenshot", { format: "png", fromSurface: true });
await writeFile(dashboardPath, Buffer.from(dashboardShot.data, "base64"));

const tagSettings = await evaluate(selected, `(() => {
  document.querySelectorAll(".codex-sidebar-dashboard-tab")[1]?.click();
  const before = document.querySelectorAll(".codex-sidebar-tag-config-row").length;
  const input = document.querySelector(".codex-sidebar-tag-input");
  input.value = "QA临时标签";
  const description = document.querySelector(".codex-sidebar-tag-description");
  description.value = "需要人工复核的测试会话";
  const color = document.querySelector(".codex-sidebar-tag-color-custom");
  color.value = "#123456";
  color.dispatchEvent(new Event("input", { bubbles: true }));
  document.querySelector(".codex-sidebar-tag-form").requestSubmit();
  const added = [...document.querySelectorAll(".codex-sidebar-tag-config-row")].find((item) => item.querySelector(".codex-sidebar-tag-config-name")?.textContent === "QA临时标签");
  const afterAdd = document.querySelectorAll(".codex-sidebar-tag-config-row").length;
  const definition = window.__codexSidebarTags.tagDefinitions().find((item) => item.name === "QA临时标签");
  const swatchColor = getComputedStyle(added?.querySelector(".codex-sidebar-tag-config-swatch")).backgroundColor;
  added?.querySelector(".codex-sidebar-tag-delete")?.click();
  const form = document.querySelector(".codex-sidebar-tag-form");
  const currentDescription = document.querySelector(".codex-sidebar-tag-description");
  const firstRow = document.querySelector(".codex-sidebar-tag-config-row");
  return {
    before,
    afterAdd,
    afterDelete: document.querySelectorAll(".codex-sidebar-tag-config-row").length,
    presets: document.querySelectorAll(".codex-sidebar-tag-color-preset").length,
    hasColorPicker: color?.type === "color",
    definition,
    swatchColor,
    descriptionElement: currentDescription?.tagName,
    descriptionHeight: currentDescription?.getBoundingClientRect().height,
    formHeight: form?.getBoundingClientRect().height,
    rowHeight: firstRow?.getBoundingClientRect().height,
    headerText: document.querySelector(".codex-sidebar-tag-config-header")?.textContent,
    customControlText: document.querySelector(".codex-sidebar-tag-color-custom-control")?.textContent,
    hasRawColorValue: Boolean(document.querySelector(".codex-sidebar-tag-color-value")),
  };
})()`);
assert.equal(tagSettings.afterAdd, tagSettings.before + 1);
assert.equal(tagSettings.afterDelete, tagSettings.before);
assert.equal(tagSettings.presets, 6);
assert.equal(tagSettings.hasColorPicker, true);
assert.deepEqual(tagSettings.definition, { name: "QA临时标签", color: "#123456", description: "需要人工复核的测试会话" });
assert.equal(tagSettings.swatchColor, "rgb(18, 52, 86)");
assert.equal(tagSettings.descriptionElement, "INPUT");
assert.equal(tagSettings.descriptionHeight, 34);
assert.ok(tagSettings.formHeight < 110);
assert.equal(tagSettings.rowHeight, 40);
assert.match(tagSettings.headerText, localization.restored.locale === "zh-CN" ? /^标签 · \d+分类描述$/u : /^Tags · \d+Classification description$/u);
assert.equal(tagSettings.customControlText, localization.restored.locale === "zh-CN" ? "自定义" : "Custom");
assert.equal(tagSettings.hasRawColorValue, false);
const settingsPath = join(outputDir, "sidebar-settings.png");
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
    if (["auto", "scroll"].includes(overflow)) break;
    scroller = scroller.parentElement;
  }
  if (!scroller || scroller === document.body) return { available: false };
  const originalScrollTop = scroller.scrollTop;
  const spacer = document.createElement("div");
  spacer.style.cssText = "height: " + scroller.clientHeight + "px; flex: 0 0 auto; opacity: 0; pointer-events: none;";
  scroller.appendChild(spacer);
  try {
    scroller.scrollTop = Math.min(180, scroller.scrollHeight - scroller.clientHeight);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const before = scroller.scrollTop;
    const renders = window.__codexSidebarTags.status().renderCount;
    document.body.appendChild(Object.assign(document.createElement("span"), { hidden: true })).remove();
    await new Promise((resolve) => setTimeout(resolve, 150));
    return { available: true, before, after: scroller.scrollTop, delta: window.__codexSidebarTags.status().renderCount - renders };
  } finally {
    spacer.remove();
    scroller.scrollTop = originalScrollTop;
  }
})()`);
assert.equal(scroll.available, true);
assert.ok(Math.abs(scroll.after - scroll.before) < 1);
assert.equal(scroll.delta, 0);

console.log(JSON.stringify({ sidebarFilter, opened, localization, collapseRetention, layout, typography, interaction, chineseInput, sessionFeatures, contentSearch, highlightedSearch, tagSettings, cleared, scroll, sidebarPath, highlightPath, sortMenuPath, dashboardPath, settingsPath }, null, 2));
