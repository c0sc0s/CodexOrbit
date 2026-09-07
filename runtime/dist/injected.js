"use strict";
var CodexTagsInjected = (() => {
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

  // runtime/src/injected/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    installRuntime: () => installRuntime
  });

  // runtime/src/tag-settings.mjs
  var TAG_COLOR_PRESETS = Object.freeze([
    { name: "\u6D77\u84DD", color: "#4f8fd7" },
    { name: "\u9E22\u7D2B", color: "#956ad1" },
    { name: "\u73CA\u745A", color: "#d95c5c" },
    { name: "\u7425\u73C0", color: "#c98b28" },
    { name: "\u677E\u7EFF", color: "#3f9a6b" },
    { name: "\u96FE\u7070", color: "#7c8798" }
  ]);
  var PRESET_COLORS = Object.fromEntries(TAG_COLOR_PRESETS.map(({ name, color }) => [name, color]));
  var LEGACY_TONE_COLORS = Object.freeze({
    amber: PRESET_COLORS["\u7425\u73C0"],
    blue: PRESET_COLORS["\u6D77\u84DD"],
    red: PRESET_COLORS["\u73CA\u745A"],
    purple: PRESET_COLORS["\u9E22\u7D2B"],
    green: PRESET_COLORS["\u677E\u7EFF"],
    neutral: PRESET_COLORS["\u96FE\u7070"]
  });
  var DEFAULT_TAG_DEFINITIONS = Object.freeze([
    { name: "Feature", color: PRESET_COLORS["\u6D77\u84DD"], description: "Build or extend functionality. Use when the main goal is to implement a new capability or improve existing behavior, rather than fix a defect." },
    { name: "Bug", color: PRESET_COLORS["\u73CA\u745A"], description: "Diagnose and fix incorrect behavior, errors, or regressions. Use when the goal is to restore expected behavior, including investigation needed for the fix." },
    { name: "Design", color: PRESET_COLORS["\u9E22\u7D2B"], description: "Define how a solution should look or work: UI, interactions, architecture, or technical plans. Use when the main deliverable is a design or specification." },
    { name: "Research", color: PRESET_COLORS["\u677E\u7EFF"], description: "Explore a topic, understand existing code, compare options, or assess feasibility. Use when the main deliverable is findings or an explanation, rather than a design or implementation." }
  ]);
  function normalizeColor(value, legacyTone, fallbackColor) {
    if (typeof value === "string" && /^#[0-9a-f]{6}$/iu.test(value.trim())) return value.trim().toLocaleLowerCase();
    return LEGACY_TONE_COLORS[legacyTone] ?? fallbackColor ?? LEGACY_TONE_COLORS.neutral;
  }
  function normalizeDescription(value, fallbackDescription = "") {
    if (typeof value !== "string") return fallbackDescription;
    return value.replace(/\s+/gu, " ").trim().slice(0, 240);
  }
  function normalizeTagDefinitions(value, fallback = DEFAULT_TAG_DEFINITIONS) {
    if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
    const defaultsByName = new Map(fallback.map((item) => [item.name.toLocaleLowerCase(), item]));
    const seen = /* @__PURE__ */ new Set();
    const definitions = [];
    for (const item of value) {
      const name = typeof item?.name === "string" ? item.name.trim() : "";
      const key = name.toLocaleLowerCase();
      if (!name || name.length > 32 || /[\[\]【】\r\n]/u.test(name) || seen.has(key)) continue;
      const defaultDefinition = defaultsByName.get(key);
      seen.add(key);
      definitions.push({
        name,
        color: normalizeColor(item?.color, item?.tone, defaultDefinition?.color),
        description: normalizeDescription(item?.description, defaultDefinition?.description)
      });
      if (definitions.length >= 32) break;
    }
    return definitions;
  }

  // runtime/src/title-format.mjs
  var MAX_TAG_LENGTH = 32;
  var MAX_TIME_LENGTH = 32;
  var BRACKETED_TITLE = /^(?:\[([^\]\r\n]{1,32})\]|【([^】\r\n]{1,32})】)(?:(?:\[([^\]\r\n]{1,32})\]|【([^】\r\n]{1,32})】))?\s*(.+)$/u;
  var TAG_COLORS = new Map(DEFAULT_TAG_DEFINITIONS.map(({ name, color }) => [name.toLocaleLowerCase(), color]));
  function parseTitleMetadata(value) {
    if (typeof value !== "string") return null;
    const raw = value.trim();
    const match = BRACKETED_TITLE.exec(raw);
    if (!match) return null;
    const tag = (match[1] ?? match[2] ?? "").trim();
    const time = (match[3] ?? match[4] ?? "").trim();
    const title = match[5].trim();
    if (!tag || !title || tag.length > MAX_TAG_LENGTH || time.length > MAX_TIME_LENGTH) return null;
    return { raw, tag, time, title };
  }
  var titlePatternSource = BRACKETED_TITLE.source;

  // runtime/src/protocol.mjs
  var RUNTIME_PROTOCOL_VERSION = 1;
  var RuntimeMessageType = Object.freeze({
    hello: "hello",
    searchRequest: "search.request",
    searchResult: "search.result",
    settingsGet: "settings.get",
    settingsSnapshot: "settings.snapshot",
    settingsUpdate: "settings.update",
    settingsError: "settings.error",
    runtimeStatus: "runtime.status",
    catalogSnapshot: "catalog.snapshot",
    navigationOpen: "navigation.open"
  });
  function createRuntimeMessage(type, payload = {}, requestId) {
    if (typeof type !== "string" || !type) throw new TypeError("Runtime message type must be a non-empty string");
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) throw new TypeError("Runtime message payload must be an object");
    if (requestId !== void 0 && !Number.isSafeInteger(requestId)) throw new TypeError("Runtime message requestId must be a safe integer");
    return {
      protocolVersion: RUNTIME_PROTOCOL_VERSION,
      type,
      ...requestId === void 0 ? {} : { requestId },
      payload
    };
  }
  function parseRuntimeMessage(value) {
    let candidate = value;
    if (typeof candidate === "string") {
      try {
        candidate = JSON.parse(candidate);
      } catch {
        return { ok: false, reason: "invalid-json" };
      }
    }
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return { ok: false, reason: "invalid-envelope" };
    if (candidate.protocolVersion !== RUNTIME_PROTOCOL_VERSION) return { ok: false, reason: "unsupported-version" };
    if (typeof candidate.type !== "string" || !candidate.type) return { ok: false, reason: "invalid-type" };
    if (candidate.payload === null || typeof candidate.payload !== "object" || Array.isArray(candidate.payload)) return { ok: false, reason: "invalid-payload" };
    if (candidate.requestId !== void 0 && !Number.isSafeInteger(candidate.requestId)) return { ok: false, reason: "invalid-request-id" };
    return { ok: true, message: candidate };
  }

  // runtime/src/injected/codex-dom-adapter.ts
  var codexSelectors = {
    projectRow: "[data-app-action-sidebar-project-row]",
    projectsHeader: "[data-projects-header]",
    sectionToggle: "[data-app-action-sidebar-section-toggle]",
    threadRow: "[data-app-action-sidebar-thread-row]",
    threadTitle: "[data-thread-title]"
  };
  var codexLabels = {
    pinned: ["Pinned", "\u7F6E\u9876", "\u5DF2\u7F6E\u9876"],
    plugins: ["Plugins", "\u63D2\u4EF6"]
  };
  function detectCodexCapabilities() {
    return {
      adapter: "codex-private-dom-v1",
      threadTitles: Boolean(document.querySelector(codexSelectors.threadTitle)),
      navigationAnchor: Boolean(findNavigationButton(codexLabels.plugins)),
      pinnedSection: Boolean(findSectionToggle(codexLabels.pinned)),
      projects: Boolean(document.querySelector(codexSelectors.projectRow))
    };
  }
  function queryThreadTitles(toolbarId) {
    return Array.from(document.querySelectorAll(codexSelectors.threadTitle)).filter(
      (node) => !node.closest(`#${toolbarId}`)
    );
  }
  function findNavigationButton(labels) {
    const candidates = typeof labels === "string" ? [labels] : labels;
    return Array.from(document.querySelectorAll("button")).find(
      (button) => candidates.includes(button.textContent?.trim() ?? "")
    );
  }
  function findSectionToggle(labels) {
    const candidates = typeof labels === "string" ? [labels] : labels;
    return Array.from(document.querySelectorAll(codexSelectors.sectionToggle)).find(
      (toggle) => candidates.includes(toggle.textContent?.trim() ?? "")
    );
  }
  function findVisibleThreadRow(threadId) {
    if (!threadId) return null;
    return Array.from(document.querySelectorAll(codexSelectors.threadRow)).find(
      (row) => row.getAttribute("data-app-action-sidebar-thread-id") === threadId && row.getClientRects().length > 0
    ) ?? null;
  }
  function findThreadRow(titleNode) {
    return titleNode.closest(codexSelectors.threadRow);
  }
  function threadIdForRow(row) {
    return row?.getAttribute("data-app-action-sidebar-thread-id") ?? void 0;
  }
  function isPinnedThreadRow(row) {
    return row?.getAttribute("data-app-action-sidebar-thread-pinned") === "true";
  }
  function findFirstProjectRow() {
    return document.querySelector(codexSelectors.projectRow);
  }
  function findProjectsHeader() {
    return document.querySelector(codexSelectors.projectsHeader);
  }
  function findAnySectionToggle() {
    return document.querySelector(codexSelectors.sectionToggle);
  }
  function hasVisiblePinnedThread() {
    return Boolean(document.querySelector("[data-app-action-sidebar-thread-pinned='true']"));
  }
  function projectIdForThreadRow(row) {
    for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
      const projectRows = parent.querySelectorAll(codexSelectors.projectRow);
      if (projectRows.length === 1) return projectRows[0].getAttribute("data-app-action-sidebar-project-id");
    }
    return null;
  }
  function sectionToggleForThreadRow(row) {
    for (let parent = row?.parentElement; parent; parent = parent.parentElement) {
      const toggles = parent.querySelectorAll(codexSelectors.sectionToggle);
      if (toggles.length === 1) return toggles[0];
    }
    return null;
  }
  function isThreadTitleElement(element) {
    return Boolean(element.closest(codexSelectors.threadTitle));
  }
  function findProjectRow(projectId) {
    return Array.from(document.querySelectorAll(codexSelectors.projectRow)).find(
      (row) => row.getAttribute("data-app-action-sidebar-project-id") === projectId
    );
  }
  function isProjectCollapsed(projectRow) {
    return projectRow?.getAttribute("data-app-action-sidebar-project-collapsed") === "true";
  }
  function mutationContainsSidebarNode(node) {
    if (!(node instanceof Element)) return false;
    const selector = Object.values(codexSelectors).join(",");
    return node.matches(selector) || Boolean(node.querySelector(selector));
  }
  function sidebarOrderGroups() {
    const groups = /* @__PURE__ */ new Map();
    for (const title of queryThreadTitles("codex-sidebar-tags-toolbar")) {
      const row = findThreadRow(title);
      if (!row) continue;
      for (let item = row; item.parentElement; item = item.parentElement) {
        const parent = item.parentElement;
        const style = getComputedStyle(parent);
        if (style.display !== "flex" || style.flexDirection !== "column") continue;
        const siblings = [...parent.children];
        if (!siblings.every((sibling) => !sibling.querySelector(codexSelectors.projectRow) && !sibling.querySelector(codexSelectors.sectionToggle) && (sibling.matches(codexSelectors.threadRow) ? 1 : sibling.querySelectorAll(codexSelectors.threadRow).length) <= 1)) break;
        const items = groups.get(parent) ?? [];
        items.push({ element: item, title });
        groups.set(parent, items);
        break;
      }
    }
    return [...groups.values()];
  }

  // node_modules/preact/dist/preact.module.js
  var n;
  var l;
  var u;
  var t;
  var i;
  var r;
  var o;
  var e;
  var f;
  var c;
  var a;
  var s;
  var h;
  var p;
  var v;
  var y;
  var d = {};
  var w = [];
  var _ = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;
  var g = Array.isArray;
  function m(n2, l2) {
    for (var u3 in l2) n2[u3] = l2[u3];
    return n2;
  }
  function b(n2) {
    n2 && n2.parentNode && n2.parentNode.removeChild(n2);
  }
  function k(l2, u3, t2) {
    var i2, r2, o2, e2 = {};
    for (o2 in u3) "key" == o2 ? i2 = u3[o2] : "ref" == o2 ? r2 = u3[o2] : e2[o2] = u3[o2];
    if (arguments.length > 2 && (e2.children = arguments.length > 3 ? n.call(arguments, 2) : t2), "function" == typeof l2 && null != l2.defaultProps) for (o2 in l2.defaultProps) void 0 === e2[o2] && (e2[o2] = l2.defaultProps[o2]);
    return x(l2, e2, i2, r2, null);
  }
  function x(n2, t2, i2, r2, o2) {
    var e2 = { type: n2, props: t2, key: i2, ref: r2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: null == o2 ? ++u : o2, __i: -1, __u: 0 };
    return null == o2 && null != l.vnode && l.vnode(e2), e2;
  }
  function S(n2) {
    return n2.children;
  }
  function C(n2, l2) {
    this.props = n2, this.context = l2;
  }
  function $(n2, l2) {
    if (null == l2) return n2.__ ? $(n2.__, n2.__i + 1) : null;
    for (var u3; l2 < n2.__k.length; l2++) if (null != (u3 = n2.__k[l2]) && null != u3.__e) return u3.__e;
    return "function" == typeof n2.type ? $(n2) : null;
  }
  function I(n2) {
    if (n2.__P && n2.__d) {
      var u3 = n2.__v, t2 = u3.__e, i2 = [], r2 = [], o2 = m({}, u3);
      o2.__v = u3.__v + 1, l.vnode && l.vnode(o2), q(n2.__P, o2, u3, n2.__n, n2.__P.namespaceURI, 32 & u3.__u ? [t2] : null, i2, null == t2 ? $(u3) : t2, !!(32 & u3.__u), r2), o2.__v = u3.__v, o2.__.__k[o2.__i] = o2, D(i2, o2, r2), u3.__e = u3.__ = null, o2.__e != t2 && P(o2);
    }
  }
  function P(n2) {
    if (null != (n2 = n2.__) && null != n2.__c) return n2.__e = n2.__c.base = null, n2.__k.some(function(l2) {
      if (null != l2 && null != l2.__e) return n2.__e = n2.__c.base = l2.__e;
    }), P(n2);
  }
  function A(n2) {
    (!n2.__d && (n2.__d = true) && i.push(n2) && !H.__r++ || r != l.debounceRendering) && ((r = l.debounceRendering) || o)(H);
  }
  function H() {
    try {
      for (var n2, l2 = 1; i.length; ) i.length > l2 && i.sort(e), n2 = i.shift(), l2 = i.length, I(n2);
    } finally {
      i.length = H.__r = 0;
    }
  }
  function L(n2, l2, u3, t2, i2, r2, o2, e2, f3, c2, a2) {
    var s2, h2, p2, v2, y2, _2, g2 = t2 && t2.__k || w, m2 = l2.length;
    for (f3 = T(u3, l2, g2, f3, m2), s2 = 0; s2 < m2; s2++) null != (p2 = u3.__k[s2]) && (h2 = -1 != p2.__i && g2[p2.__i] || d, p2.__i = s2, _2 = q(n2, p2, h2, i2, r2, o2, e2, f3, c2, a2), v2 = p2.__e, p2.ref && h2.ref != p2.ref && (h2.ref && J(h2.ref, null, p2), a2.push(p2.ref, p2.__c || v2, p2)), null == y2 && null != v2 && (y2 = v2), 4 & p2.__u ? (f3 = j(p2, f3, n2), h2.__e && (h2.__e = null)) : "function" == typeof p2.type && void 0 !== _2 ? f3 = _2 : v2 && (f3 = v2.nextSibling), p2.__u &= -7);
    return u3.__e = y2, f3;
  }
  function T(n2, l2, u3, t2, i2) {
    var r2, o2, e2, f3, c2, a2 = u3.length, s2 = a2, h2 = 0;
    for (n2.__k = new Array(i2), r2 = 0; r2 < i2; r2++) null != (o2 = l2[r2]) && "boolean" != typeof o2 && "function" != typeof o2 ? ("string" == typeof o2 || "number" == typeof o2 || "bigint" == typeof o2 || o2.constructor == String ? o2 = n2.__k[r2] = x(null, o2, null, null, null) : g(o2) ? o2 = n2.__k[r2] = x(S, { children: o2 }, null, null, null) : void 0 === o2.constructor && o2.__b > 0 ? o2 = n2.__k[r2] = x(o2.type, o2.props, o2.key, o2.ref ? o2.ref : null, o2.__v) : n2.__k[r2] = o2, f3 = r2 + h2, o2.__ = n2, o2.__b = n2.__b + 1, e2 = null, -1 != (c2 = o2.__i = O(o2, u3, f3, s2)) && (s2--, (e2 = u3[c2]) && (e2.__u |= 2)), null == e2 || null == e2.__v ? (-1 == c2 && (i2 > a2 ? h2-- : i2 < a2 && h2++), "function" != typeof o2.type && (o2.__u |= 4)) : c2 != f3 && (c2 == f3 - 1 ? h2-- : c2 == f3 + 1 ? h2++ : (c2 > f3 ? h2-- : h2++, o2.__u |= 4))) : n2.__k[r2] = null;
    if (s2) for (r2 = 0; r2 < a2; r2++) null != (e2 = u3[r2]) && 0 == (2 & e2.__u) && (e2.__e == t2 && (t2 = $(e2)), K(e2, e2));
    return t2;
  }
  function j(n2, l2, u3) {
    var t2, i2;
    if ("function" == typeof n2.type) {
      for (t2 = n2.__k, i2 = 0; t2 && i2 < t2.length; i2++) t2[i2] && (t2[i2].__ = n2, l2 = j(t2[i2], l2, u3));
      return l2;
    }
    n2.__e != l2 && (l2 && n2.type && !l2.parentNode && (l2 = $(n2)), l2 = u3.insertBefore(n2.__e, l2 || null));
    do {
      l2 = l2 && l2.nextSibling;
    } while (null != l2 && 8 == l2.nodeType);
    return l2;
  }
  function O(n2, l2, u3, t2) {
    var i2, r2, o2, e2 = n2.key, f3 = n2.type, c2 = l2[u3], a2 = null != c2 && 0 == (2 & c2.__u);
    if (null === c2 && null == e2 || a2 && e2 == c2.key && f3 == c2.type) return u3;
    if (t2 > (a2 ? 1 : 0)) {
      for (i2 = u3 - 1, r2 = u3 + 1; i2 >= 0 || r2 < l2.length; ) if (null != (c2 = l2[o2 = i2 >= 0 ? i2-- : r2++]) && 0 == (2 & c2.__u) && e2 == c2.key && f3 == c2.type) return o2;
    }
    return -1;
  }
  function z(n2, l2, u3) {
    "-" == l2[0] ? n2.setProperty(l2, null == u3 ? "" : u3) : n2[l2] = null == u3 ? "" : "number" != typeof u3 || _.test(l2) ? u3 : u3 + "px";
  }
  function N(n2, l2, u3, t2, i2) {
    var r2, o2;
    n: if ("style" == l2) if ("string" == typeof u3) n2.style.cssText = u3;
    else {
      if ("string" == typeof t2 && (n2.style.cssText = t2 = ""), t2) for (l2 in t2) u3 && l2 in u3 || z(n2.style, l2, "");
      if (u3) for (l2 in u3) t2 && u3[l2] == t2[l2] || z(n2.style, l2, u3[l2]);
    }
    else if ("o" == l2[0] && "n" == l2[1]) r2 = l2 != (l2 = l2.replace(s, "$1")), o2 = l2.toLowerCase(), l2 = o2 in n2 || "onFocusOut" == l2 || "onFocusIn" == l2 ? o2.slice(2) : l2.slice(2), n2.l || (n2.l = {}), n2.l[l2 + r2] = u3, u3 ? t2 ? u3[a] = t2[a] : (u3[a] = h, n2.addEventListener(l2, r2 ? v : p, r2)) : n2.removeEventListener(l2, r2 ? v : p, r2);
    else {
      if ("http://www.w3.org/2000/svg" == i2) l2 = l2.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != l2 && "height" != l2 && "href" != l2 && "list" != l2 && "form" != l2 && "tabIndex" != l2 && "download" != l2 && "rowSpan" != l2 && "colSpan" != l2 && "role" != l2 && "popover" != l2 && l2 in n2) try {
        n2[l2] = null == u3 ? "" : u3;
        break n;
      } catch (n3) {
      }
      "function" == typeof u3 || (null == u3 || false === u3 && "-" != l2[4] ? n2.removeAttribute(l2) : n2.setAttribute(l2, "popover" == l2 && 1 == u3 ? "" : u3));
    }
  }
  function V(n2) {
    return function(u3) {
      if (this.l) {
        var t2 = this.l[u3.type + n2];
        if (null == u3[c]) u3[c] = h++;
        else if (u3[c] < t2[a]) return;
        return t2(l.event ? l.event(u3) : u3);
      }
    };
  }
  function q(n2, u3, t2, i2, r2, o2, e2, f3, c2, a2) {
    var s2, h2, p2, v2, y2, d2, _2, k2, x2, M, I2, P2, A2, H2, T2, j2, F = u3.type;
    if (void 0 !== u3.constructor) return null;
    128 & t2.__u && (c2 = !!(32 & t2.__u), o2 = [f3 = u3.__e = t2.__e]), (s2 = l.__b) && s2(u3);
    n: if ("function" == typeof F) {
      h2 = e2.length;
      try {
        if (x2 = u3.props, M = F.prototype && F.prototype.render, I2 = (s2 = F.contextType) && i2[s2.__c], P2 = s2 ? I2 ? I2.props.value : s2.__ : i2, t2.__c ? k2 = (p2 = u3.__c = t2.__c).__ = p2.__E : (M ? u3.__c = p2 = new F(x2, P2) : (u3.__c = p2 = new C(x2, P2), p2.constructor = F, p2.render = Q), I2 && I2.sub(p2), p2.state || (p2.state = {}), p2.__n = i2, v2 = p2.__d = true, p2.__h = [], p2._sb = []), M && null == p2.__s && (p2.__s = p2.state), M && null != F.getDerivedStateFromProps && (p2.__s == p2.state && (p2.__s = m({}, p2.__s)), m(p2.__s, F.getDerivedStateFromProps(x2, p2.__s))), y2 = p2.props, d2 = p2.state, p2.__v = u3, v2) M && null == F.getDerivedStateFromProps && null != p2.componentWillMount && p2.componentWillMount(), M && null != p2.componentDidMount && p2.__h.push(p2.componentDidMount);
        else {
          if (M && null == F.getDerivedStateFromProps && x2 !== y2 && null != p2.componentWillReceiveProps && p2.componentWillReceiveProps(x2, P2), u3.__v == t2.__v || !p2.__e && null != p2.shouldComponentUpdate && false === p2.shouldComponentUpdate(x2, p2.__s, P2)) {
            u3.__v != t2.__v && (p2.props = x2, p2.state = p2.__s, p2.__d = false), u3.__e = t2.__e, u3.__k = t2.__k, u3.__k.some(function(n3) {
              n3 && (n3.__ = u3);
            }), w.push.apply(p2.__h, p2._sb), p2._sb = [], p2.__h.length && e2.push(p2), f3 = $(t2);
            break n;
          }
          null != p2.componentWillUpdate && p2.componentWillUpdate(x2, p2.__s, P2), M && null != p2.componentDidUpdate && p2.__h.push(function() {
            p2.componentDidUpdate(y2, d2, _2);
          });
        }
        if (p2.context = P2, p2.props = x2, p2.__P = n2, p2.__e = false, A2 = l.__r, H2 = 0, M) p2.state = p2.__s, p2.__d = false, A2 && A2(u3), s2 = p2.render(p2.props, p2.state, p2.context), w.push.apply(p2.__h, p2._sb), p2._sb = [];
        else do {
          p2.__d = false, A2 && A2(u3), s2 = p2.render(p2.props, p2.state, p2.context), p2.state = p2.__s;
        } while (p2.__d && ++H2 < 25);
        p2.state = p2.__s, null != p2.getChildContext && (i2 = m(m({}, i2), p2.getChildContext())), M && !v2 && null != p2.getSnapshotBeforeUpdate && (_2 = p2.getSnapshotBeforeUpdate(y2, d2)), T2 = null != s2 && s2.type === S && null == s2.key ? E(s2.props.children) : s2, f3 = L(n2, g(T2) ? T2 : [T2], u3, t2, i2, r2, o2, e2, f3, c2, a2), p2.base = u3.__e, u3.__u &= -161, p2.__h.length && e2.push(p2), k2 && (p2.__E = p2.__ = null);
      } catch (n3) {
        if (e2.length = h2, u3.__v = null, c2 || null != o2) {
          if (n3.then) {
            for (u3.__u |= c2 ? 160 : 128; f3 && 8 == f3.nodeType && f3.nextSibling; ) f3 = f3.nextSibling;
            null != o2 && (o2[o2.indexOf(f3)] = null), u3.__e = f3;
          } else if (null != o2) for (j2 = o2.length; j2--; ) b(o2[j2]);
        } else u3.__e = t2.__e;
        null == u3.__k && (u3.__k = t2.__k || []), n3.then || B(u3), l.__e(n3, u3, t2);
      }
    } else null == o2 && u3.__v == t2.__v ? (u3.__k = t2.__k, u3.__e = t2.__e) : f3 = u3.__e = G(t2.__e, u3, t2, i2, r2, o2, e2, c2, a2);
    return (s2 = l.diffed) && s2(u3), 128 & u3.__u ? void 0 : f3;
  }
  function B(n2) {
    n2 && (n2.__c && (n2.__c.__e = true), n2.__k && n2.__k.some(B));
  }
  function D(n2, u3, t2) {
    for (var i2 = 0; i2 < t2.length; i2++) J(t2[i2], t2[++i2], t2[++i2]);
    l.__c && l.__c(u3, n2), n2.some(function(u4) {
      try {
        n2 = u4.__h, u4.__h = [], n2.some(function(n3) {
          n3.call(u4);
        });
      } catch (n3) {
        l.__e(n3, u4.__v);
      }
    });
  }
  function E(n2) {
    return "object" != typeof n2 || null == n2 || n2.__b > 0 ? n2 : g(n2) ? n2.map(E) : void 0 !== n2.constructor ? null : m({}, n2);
  }
  function G(u3, t2, i2, r2, o2, e2, f3, c2, a2) {
    var s2, h2, p2, v2, y2, w2, _2, m2 = i2.props || d, k2 = t2.props, x2 = t2.type;
    if ("svg" == x2 ? o2 = "http://www.w3.org/2000/svg" : "math" == x2 ? o2 = "http://www.w3.org/1998/Math/MathML" : o2 || (o2 = "http://www.w3.org/1999/xhtml"), null != e2) {
      for (s2 = 0; s2 < e2.length; s2++) if ((y2 = e2[s2]) && "setAttribute" in y2 == !!x2 && (x2 ? y2.localName == x2 : 3 == y2.nodeType)) {
        u3 = y2, e2[s2] = null;
        break;
      }
    }
    if (null == u3) {
      if (null == x2) return document.createTextNode(k2);
      u3 = document.createElementNS(o2, x2, k2.is && k2), c2 && (l.__m && l.__m(t2, e2), c2 = false), e2 = null;
    }
    if (null == x2) m2 === k2 || c2 && u3.data == k2 || (u3.data = k2);
    else {
      if (e2 = "textarea" == x2 && null != k2.defaultValue ? null : e2 && n.call(u3.childNodes), !c2 && null != e2) for (m2 = {}, s2 = 0; s2 < u3.attributes.length; s2++) m2[(y2 = u3.attributes[s2]).name] = y2.value;
      for (s2 in m2) y2 = m2[s2], "dangerouslySetInnerHTML" == s2 ? p2 = y2 : "children" == s2 || s2 in k2 || "value" == s2 && "defaultValue" in k2 || "checked" == s2 && "defaultChecked" in k2 || N(u3, s2, null, y2, o2);
      for (s2 in k2) y2 = k2[s2], "children" == s2 ? v2 = y2 : "dangerouslySetInnerHTML" == s2 ? h2 = y2 : "value" == s2 ? w2 = y2 : "checked" == s2 ? _2 = y2 : c2 && "function" != typeof y2 || m2[s2] === y2 || N(u3, s2, y2, m2[s2], o2);
      if (h2) c2 || p2 && (h2.__html == p2.__html || h2.__html == u3.innerHTML) || (u3.innerHTML = h2.__html), t2.__k = [];
      else if (p2 && (u3.innerHTML = ""), L("template" == t2.type ? u3.content : u3, g(v2) ? v2 : [v2], t2, i2, r2, "foreignObject" == x2 ? "http://www.w3.org/1999/xhtml" : o2, e2, f3, e2 ? e2[0] : i2.__k && $(i2, 0), c2, a2), null != e2) for (s2 = e2.length; s2--; ) b(e2[s2]);
      c2 && "textarea" != x2 || (s2 = "value", "progress" == x2 && null == w2 ? u3.removeAttribute("value") : null != w2 && (w2 !== u3[s2] || "progress" == x2 && !w2 || "option" == x2 && w2 != m2[s2]) && N(u3, s2, w2, m2[s2], o2), s2 = "checked", null != _2 && _2 != u3[s2] && N(u3, s2, _2, m2[s2], o2));
    }
    return u3;
  }
  function J(n2, u3, t2) {
    try {
      if ("function" == typeof n2) {
        var i2 = "function" == typeof n2.__u;
        i2 && n2.__u(), i2 && null == u3 || (n2.__u = n2(u3));
      } else n2.current = u3;
    } catch (n3) {
      l.__e(n3, t2);
    }
  }
  function K(n2, u3, t2) {
    var i2, r2;
    if (l.unmount && l.unmount(n2), (i2 = n2.ref) && (i2.current && i2.current != n2.__e || J(i2, null, u3)), null != (i2 = n2.__c)) {
      if (i2.componentWillUnmount) try {
        i2.componentWillUnmount();
      } catch (n3) {
        l.__e(n3, u3);
      }
      i2.base = i2.__P = i2.__n = null;
    }
    if (i2 = n2.__k) for (r2 = 0; r2 < i2.length; r2++) i2[r2] && K(i2[r2], u3, t2 || "function" != typeof n2.type);
    t2 || b(n2.__e), n2.__c = n2.__ = n2.__e = void 0;
  }
  function Q(n2, l2, u3) {
    return this.constructor(n2, u3);
  }
  function R(u3, t2, i2) {
    var r2, o2, e2, f3;
    t2 == document && (t2 = document.documentElement), l.__ && l.__(u3, t2), o2 = (r2 = "function" == typeof i2) ? null : i2 && i2.__k || t2.__k, e2 = [], f3 = [], q(t2, u3 = (!r2 && i2 || t2).__k = k(S, null, [u3]), o2 || d, d, t2.namespaceURI, !r2 && i2 ? [i2] : o2 ? null : t2.firstChild ? n.call(t2.childNodes) : null, e2, !r2 && i2 ? i2 : o2 ? o2.__e : t2.firstChild, r2, f3), D(e2, u3, f3), u3.props.children = null;
  }
  n = w.slice, l = { __e: function(n2, l2, u3, t2) {
    for (var i2, r2, o2; l2 = l2.__; ) if ((i2 = l2.__c) && !i2.__) try {
      if ((r2 = i2.constructor) && null != r2.getDerivedStateFromError && (i2.setState(r2.getDerivedStateFromError(n2)), o2 = i2.__d), null != i2.componentDidCatch && (i2.componentDidCatch(n2, t2 || {}), o2 = i2.__d), o2) return i2.__E = i2;
    } catch (l3) {
      n2 = l3;
    }
    throw n2;
  } }, u = 0, t = function(n2) {
    return null != n2 && void 0 === n2.constructor;
  }, C.prototype.setState = function(n2, l2) {
    var u3;
    u3 = null != this.__s && this.__s != this.state ? this.__s : this.__s = m({}, this.state), "function" == typeof n2 && (n2 = n2(m({}, u3), this.props)), n2 && m(u3, n2), null != n2 && this.__v && (l2 && this._sb.push(l2), A(this));
  }, C.prototype.forceUpdate = function(n2) {
    this.__v && (this.__e = true, n2 && this.__h.push(n2), A(this));
  }, C.prototype.render = S, i = [], o = "function" == typeof Promise ? Promise.prototype.then.bind(Promise.resolve()) : setTimeout, e = function(n2, l2) {
    return n2.__v.__b - l2.__v.__b;
  }, H.__r = 0, f = Math.random().toString(8), c = "__d" + f, a = "__a" + f, s = /(PointerCapture)$|Capture$/i, h = 0, p = V(false), v = V(true), y = 0;

  // node_modules/preact/jsx-runtime/dist/jsxRuntime.module.js
  var f2 = 0;
  function u2(e2, t2, n2, o2, i2, u3) {
    t2 || (t2 = {});
    var a2, c2, p2 = t2;
    if ("ref" in p2) for (c2 in p2 = {}, t2) "ref" == c2 ? a2 = t2[c2] : p2[c2] = t2[c2];
    var l2 = { type: e2, props: p2, key: n2, ref: a2, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: void 0, __v: --f2, __i: -1, __u: 0, __source: i2, __self: u3 };
    if ("function" == typeof e2 && (a2 = e2.defaultProps)) for (c2 in a2) void 0 === p2[c2] && (p2[c2] = a2[c2]);
    return l.vnode && l.vnode(l2), l2;
  }

  // runtime/src/injected/components/results-list.tsx
  function HighlightedText({ text, query }) {
    const needle = query.trim();
    if (!needle) return /* @__PURE__ */ u2(S, { children: text });
    const matcher = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu");
    const parts = [];
    let cursor = 0;
    for (const match of text.matchAll(matcher)) {
      const index = match.index ?? 0;
      if (index > cursor) parts.push(text.slice(cursor, index));
      parts.push(/* @__PURE__ */ u2("mark", { class: "codex-sidebar-search-mark", children: match[0] }, `match-${index}`));
      cursor = index + match[0].length;
    }
    if (cursor === 0) return /* @__PURE__ */ u2(S, { children: text });
    if (cursor < text.length) parts.push(text.slice(cursor));
    return /* @__PURE__ */ u2(S, { children: parts });
  }
  function ResultsList({ entries, query, sort, emptyMessage, onOpen }) {
    let lastGroup = null;
    if (entries.length === 0) return /* @__PURE__ */ u2("div", { class: "codex-sidebar-results-empty", children: emptyMessage });
    return /* @__PURE__ */ u2(S, { children: entries.flatMap((entry) => {
      const nodes = [];
      if (sort === "tag" && entry.tag !== lastGroup) {
        lastGroup = entry.tag;
        nodes.push(/* @__PURE__ */ u2("div", { class: "codex-sidebar-result-group", children: entry.tag }, `group-${entry.tag}`));
      }
      nodes.push(
        /* @__PURE__ */ u2("button", { type: "button", class: "codex-sidebar-result", role: "listitem", title: entry.raw, onClick: () => onOpen(entry), children: [
          /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-tag", style: { "--codex-sidebar-tag-color": entry.color }, children: entry.tag }),
          /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-content", children: [
            /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-title", children: /* @__PURE__ */ u2(HighlightedText, { text: entry.title, query }) }),
            entry.snippet ? /* @__PURE__ */ u2("span", { class: "codex-sidebar-result-snippet", children: /* @__PURE__ */ u2(HighlightedText, { text: entry.snippet, query }) }) : null
          ] })
        ] }, entry.key)
      );
      return nodes;
    }) });
  }
  function renderResultsList(host, props) {
    R(/* @__PURE__ */ u2(ResultsList, { ...props }), host);
  }

  // node_modules/motion-utils/dist/es/format-error-message.mjs
  function formatErrorMessage(message, errorCode) {
    return errorCode ? `${message}. For more information and steps for solving, visit https://motion.dev/troubleshooting/${errorCode}` : message;
  }

  // node_modules/motion-utils/dist/es/errors.mjs
  var warning = () => {
  };
  var invariant = () => {
  };
  if (typeof process !== "undefined" && true) {
    warning = (check, message, errorCode) => {
      if (!check && typeof console !== "undefined") {
        console.warn(formatErrorMessage(message, errorCode));
      }
    };
    invariant = (check, message, errorCode) => {
      if (!check) {
        throw new Error(formatErrorMessage(message, errorCode));
      }
    };
  }

  // node_modules/motion-utils/dist/es/memo.mjs
  // @__NO_SIDE_EFFECTS__
  function memo(callback) {
    let result;
    return () => {
      if (result === void 0)
        result = callback();
      return result;
    };
  }

  // node_modules/motion-utils/dist/es/noop.mjs
  var noop = /* @__NO_SIDE_EFFECTS__ */ (any) => any;

  // node_modules/motion-utils/dist/es/time-conversion.mjs
  var secondsToMilliseconds = /* @__NO_SIDE_EFFECTS__ */ (seconds) => seconds * 1e3;
  var millisecondsToSeconds = /* @__NO_SIDE_EFFECTS__ */ (milliseconds) => milliseconds / 1e3;

  // node_modules/motion-utils/dist/es/easing/utils/is-bezier-definition.mjs
  var isBezierDefinition = /* @__NO_SIDE_EFFECTS__ */ (easing) => Array.isArray(easing) && typeof easing[0] === "number";

  // node_modules/motion-dom/dist/es/animation/waapi/utils/linear.mjs
  var generateLinearEasing = (easing, duration, resolution = 10) => {
    let points = "";
    const numPoints = Math.max(Math.round(duration / resolution), 2);
    for (let i2 = 0; i2 < numPoints; i2++) {
      points += Math.round(easing(i2 / (numPoints - 1)) * 1e4) / 1e4 + ", ";
    }
    return `linear(${points.substring(0, points.length - 2)})`;
  };

  // node_modules/motion-dom/dist/es/animation/keyframes/get-final.mjs
  var isNotNull = (value) => value !== null;
  function getFinalKeyframe(keyframes, { repeat, repeatType = "loop" }, finalKeyframe, speed = 1) {
    const resolvedKeyframes = keyframes.filter(isNotNull);
    const useFirstKeyframe = speed < 0 || repeat && repeatType !== "loop" && repeat % 2 === 1;
    const index = useFirstKeyframe ? 0 : resolvedKeyframes.length - 1;
    return !index || finalKeyframe === void 0 ? resolvedKeyframes[index] : finalKeyframe;
  }

  // node_modules/motion-dom/dist/es/animation/utils/WithPromise.mjs
  var WithPromise = class {
    constructor() {
      this.updateFinished();
    }
    get finished() {
      return this._finished;
    }
    updateFinished() {
      this._finished = new Promise((resolve) => {
        this.resolve = resolve;
      });
    }
    notifyFinished() {
      this.resolve();
    }
    /**
     * Allows the animation to be awaited.
     *
     * @deprecated Use `finished` instead.
     */
    then(onResolve, onReject) {
      return this.finished.then(onResolve, onReject);
    }
  };

  // node_modules/motion-dom/dist/es/animation/keyframes/utils/fill-wildcards.mjs
  function fillWildcards(keyframes) {
    for (let i2 = 1; i2 < keyframes.length; i2++) {
      keyframes[i2] ?? (keyframes[i2] = keyframes[i2 - 1]);
    }
  }

  // node_modules/motion-dom/dist/es/render/dom/is-css-var.mjs
  var isCSSVar = (name) => name.startsWith("--");

  // node_modules/motion-dom/dist/es/render/dom/style-set.mjs
  function setStyle(element, name, value) {
    isCSSVar(name) ? element.style.setProperty(name, value) : element.style[name] = value;
  }

  // node_modules/motion-dom/dist/es/utils/supports/flags.mjs
  var supportsFlags = {};

  // node_modules/motion-dom/dist/es/utils/supports/memo.mjs
  function memoSupports(callback, supportsFlag) {
    const memoized = memo(callback);
    return () => supportsFlags[supportsFlag] ?? memoized();
  }

  // node_modules/motion-dom/dist/es/utils/supports/scroll-timeline.mjs
  var supportsScrollTimeline = /* @__PURE__ */ memoSupports(() => window.ScrollTimeline !== void 0, "scrollTimeline");

  // node_modules/motion-dom/dist/es/utils/supports/linear-easing.mjs
  var supportsLinearEasing = /* @__PURE__ */ memoSupports(() => {
    try {
      document.createElement("div").animate({ opacity: 0 }, { easing: "linear(0, 1)" });
    } catch (e2) {
      return false;
    }
    return true;
  }, "linearEasing");

  // node_modules/motion-dom/dist/es/animation/waapi/easing/cubic-bezier.mjs
  var cubicBezierAsString = ([a2, b2, c2, d2]) => `cubic-bezier(${a2}, ${b2}, ${c2}, ${d2})`;

  // node_modules/motion-dom/dist/es/animation/waapi/easing/supported.mjs
  var supportedWaapiEasing = {
    linear: "linear",
    ease: "ease",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    circIn: /* @__PURE__ */ cubicBezierAsString([0, 0.65, 0.55, 1]),
    circOut: /* @__PURE__ */ cubicBezierAsString([0.55, 0, 1, 0.45]),
    backIn: /* @__PURE__ */ cubicBezierAsString([0.31, 0.01, 0.66, -0.59]),
    backOut: /* @__PURE__ */ cubicBezierAsString([0.33, 1.53, 0.69, 0.99])
  };

  // node_modules/motion-dom/dist/es/animation/waapi/easing/map-easing.mjs
  function mapEasingToNativeEasing(easing, duration) {
    if (!easing) {
      return void 0;
    } else if (typeof easing === "function") {
      return supportsLinearEasing() ? generateLinearEasing(easing, duration) : "ease-out";
    } else if (isBezierDefinition(easing)) {
      return cubicBezierAsString(easing);
    } else if (Array.isArray(easing)) {
      return easing.map((segmentEasing) => mapEasingToNativeEasing(segmentEasing, duration) || supportedWaapiEasing.easeOut);
    } else {
      return supportedWaapiEasing[easing];
    }
  }

  // node_modules/motion-dom/dist/es/animation/waapi/start-waapi-animation.mjs
  function startWaapiAnimation(element, valueName, keyframes, { delay = 0, duration = 300, repeat = 0, repeatType = "loop", ease = "easeOut", times } = {}, pseudoElement = void 0) {
    const keyframeOptions = {
      [valueName]: keyframes
    };
    if (times)
      keyframeOptions.offset = times;
    const easing = mapEasingToNativeEasing(ease, duration);
    if (Array.isArray(easing))
      keyframeOptions.easing = easing;
    const options = {
      delay,
      duration,
      easing: !Array.isArray(easing) ? easing : "linear",
      fill: "both",
      iterations: repeat + 1,
      direction: repeatType === "reverse" ? "alternate" : "normal"
    };
    if (pseudoElement)
      options.pseudoElement = pseudoElement;
    return element.animate(keyframeOptions, options);
  }

  // node_modules/motion-dom/dist/es/animation/generators/utils/is-generator.mjs
  function isGenerator(type) {
    return typeof type === "function" && "applyToOptions" in type;
  }

  // node_modules/motion-dom/dist/es/animation/waapi/utils/apply-generator.mjs
  function applyGeneratorOptions({ type, ...options }) {
    if (isGenerator(type) && supportsLinearEasing()) {
      return type.applyToOptions(options);
    } else {
      options.duration ?? (options.duration = 300);
      options.ease ?? (options.ease = "easeOut");
    }
    return options;
  }

  // node_modules/motion-dom/dist/es/animation/NativeAnimation.mjs
  var NativeAnimation = class extends WithPromise {
    constructor(options) {
      super();
      this.finishedTime = null;
      this.isStopped = false;
      this.manualStartTime = null;
      if (!options)
        return;
      const { element, name, keyframes, pseudoElement, allowFlatten = false, finalKeyframe, onComplete } = options;
      this.isPseudoElement = Boolean(pseudoElement);
      this.allowFlatten = allowFlatten;
      this.options = options;
      invariant(typeof options.type !== "string", `Mini animate() doesn't support "type" as a string.`, "mini-spring");
      const transition = applyGeneratorOptions(options);
      this.animation = startWaapiAnimation(element, name, keyframes, transition, pseudoElement);
      if (transition.autoplay === false) {
        this.animation.pause();
      }
      this.animation.onfinish = () => {
        this.finishedTime = this.time;
        if (!pseudoElement) {
          const keyframe = getFinalKeyframe(keyframes, this.options, finalKeyframe, this.speed);
          if (this.updateMotionValue) {
            this.updateMotionValue(keyframe);
          }
          setStyle(element, name, keyframe);
          this.animation.cancel();
        }
        onComplete?.();
        this.notifyFinished();
      };
    }
    play() {
      if (this.isStopped)
        return;
      this.manualStartTime = null;
      this.animation.play();
      if (this.state === "finished") {
        this.updateFinished();
      }
    }
    pause() {
      this.animation.pause();
    }
    complete() {
      this.animation.finish?.();
    }
    cancel() {
      try {
        this.animation.cancel();
      } catch (e2) {
      }
    }
    stop() {
      if (this.isStopped)
        return;
      this.isStopped = true;
      const { state } = this;
      if (state === "idle" || state === "finished") {
        return;
      }
      if (this.updateMotionValue) {
        this.updateMotionValue();
      } else {
        this.commitStyles();
      }
      if (!this.isPseudoElement)
        this.cancel();
    }
    /**
     * WAAPI doesn't natively have any interruption capabilities.
     *
     * In this method, we commit styles back to the DOM before cancelling
     * the animation.
     *
     * This is designed to be overridden by NativeAnimationExtended, which
     * will create a renderless JS animation and sample it twice to calculate
     * its current value, "previous" value, and therefore allow
     * Motion to also correctly calculate velocity for any subsequent animation
     * while deferring the commit until the next animation frame.
     */
    commitStyles() {
      const element = this.options?.element;
      if (!this.isPseudoElement && element?.isConnected) {
        this.animation.commitStyles?.();
      }
    }
    get duration() {
      const duration = this.animation.effect?.getComputedTiming?.().duration || 0;
      return millisecondsToSeconds(Number(duration));
    }
    get iterationDuration() {
      const { delay = 0 } = this.options || {};
      return this.duration + millisecondsToSeconds(delay);
    }
    get time() {
      return millisecondsToSeconds(Number(this.animation.currentTime) || 0);
    }
    set time(newTime) {
      const wasFinished = this.finishedTime !== null;
      this.manualStartTime = null;
      this.finishedTime = null;
      this.animation.currentTime = secondsToMilliseconds(newTime);
      if (wasFinished) {
        this.animation.pause();
      }
    }
    /**
     * The playback speed of the animation.
     * 1 = normal speed, 2 = double speed, 0.5 = half speed.
     */
    get speed() {
      return this.animation.playbackRate;
    }
    set speed(newSpeed) {
      if (newSpeed < 0)
        this.finishedTime = null;
      this.animation.playbackRate = newSpeed;
    }
    get state() {
      return this.finishedTime !== null ? "finished" : this.animation.playState;
    }
    get startTime() {
      return this.manualStartTime ?? Number(this.animation.startTime);
    }
    set startTime(newStartTime) {
      this.manualStartTime = this.animation.startTime = newStartTime;
    }
    /**
     * Attaches a timeline to the animation, for instance the `ScrollTimeline`.
     */
    attachTimeline({ timeline, rangeStart, rangeEnd, observe }) {
      if (this.allowFlatten) {
        this.animation.effect?.updateTiming({ easing: "linear" });
      }
      this.animation.onfinish = null;
      if (timeline && supportsScrollTimeline()) {
        this.animation.timeline = timeline;
        if (rangeStart)
          this.animation.rangeStart = rangeStart;
        if (rangeEnd)
          this.animation.rangeEnd = rangeEnd;
        return noop;
      } else {
        return observe(this);
      }
    }
  };

  // node_modules/motion-dom/dist/es/animation/GroupAnimation.mjs
  var GroupAnimation = class {
    constructor(animations) {
      this.stop = () => this.runAll("stop");
      this.animations = animations.filter(Boolean);
    }
    get finished() {
      return Promise.all(this.animations.map((animation) => animation.finished));
    }
    /**
     * TODO: Filter out cancelled or stopped animations before returning
     */
    getAll(propName) {
      return this.animations[0][propName];
    }
    setAll(propName, newValue) {
      for (let i2 = 0; i2 < this.animations.length; i2++) {
        this.animations[i2][propName] = newValue;
      }
    }
    attachTimeline(timeline) {
      const subscriptions = this.animations.map((animation) => animation.attachTimeline(timeline));
      return () => {
        subscriptions.forEach((cancel, i2) => {
          cancel && cancel();
          this.animations[i2].stop();
        });
      };
    }
    get time() {
      return this.getAll("time");
    }
    set time(time) {
      this.setAll("time", time);
    }
    get speed() {
      return this.getAll("speed");
    }
    set speed(speed) {
      this.setAll("speed", speed);
    }
    get state() {
      return this.getAll("state");
    }
    get startTime() {
      return this.getAll("startTime");
    }
    get duration() {
      return getMax(this.animations, "duration");
    }
    get iterationDuration() {
      return getMax(this.animations, "iterationDuration");
    }
    runAll(methodName) {
      this.animations.forEach((controls) => controls[methodName]());
    }
    play() {
      this.runAll("play");
    }
    pause() {
      this.runAll("pause");
    }
    cancel() {
      this.runAll("cancel");
    }
    complete() {
      this.runAll("complete");
    }
  };
  function getMax(animations, propName) {
    let max = 0;
    for (let i2 = 0; i2 < animations.length; i2++) {
      const value = animations[i2][propName];
      if (value !== null && value > max) {
        max = value;
      }
    }
    return max;
  }

  // node_modules/motion-dom/dist/es/animation/GroupAnimationWithThen.mjs
  var GroupAnimationWithThen = class extends GroupAnimation {
    then(onResolve, _onReject) {
      return this.finished.finally(onResolve).then(() => {
      });
    }
  };

  // node_modules/motion-dom/dist/es/animation/utils/active-animations.mjs
  var animationMaps = /* @__PURE__ */ new WeakMap();
  var animationMapKey = (name, pseudoElement = "") => `${name}:${pseudoElement}`;
  function getAnimationMap(element) {
    let map = animationMaps.get(element);
    if (!map) {
      map = /* @__PURE__ */ new Map();
      animationMaps.set(element, map);
    }
    return map;
  }

  // node_modules/motion-dom/dist/es/animation/utils/resolve-transition.mjs
  function resolveTransition(transition, parentTransition) {
    if (transition?.inherit && parentTransition) {
      const { inherit: _2, ...rest } = transition;
      return { ...parentTransition, ...rest };
    }
    return transition;
  }

  // node_modules/motion-dom/dist/es/animation/utils/get-value-transition.mjs
  function getValueTransition(transition, key) {
    const valueTransition = transition?.[key] ?? transition?.["default"] ?? transition;
    if (valueTransition !== transition) {
      return resolveTransition(valueTransition, transition);
    }
    return valueTransition;
  }

  // node_modules/motion-dom/dist/es/utils/border-radius.mjs
  var cornerRadiusProps = [
    "borderTopLeftRadius",
    "borderTopRightRadius",
    "borderBottomRightRadius",
    "borderBottomLeftRadius"
  ];

  // node_modules/motion-dom/dist/es/animation/waapi/utils/px-values.mjs
  var pxValues = /* @__PURE__ */ new Set([
    // Border props
    "borderWidth",
    "borderTopWidth",
    "borderRightWidth",
    "borderBottomWidth",
    "borderLeftWidth",
    "borderRadius",
    ...cornerRadiusProps,
    // Positioning props
    "width",
    "maxWidth",
    "height",
    "maxHeight",
    "top",
    "right",
    "bottom",
    "left",
    "inset",
    "insetBlock",
    "insetBlockStart",
    "insetBlockEnd",
    "insetInline",
    "insetInlineStart",
    "insetInlineEnd",
    // Spacing props
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "paddingBlock",
    "paddingBlockStart",
    "paddingBlockEnd",
    "paddingInline",
    "paddingInlineStart",
    "paddingInlineEnd",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
    "marginBlock",
    "marginBlockStart",
    "marginBlockEnd",
    "marginInline",
    "marginInlineStart",
    "marginInlineEnd",
    // Typography
    "fontSize",
    // Misc
    "backgroundPositionX",
    "backgroundPositionY"
  ]);

  // node_modules/motion-dom/dist/es/animation/keyframes/utils/apply-px-defaults.mjs
  function applyPxDefaults(keyframes, name) {
    for (let i2 = 0; i2 < keyframes.length; i2++) {
      if (typeof keyframes[i2] === "number" && pxValues.has(name)) {
        keyframes[i2] = keyframes[i2] + "px";
      }
    }
  }

  // node_modules/motion-dom/dist/es/utils/resolve-elements.mjs
  function resolveElements(elementOrSelector, scope, selectorCache) {
    if (elementOrSelector == null) {
      return [];
    }
    if (elementOrSelector instanceof EventTarget) {
      return [elementOrSelector];
    } else if (typeof elementOrSelector === "string") {
      let root = document;
      if (scope) {
        root = scope.current;
      }
      const elements = selectorCache?.[elementOrSelector] ?? root.querySelectorAll(elementOrSelector);
      return elements ? Array.from(elements) : [];
    }
    return Array.from(elementOrSelector).filter((element) => element != null);
  }

  // node_modules/motion-dom/dist/es/render/dom/style-computed.mjs
  function getComputedStyle2(element, name) {
    const computedStyle = window.getComputedStyle(element);
    return isCSSVar(name) ? computedStyle.getPropertyValue(name) : computedStyle[name];
  }

  // node_modules/framer-motion/dist/es/animation/animators/waapi/animate-elements.mjs
  function animateElements(elementOrSelector, keyframes, options, scope) {
    if (elementOrSelector == null) {
      return [];
    }
    const elements = resolveElements(elementOrSelector, scope);
    const numElements = elements.length;
    invariant(Boolean(numElements), "No valid elements provided.", "no-valid-elements");
    const animationDefinitions = [];
    for (let i2 = 0; i2 < numElements; i2++) {
      const element = elements[i2];
      const elementTransition = { ...options };
      if (typeof elementTransition.delay === "function") {
        elementTransition.delay = elementTransition.delay(i2, numElements);
      }
      for (const valueName in keyframes) {
        let valueKeyframes = keyframes[valueName];
        if (!Array.isArray(valueKeyframes)) {
          valueKeyframes = [valueKeyframes];
        }
        const valueOptions = {
          ...getValueTransition(elementTransition, valueName)
        };
        valueOptions.duration && (valueOptions.duration = secondsToMilliseconds(valueOptions.duration));
        valueOptions.delay && (valueOptions.delay = secondsToMilliseconds(valueOptions.delay));
        const map = getAnimationMap(element);
        const key = animationMapKey(valueName, valueOptions.pseudoElement || "");
        const currentAnimation = map.get(key);
        currentAnimation && currentAnimation.stop();
        animationDefinitions.push({
          map,
          key,
          unresolvedKeyframes: valueKeyframes,
          options: {
            ...valueOptions,
            element,
            name: valueName,
            allowFlatten: !elementTransition.type && !elementTransition.ease
          }
        });
      }
    }
    for (let i2 = 0; i2 < animationDefinitions.length; i2++) {
      const { unresolvedKeyframes, options: animationOptions } = animationDefinitions[i2];
      const { element, name, pseudoElement } = animationOptions;
      if (!pseudoElement && unresolvedKeyframes[0] === null) {
        unresolvedKeyframes[0] = getComputedStyle2(element, name);
      }
      fillWildcards(unresolvedKeyframes);
      applyPxDefaults(unresolvedKeyframes, name);
      if (!pseudoElement && unresolvedKeyframes.length < 2) {
        unresolvedKeyframes.unshift(getComputedStyle2(element, name));
      }
      animationOptions.keyframes = unresolvedKeyframes;
    }
    const animations = [];
    for (let i2 = 0; i2 < animationDefinitions.length; i2++) {
      const { map, key, options: animationOptions } = animationDefinitions[i2];
      const animation = new NativeAnimation(animationOptions);
      map.set(key, animation);
      animation.finished.finally(() => map.delete(key));
      animations.push(animation);
    }
    return animations;
  }

  // node_modules/framer-motion/dist/es/animation/animators/waapi/animate-style.mjs
  var createScopedWaapiAnimate = (scope) => {
    function scopedAnimate(elementOrSelector, keyframes, options) {
      return new GroupAnimationWithThen(animateElements(elementOrSelector, keyframes, options, scope));
    }
    return scopedAnimate;
  };
  var animateMini = /* @__PURE__ */ createScopedWaapiAnimate();

  // runtime/src/injected/motion.ts
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var easeOut = [0.2, 0.8, 0.2, 1];
  var EXIT_SETTLE_TIMEOUT_MS = 240;
  function enterDashboard(overlay, dialog) {
    animateMini(overlay, { opacity: [0, 1] }, { duration: reducedMotionQuery.matches ? 0.1 : 0.14, ease: "easeOut" });
    if (reducedMotionQuery.matches) return;
    animateMini(
      dialog,
      {
        opacity: [0, 1],
        transform: ["translateY(6px) scale(.985)", "translateY(0) scale(1)"]
      },
      { duration: 0.18, ease: easeOut }
    );
  }
  async function exitDashboard(overlay, dialog) {
    const animations = [animateMini(overlay, { opacity: 0 }, { duration: reducedMotionQuery.matches ? 0.08 : 0.12, ease: "easeIn" })];
    if (!reducedMotionQuery.matches) {
      animations.push(animateMini(
        dialog,
        { opacity: 0, transform: "translateY(4px) scale(.99)" },
        { duration: 0.12, ease: "easeIn" }
      ));
    }
    await Promise.race([
      Promise.all(animations),
      new Promise((resolve) => setTimeout(resolve, EXIT_SETTLE_TIMEOUT_MS))
    ]);
  }
  function enterSortMenu(menu) {
    if (reducedMotionQuery.matches) return;
    animateMini(
      menu,
      { opacity: [0, 1], transform: ["translateY(-4px) scale(.98)", "translateY(0) scale(1)"] },
      { duration: 0.12, ease: easeOut }
    );
  }
  function enterDashboardContent(content) {
    animateMini(
      content,
      reducedMotionQuery.matches ? { opacity: [0, 1] } : { opacity: [0, 1], transform: ["translateY(2px)", "translateY(0)"] },
      { duration: reducedMotionQuery.matches ? 0.08 : 0.12, ease: "easeOut" }
    );
  }
  function refreshResults(results) {
    animateMini(
      results,
      reducedMotionQuery.matches ? { opacity: [0.72, 1] } : { opacity: [0.72, 1], transform: ["translateY(2px)", "translateY(0)"] },
      { duration: reducedMotionQuery.matches ? 0.08 : 0.12, ease: "easeOut" }
    );
  }

  // runtime/src/injected/search.ts
  function selectVisibleEntries(entries, state, contentMatches) {
    const query = state.query.trim().toLocaleLowerCase();
    const filtered = entries.flatMap((entry) => {
      if (state.tag !== "all" && entry.tag !== state.tag) return [];
      if (!query) return [{ ...entry, matchType: "none", snippet: "" }];
      if (`${entry.tag} ${entry.time} ${entry.title}`.toLocaleLowerCase().includes(query)) {
        return [{ ...entry, matchType: "title", snippet: "" }];
      }
      const contentMatch = contentMatches.get(entry.threadId ?? "");
      if (!contentMatch) return [];
      return [{ ...entry, matchType: "content", snippet: `${contentMatch.role}\uFF1A${contentMatch.snippet}` }];
    });
    if (state.sort === "time") return filtered.sort((left, right) => (right.updatedAt ?? 0) - (left.updatedAt ?? 0) || left.index - right.index);
    if (state.sort === "tag") return filtered.sort((left, right) => left.tag.localeCompare(right.tag, "zh-CN") || left.title.localeCompare(right.title, "zh-CN"));
    if (state.sort === "title") return filtered.sort((left, right) => left.title.localeCompare(right.title, "zh-CN", { numeric: true }));
    return filtered.sort((left, right) => left.index - right.index);
  }

  // runtime/src/injected/dashboard-view.ts
  var DashboardView = class {
    constructor(options) {
      this.options = options;
      document.querySelectorAll(".codex-sidebar-dashboard-overlay").forEach((overlay) => overlay.remove());
    }
    options;
    modal = null;
    closing = false;
    deletedDefinition = null;
    composing = false;
    get isClosing() {
      return this.closing;
    }
    get visibleResultCount() {
      return this.modal?.querySelectorAll(".codex-sidebar-result").length ?? 0;
    }
    hasFocus() {
      return Boolean(this.modal?.matches(":focus-within"));
    }
    contains(target) {
      return Boolean(this.modal?.contains(target));
    }
    async close(reason) {
      const { state, store, trace, requestRender } = this.options;
      if (!state.open || this.closing) return;
      this.closing = true;
      trace("dashboard-close-start", { reason });
      store.dispatch({ type: "sort-menu.set", value: false });
      const closingModal = this.modal;
      const dialog = closingModal?.querySelector(".codex-sidebar-dashboard-dialog");
      try {
        if (closingModal && dialog) await exitDashboard(closingModal, dialog);
      } finally {
        if (this.modal === closingModal) {
          store.dispatch({ type: "dashboard.close" });
          requestRender(reason);
        }
        this.closing = false;
        trace("dashboard-close-end", { reason });
      }
    }
    render(entries, reason = "state") {
      const {
        state,
        store,
        ensureToolbar,
        getNavigationTemplate,
        getTagDefinitions,
        getSearchState,
        i18n,
        requestRender
      } = this.options;
      if (this.closing && state.open) return;
      const backgroundUpdate = ["catalog-snapshot", "settings-snapshot", "search-result"].includes(reason);
      if (backgroundUpdate && this.modal && (state.view === "settings" || state.sortOpen || this.composing)) return;
      const previousScroll = this.modal?.querySelector(".codex-sidebar-results-list")?.scrollTop ?? 0;
      const toolbar = ensureToolbar(entries.map((entry2) => entry2.node).filter((node) => Boolean(node)));
      if (!toolbar) return;
      const activeInput = document.activeElement instanceof HTMLInputElement && document.activeElement.matches(".codex-sidebar-search-input, .codex-sidebar-tag-input, .codex-sidebar-tag-description") ? document.activeElement : null;
      const activeInputClass = activeInput?.className ?? null;
      const selectionStart = activeInput?.selectionStart ?? null;
      this.modal?.remove();
      this.modal = null;
      toolbar.replaceChildren();
      const entry = document.createElement("div");
      entry.className = "codex-sidebar-dashboard-entry";
      const navigationTemplate = getNavigationTemplate();
      const launcher = navigationTemplate?.cloneNode(true) ?? this.button("", "Tags");
      launcher.classList.add("codex-sidebar-dashboard-launcher");
      if (!navigationTemplate) launcher.dataset.dashboardFallback = "true";
      launcher.querySelector(".text-fade-truncate")?.replaceChildren(document.createTextNode("Tags"));
      const icon = launcher.querySelector("svg");
      if (icon) this.renderTagsIcon(icon);
      launcher.title = i18n.t("launcherLabel");
      launcher.setAttribute("aria-label", i18n.t("launcherLabel"));
      launcher.setAttribute("aria-haspopup", "dialog");
      launcher.setAttribute("aria-expanded", String(state.open));
      launcher.addEventListener("click", () => {
        this.closing = false;
        store.dispatch({ type: "dashboard.open" });
        requestRender("open-dashboard");
      });
      entry.appendChild(launcher);
      toolbar.appendChild(entry);
      if (!state.open) return;
      const overlay = document.createElement("div");
      overlay.className = "codex-sidebar-dashboard-overlay";
      const dialog = document.createElement("section");
      dialog.className = "codex-sidebar-dashboard-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      dialog.setAttribute("aria-label", i18n.t("sessionsDashboard"));
      const header = document.createElement("header");
      header.className = "codex-sidebar-dashboard-header";
      const headingGroup = document.createElement("div");
      const heading = document.createElement("h2");
      heading.className = "codex-sidebar-dashboard-heading";
      heading.textContent = i18n.t(state.view === "sessions" ? "sessionsDashboard" : "tagSettings");
      const subtitle = document.createElement("div");
      subtitle.className = "codex-sidebar-dashboard-subtitle";
      const searchState = getSearchState();
      subtitle.textContent = state.view === "sessions" ? i18n.t(searchState.indexStatus.phase === "ready" ? "indexReady" : "indexOnDemand", { count: entries.length }) : i18n.t("configuredTags", { count: getTagDefinitions().length });
      headingGroup.append(heading, subtitle);
      const tabs = document.createElement("div");
      tabs.className = "codex-sidebar-dashboard-tabs";
      tabs.setAttribute("role", "tablist");
      const dashboardTabs = [["sessions", i18n.t("sessions")], ["settings", i18n.t("tagSettings")]];
      dashboardTabs.forEach(([value, label]) => {
        const tab = this.button("codex-sidebar-dashboard-tab", label);
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(state.view === value));
        tab.addEventListener("click", () => {
          store.dispatch({ type: "view.set", value });
          requestRender("dashboard-tab");
        });
        tabs.appendChild(tab);
      });
      const close = this.button("codex-sidebar-dashboard-close", "\xD7");
      close.title = i18n.t("close");
      close.setAttribute("aria-label", i18n.t("closeDashboard"));
      close.addEventListener("click", () => {
        void this.close("close-dashboard");
      });
      header.append(headingGroup, tabs, close);
      const body = document.createElement("div");
      body.className = "codex-sidebar-dashboard-body";
      if (state.view === "sessions") {
        this.renderSessions(body, entries, searchState);
      } else {
        this.renderSettings(body, entries);
      }
      dialog.append(header, body);
      overlay.appendChild(dialog);
      overlay.addEventListener("pointerdown", (event) => {
        if (event.target === overlay) void this.close("backdrop");
      });
      dialog.addEventListener("pointerdown", (event) => {
        if (!state.sortOpen || event.target instanceof Element && event.target.closest(".codex-sidebar-sort-control")) return;
        store.dispatch({ type: "sort-menu.set", value: false });
        dialog.querySelector(".codex-sidebar-sort-menu")?.remove();
        dialog.querySelector(".codex-sidebar-sort-trigger")?.setAttribute("aria-expanded", "false");
      }, true);
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          void this.close("escape");
          return;
        }
        if (event.key !== "Tab") return;
        const focusable = [...dialog.querySelectorAll("button, input, select")].filter((item) => !item.disabled);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
      this.modal = overlay;
      document.body.appendChild(overlay);
      if (backgroundUpdate) {
        const list = overlay.querySelector(".codex-sidebar-results-list");
        if (list) list.scrollTop = previousScroll;
      }
      if (reason === "open-dashboard") enterDashboard(overlay, dialog);
      if (reason === "dashboard-tab") enterDashboardContent(body);
      const sortMenuElement = dialog.querySelector(".codex-sidebar-sort-menu");
      if (reason === "sort-toggle" && state.sortOpen && sortMenuElement) enterSortMenu(sortMenuElement);
      const resultsElement = dialog.querySelector(".codex-sidebar-results");
      if (["tag", "sort", "search-result"].includes(reason) && resultsElement) refreshResults(resultsElement);
      const restoredInput = activeInputClass ? dialog.querySelector(`.${activeInputClass}`) : null;
      if (restoredInput) {
        restoredInput.focus({ preventScroll: true });
        if (selectionStart !== null) restoredInput.setSelectionRange(selectionStart, selectionStart);
      } else {
        requestAnimationFrame(() => dialog.querySelector(state.view === "sessions" ? ".codex-sidebar-search-input" : ".codex-sidebar-tag-input")?.focus({ preventScroll: true }));
      }
    }
    dispose() {
      this.modal?.remove();
      this.modal = null;
      this.closing = false;
      this.composing = false;
    }
    renderSessions(body, entries, searchState) {
      const { state, store, i18n, getEntries, scheduleContentSearch, requestRender, trace, onOpenEntry } = this.options;
      const controls = document.createElement("div");
      controls.className = "codex-sidebar-dashboard-controls";
      const search = document.createElement("label");
      search.className = "codex-sidebar-search";
      search.dataset.loading = String(searchState.loading);
      const searchIcon = document.createElement("span");
      searchIcon.className = "codex-sidebar-search-icon";
      searchIcon.textContent = "\u2315";
      const input = document.createElement("input");
      input.className = "codex-sidebar-search-input";
      input.type = "search";
      input.placeholder = i18n.t("searchPlaceholder");
      input.value = state.query;
      input.setAttribute("aria-label", i18n.t("searchLabel"));
      let composing = false;
      input.addEventListener("compositionstart", () => {
        composing = true;
        this.composing = true;
      });
      input.addEventListener("compositionend", (event) => {
        composing = false;
        this.composing = false;
        store.dispatch({ type: "query.set", value: event.currentTarget.value });
        const currentEntries = getEntries();
        scheduleContentSearch(currentEntries);
        requestRender("compositionend");
      });
      input.addEventListener("input", (event) => {
        store.dispatch({ type: "query.set", value: event.currentTarget.value });
        if (!composing && !event.isComposing) {
          const currentEntries = getEntries();
          scheduleContentSearch(currentEntries);
          requestRender("query");
        }
      });
      search.append(searchIcon, input);
      const sortOptions = [
        ["sidebar", i18n.t("sortDefault")],
        ["time", i18n.t("sortDateDescending")],
        ["tag", i18n.t("sortTag")],
        ["title", i18n.t("sortTitle")]
      ];
      const sortControl = document.createElement("div");
      sortControl.className = "codex-sidebar-sort-control";
      const sortTrigger = this.button("codex-sidebar-sort-trigger", "");
      sortTrigger.setAttribute("aria-label", i18n.t("sortAria"));
      sortTrigger.setAttribute("aria-haspopup", "listbox");
      sortTrigger.setAttribute("aria-expanded", String(state.sortOpen));
      sortTrigger.setAttribute("aria-controls", "codex-sidebar-sort-menu");
      const sortLabel = document.createElement("span");
      sortLabel.className = "codex-sidebar-sort-label";
      sortLabel.textContent = i18n.t("sort");
      const sortValue = document.createElement("span");
      sortValue.className = "codex-sidebar-sort-value";
      sortValue.textContent = sortOptions.find(([value]) => value === state.sort)?.[1] ?? i18n.t("sortDefault");
      const sortChevron = document.createElement("span");
      sortChevron.className = "codex-sidebar-sort-chevron";
      sortTrigger.append(sortLabel, sortValue, sortChevron);
      const focusSort = (selector = ".codex-sidebar-sort-trigger") => requestAnimationFrame(() => document.querySelector(selector)?.focus({ preventScroll: true }));
      sortTrigger.addEventListener("click", () => {
        store.dispatch({ type: "sort-menu.set", value: !state.sortOpen });
        requestRender("sort-toggle");
        focusSort(state.sortOpen ? ".codex-sidebar-sort-option[aria-selected='true']" : void 0);
      });
      sortTrigger.addEventListener("keydown", (event) => {
        if (!["ArrowDown", "ArrowUp", "Escape"].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        store.dispatch({ type: "sort-menu.set", value: event.key !== "Escape" });
        requestRender("sort-keyboard");
        focusSort(event.key === "Escape" ? void 0 : event.key === "ArrowUp" ? ".codex-sidebar-sort-option:last-child" : ".codex-sidebar-sort-option[aria-selected='true']");
      });
      sortControl.appendChild(sortTrigger);
      if (state.sortOpen) {
        const sortMenu = document.createElement("div");
        sortMenu.id = "codex-sidebar-sort-menu";
        sortMenu.className = "codex-sidebar-sort-menu";
        sortMenu.setAttribute("role", "listbox");
        sortOptions.forEach(([value, label], index) => {
          const option = this.button("codex-sidebar-sort-option", "");
          option.dataset.value = value;
          option.setAttribute("role", "option");
          option.setAttribute("aria-selected", String(state.sort === value));
          const optionLabel = document.createElement("span");
          optionLabel.textContent = label;
          const check = document.createElement("span");
          check.className = "codex-sidebar-sort-check";
          check.textContent = state.sort === value ? "\u2713" : "";
          option.append(optionLabel, check);
          option.addEventListener("click", () => {
            store.dispatch({ type: "sort.set", value });
            trace("sort-change", { value: state.sort });
            requestRender("sort");
            focusSort();
          });
          option.addEventListener("keydown", (event) => {
            const options = [...sortMenu.querySelectorAll(".codex-sidebar-sort-option")];
            if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              store.dispatch({ type: "sort-menu.set", value: false });
              requestRender("sort-escape");
              focusSort();
            } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
              event.preventDefault();
              const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length;
              options[nextIndex]?.focus({ preventScroll: true });
            }
          });
          sortMenu.appendChild(option);
        });
        sortControl.appendChild(sortMenu);
      }
      controls.append(search, sortControl);
      const counts = /* @__PURE__ */ new Map();
      entries.forEach((item) => counts.set(item.tag, (counts.get(item.tag) ?? 0) + 1));
      const rail = document.createElement("div");
      rail.className = "codex-sidebar-filter-rail";
      rail.setAttribute("role", "group");
      rail.setAttribute("aria-label", i18n.t("filterByTag"));
      const dashboardFilters = [["all", i18n.t("all"), entries.length], ...Array.from(counts, ([tag, count]) => [tag, tag, count])];
      dashboardFilters.sort((left, right) => left[0] === "all" ? -1 : right[0] === "all" ? 1 : i18n.compare(left[1], right[1])).forEach(([value, label, count]) => {
        const chip = this.button("codex-sidebar-filter-chip", label);
        chip.dataset.value = value;
        chip.setAttribute("aria-pressed", String(state.tag === value));
        chip.title = `${label} \xB7 ${i18n.t("sessionCount", { count })}`;
        const badge = document.createElement("span");
        badge.className = "codex-sidebar-filter-count";
        badge.textContent = String(count);
        chip.appendChild(badge);
        chip.addEventListener("click", () => {
          store.dispatch({ type: "tag.set", value: state.tag === value && value !== "all" ? "all" : value });
          trace("tag-click", { value, selected: state.tag });
          requestRender("tag");
        });
        rail.appendChild(chip);
      });
      const results = selectVisibleEntries(entries, state, searchState.contentMatches);
      const panel = document.createElement("div");
      panel.className = "codex-sidebar-results";
      panel.dataset.loading = String(searchState.loading);
      const panelHead = document.createElement("div");
      panelHead.className = "codex-sidebar-results-head";
      const summary = document.createElement("span");
      summary.setAttribute("aria-live", "polite");
      const resultCount = i18n.t("resultCount", { visible: results.length, total: entries.length });
      summary.textContent = searchState.loading ? `${resultCount} \xB7 ${i18n.t("searchingContent")}` : searchState.error ? `${resultCount} \xB7 ${searchState.error}` : `${resultCount}${state.query ? ` \xB7 ${i18n.t("nameAndContent")}` : ""}`;
      panelHead.appendChild(summary);
      const list = document.createElement("div");
      list.className = "codex-sidebar-results-list";
      list.setAttribute("role", "list");
      renderResultsList(list, { entries: results, query: state.query, sort: state.sort, emptyMessage: i18n.t("noMatches"), onOpen: onOpenEntry });
      panel.append(panelHead, list);
      body.append(controls, rail, panel);
    }
    renderSettings(body, entries) {
      const { state, store, i18n, getTagDefinitions, onTagDefinitionsChanged, colorPresets, fallbackBlue, requestRender } = this.options;
      const tagDefinitions = getTagDefinitions();
      const configured = new Set(tagDefinitions.map(({ name }) => name.toLocaleLowerCase()));
      const detected = [...new Set(entries.filter((item) => item.tagged && !configured.has(item.tag.toLocaleLowerCase())).map((item) => item.tag))];
      const note = document.createElement("p");
      note.className = "codex-sidebar-tag-settings-note";
      note.appendChild(document.createTextNode(i18n.t("settingsNote")));
      const settingsError = this.options.getSearchState().error;
      if (settingsError) {
        const alert = document.createElement("p");
        alert.setAttribute("role", "alert");
        alert.textContent = settingsError;
        note.append(alert);
      }
      if (this.deletedDefinition) {
        const deleted = this.deletedDefinition;
        const undo = this.button("codex-sidebar-tag-add", i18n.t("undoDelete", { name: deleted.name }));
        undo.addEventListener("click", () => {
          const current = getTagDefinitions();
          if (current.length >= 32) {
            undo.textContent = i18n.t("tagLimit");
            return;
          }
          if (!current.some((item) => item.name.toLowerCase() === deleted.name.toLowerCase())) onTagDefinitionsChanged([...current, deleted]);
          this.deletedDefinition = null;
          requestRender("tag-config-undo");
        });
        note.append(undo);
      }
      if (detected.length) {
        const unconfigured = document.createElement("span");
        unconfigured.className = "codex-sidebar-tag-settings-unconfigured";
        unconfigured.textContent = i18n.t("unconfigured", { names: detected.join(i18n.locale === "zh-CN" ? "\u3001" : ", ") });
        note.appendChild(unconfigured);
      }
      const form = document.createElement("form");
      form.className = "codex-sidebar-tag-form";
      const formRow = document.createElement("div");
      formRow.className = "codex-sidebar-tag-form-row";
      const nameField = document.createElement("label");
      nameField.className = "codex-sidebar-tag-field";
      const nameLabel = document.createElement("span");
      nameLabel.className = "codex-sidebar-tag-field-label";
      nameLabel.textContent = i18n.t("tagName");
      const tagInput = document.createElement("input");
      tagInput.className = "codex-sidebar-tag-input";
      tagInput.placeholder = i18n.t("tagNamePlaceholder");
      tagInput.maxLength = 32;
      tagInput.setAttribute("aria-label", i18n.t("newTagName"));
      nameField.append(nameLabel, tagInput);
      const descriptionField = document.createElement("label");
      descriptionField.className = "codex-sidebar-tag-field";
      const descriptionLabel = document.createElement("span");
      descriptionLabel.className = "codex-sidebar-tag-field-label";
      descriptionLabel.textContent = i18n.t("classificationDescriptionOptional");
      const descriptionInput = document.createElement("input");
      descriptionInput.className = "codex-sidebar-tag-description";
      descriptionInput.placeholder = i18n.t("descriptionPlaceholder");
      descriptionInput.maxLength = 240;
      descriptionInput.setAttribute("aria-label", i18n.t("tagDescription"));
      descriptionField.append(descriptionLabel, descriptionInput);
      const colorField = document.createElement("div");
      colorField.className = "codex-sidebar-tag-color-field";
      const colorLabel = document.createElement("span");
      colorLabel.className = "codex-sidebar-tag-field-label";
      colorLabel.textContent = i18n.t("tagColor");
      const colorRow = document.createElement("div");
      colorRow.className = "codex-sidebar-tag-color-row";
      const presetGroup = document.createElement("div");
      presetGroup.className = "codex-sidebar-tag-color-presets";
      presetGroup.setAttribute("role", "group");
      presetGroup.setAttribute("aria-label", i18n.t("presetColors"));
      let selectedColor = colorPresets[0]?.color ?? fallbackBlue;
      const colorInput = document.createElement("input");
      colorInput.className = "codex-sidebar-tag-color-custom";
      colorInput.type = "color";
      colorInput.value = selectedColor;
      colorInput.title = i18n.t("customColor");
      colorInput.setAttribute("aria-label", i18n.t("customTagColor"));
      const customColorControl = document.createElement("label");
      customColorControl.className = "codex-sidebar-tag-color-custom-control";
      customColorControl.title = i18n.t("selectCustomColor");
      const customColorPreview = document.createElement("span");
      customColorPreview.className = "codex-sidebar-tag-color-custom-preview";
      customColorPreview.style.setProperty("--custom-color", selectedColor);
      const customColorLabel = document.createElement("span");
      customColorLabel.textContent = i18n.t("custom");
      customColorControl.append(colorInput, customColorPreview, customColorLabel);
      const updateColor = (color) => {
        selectedColor = color.toLocaleLowerCase();
        colorInput.value = selectedColor;
        customColorPreview.style.setProperty("--custom-color", selectedColor);
        presetGroup.querySelectorAll(".codex-sidebar-tag-color-preset").forEach((preset) => {
          preset.setAttribute("aria-pressed", String(preset.dataset.color === selectedColor));
        });
      };
      colorPresets.forEach(({ name: presetName, color }) => {
        const preset = this.button("codex-sidebar-tag-color-preset", "");
        preset.dataset.color = color;
        preset.style.setProperty("--preset-color", color);
        const localizedName = i18n.colorName(presetName);
        preset.title = `${localizedName} ${color}`;
        preset.setAttribute("aria-label", `${localizedName} ${color}`);
        preset.setAttribute("aria-pressed", String(color === selectedColor));
        preset.addEventListener("click", () => updateColor(color));
        presetGroup.appendChild(preset);
      });
      colorInput.addEventListener("input", () => updateColor(colorInput.value));
      colorRow.append(presetGroup, customColorControl);
      colorField.append(colorLabel, colorRow);
      const error = document.createElement("div");
      error.className = "codex-sidebar-tag-error";
      error.textContent = state.tagError === "invalid-name" ? i18n.t("invalidTagName") : state.tagError === "duplicate" ? i18n.t("duplicateTag") : "";
      const add = this.button("codex-sidebar-tag-add", i18n.t("add"));
      let editingName = null;
      const cancel = this.button("codex-sidebar-tag-delete", i18n.t("cancel"));
      cancel.hidden = true;
      cancel.addEventListener("click", () => requestRender("tag-edit-cancel"));
      add.type = "submit";
      formRow.append(nameField, descriptionField, add, cancel);
      form.append(formRow, colorField, error);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const name = tagInput.value.trim();
        const description = descriptionInput.value.replace(/\s+/gu, " ").trim();
        const current = getTagDefinitions();
        if (!name || name.length > 32 || /[\[\]【】\r\n]/u.test(name) || name.toLowerCase() === "uncategorized") {
          error.textContent = i18n.t("invalidTagName");
          return;
        } else if (!editingName && current.some((item) => item.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
          error.textContent = i18n.t("duplicateTag");
          return;
        } else if (!editingName && current.length >= 32) {
          error.textContent = i18n.t("tagLimit");
          return;
        } else {
          const updated = { name, color: selectedColor, description };
          onTagDefinitionsChanged(editingName ? current.map((item) => item.name === editingName ? updated : item) : [...current, updated]);
          store.dispatch({ type: "tag-error.set", value: "" });
        }
        requestRender("tag-config-add");
      });
      const configList = document.createElement("div");
      configList.className = "codex-sidebar-tag-config-list";
      const configHeader = document.createElement("div");
      configHeader.className = "codex-sidebar-tag-config-header";
      const headerSpacer = document.createElement("span");
      const nameHeader = document.createElement("span");
      nameHeader.textContent = i18n.t("tagHeader", { count: tagDefinitions.length });
      const descriptionHeader = document.createElement("span");
      descriptionHeader.textContent = i18n.t("classificationDescription");
      const actionSpacer = document.createElement("span");
      configHeader.append(headerSpacer, nameHeader, descriptionHeader, actionSpacer);
      configList.appendChild(configHeader);
      tagDefinitions.slice().sort((left, right) => i18n.compare(left.name, right.name)).forEach((definition) => {
        const row = document.createElement("div");
        row.className = "codex-sidebar-tag-config-row";
        const swatch = document.createElement("span");
        swatch.className = "codex-sidebar-tag-config-swatch";
        swatch.style.setProperty("--codex-sidebar-tag-color", definition.color);
        const name = this.button("codex-sidebar-tag-config-name", definition.name);
        name.className = "codex-sidebar-tag-config-name";
        name.style.setProperty("--codex-sidebar-tag-color", definition.color);
        name.textContent = definition.name;
        name.title = i18n.t("editTag", { name: definition.name });
        name.setAttribute("aria-label", name.title);
        name.addEventListener("click", () => {
          editingName = definition.name;
          tagInput.value = definition.name;
          tagInput.readOnly = true;
          descriptionInput.value = definition.description;
          updateColor(definition.color);
          add.textContent = i18n.t("save");
          cancel.hidden = false;
          descriptionInput.focus();
        });
        const description = document.createElement("span");
        description.className = "codex-sidebar-tag-config-description";
        description.dataset.empty = String(!definition.description);
        description.textContent = definition.description || i18n.t("noClassificationDescription");
        description.title = definition.description || i18n.t("noClassificationDescription");
        const remove = this.button("codex-sidebar-tag-delete", "\xD7");
        remove.title = i18n.t("deleteTag", { name: definition.name });
        remove.setAttribute("aria-label", i18n.t("deleteTag", { name: definition.name }));
        remove.addEventListener("click", () => {
          if (remove.dataset.confirm !== "true") {
            remove.dataset.confirm = "true";
            remove.textContent = i18n.t("confirmDelete");
            remove.title = i18n.t("deleteImpact", { count: entries.filter((entry) => entry.tag.toLowerCase() === definition.name.toLowerCase()).length });
            remove.setAttribute("aria-label", remove.title);
            return;
          }
          onTagDefinitionsChanged(getTagDefinitions().filter((item) => item.name !== definition.name));
          this.deletedDefinition = definition;
          requestRender("tag-config-delete");
        });
        row.append(swatch, name, description, remove);
        configList.appendChild(row);
      });
      body.append(note, form, configList);
    }
    button(className, text) {
      const element = document.createElement("button");
      element.type = "button";
      element.className = className;
      element.textContent = text;
      return element;
    }
    renderTagsIcon(icon) {
      const namespace = "http://www.w3.org/2000/svg";
      const outline = document.createElementNS(namespace, "path");
      outline.setAttribute("d", "M2.25 2.25h4.32c.43 0 .84.17 1.14.47l5.61 5.61a1.6 1.6 0 0 1 0 2.27l-2.72 2.72a1.6 1.6 0 0 1-2.27 0L2.72 7.71a1.61 1.61 0 0 1-.47-1.14V2.25Z");
      outline.setAttribute("fill", "none");
      outline.setAttribute("stroke", "currentColor");
      outline.setAttribute("stroke-width", "1.15");
      outline.setAttribute("stroke-linejoin", "round");
      const aperture = document.createElementNS(namespace, "circle");
      aperture.setAttribute("cx", "5.15");
      aperture.setAttribute("cy", "5.15");
      aperture.setAttribute("r", ".82");
      aperture.setAttribute("fill", "currentColor");
      icon.replaceChildren(outline, aperture);
    }
  };

  // runtime/src/injected/host-lifecycle.ts
  var HostLifecycle = class {
    constructor(options) {
      this.options = options;
    }
    options;
    observer = null;
    queued = false;
    queuedFrame = null;
    queuedTimer = null;
    pointerActive = false;
    pendingRefresh = false;
    refreshCount = 0;
    get observerRefreshCount() {
      return this.refreshCount;
    }
    mount(root) {
      if (this.observer) return;
      document.addEventListener("pointerdown", this.trackPointerDown, true);
      document.addEventListener("pointerup", this.trackPointerEnd, true);
      document.addEventListener("pointercancel", this.trackPointerEnd, true);
      document.addEventListener("focusout", this.trackFocusOut, true);
      this.observer = new MutationObserver((mutations) => {
        if (!mutations.some(this.options.isRelevantMutation) || this.queued) return;
        this.refreshCount += 1;
        this.scheduleObserverRefresh();
      });
      this.observer.observe(root, { childList: true, subtree: true, characterData: true });
    }
    deferIfInteracting(reason) {
      const focusWithin = this.options.hasInteractionFocus();
      if (!this.pointerActive && !focusWithin) return false;
      this.pendingRefresh = true;
      this.options.trace("render-deferred", { reason, pointerActive: this.pointerActive, focusWithin });
      return true;
    }
    didRender() {
      this.pendingRefresh = false;
    }
    dispose() {
      this.observer?.disconnect();
      this.observer = null;
      if (this.queuedFrame !== null) cancelAnimationFrame(this.queuedFrame);
      if (this.queuedTimer !== null) clearTimeout(this.queuedTimer);
      this.queued = false;
      this.queuedFrame = null;
      this.queuedTimer = null;
      this.pointerActive = false;
      this.pendingRefresh = false;
      document.removeEventListener("pointerdown", this.trackPointerDown, true);
      document.removeEventListener("pointerup", this.trackPointerEnd, true);
      document.removeEventListener("pointercancel", this.trackPointerEnd, true);
      document.removeEventListener("focusout", this.trackFocusOut, true);
    }
    scheduleObserverRefresh() {
      this.queued = true;
      const flush = () => {
        if (!this.queued) return;
        this.queued = false;
        if (this.queuedFrame !== null) cancelAnimationFrame(this.queuedFrame);
        if (this.queuedTimer !== null) clearTimeout(this.queuedTimer);
        this.queuedFrame = null;
        this.queuedTimer = null;
        this.options.onRefresh("observer");
      };
      this.queuedFrame = requestAnimationFrame(flush);
      this.queuedTimer = setTimeout(flush, 32);
    }
    trackPointerDown = (event) => {
      if (!(event.target instanceof Node) || !this.options.isInsideOwnedSurface(event.target)) return;
      this.pointerActive = true;
      const control = event.target instanceof Element ? event.target.closest("button,select,input")?.className : null;
      this.options.trace("pointerdown", { control: control ?? "toolbar" });
    };
    trackPointerEnd = () => {
      if (!this.pointerActive) return;
      setTimeout(() => {
        this.pointerActive = false;
        this.options.trace("pointerend");
        this.flushDeferredRefresh();
      }, 0);
    };
    trackFocusOut = (event) => {
      if (!(event.target instanceof Node) || !this.options.isInsideOwnedSurface(event.target)) return;
      setTimeout(() => this.flushDeferredRefresh(), 0);
    };
    flushDeferredRefresh() {
      if (!this.pendingRefresh || this.pointerActive || this.options.hasInteractionFocus()) return;
      this.options.onRefresh("interaction-end");
    }
  };

  // runtime/src/injected/i18n.ts
  var zhCN = {
    add: () => "\u6DFB\u52A0",
    cancel: () => "\u53D6\u6D88",
    save: () => "\u4FDD\u5B58",
    editTag: ({ name }) => `\u7F16\u8F91 ${name} \u7684\u989C\u8272\u548C\u63CF\u8FF0`,
    confirmDelete: () => "\u786E\u8BA4\u5220\u9664",
    deleteImpact: ({ count }) => `\u5DF2\u53D1\u73B0 ${count} \u4E2A\u4F1A\u8BDD\u4F7F\u7528\u6B64\u6807\u7B7E\uFF1B\u53EA\u5220\u9664\u914D\u7F6E\uFF0C\u4E0D\u4FEE\u6539\u4F1A\u8BDD\u6807\u9898\u3002\u518D\u6B21\u70B9\u51FB\u786E\u8BA4\u3002`,
    undoDelete: ({ name }) => `\u64A4\u9500\u5220\u9664 ${name}`,
    tagLimit: () => "\u6700\u591A\u652F\u6301 32 \u4E2A\u6807\u7B7E",
    settingsSaveFailed: () => "\u6807\u7B7E\u4FDD\u5B58\u5931\u8D25\uFF0C\u5DF2\u6062\u590D\u5DF2\u4FDD\u5B58\u7684\u914D\u7F6E\u3002\u8BF7\u8FD0\u884C CLI doctor \u68C0\u67E5\u3002",
    catalogUnavailable: () => "\u672C\u5730\u4F1A\u8BDD\u76EE\u5F55\u6682\u4E0D\u53EF\u7528\uFF0C\u5F53\u524D\u4EC5\u5C55\u793A\u4FA7\u8FB9\u680F\u5DF2\u53D1\u73B0\u7684\u4F1A\u8BDD\u3002",
    all: () => "\u5168\u90E8",
    classificationDescription: () => "\u5206\u7C7B\u63CF\u8FF0",
    classificationDescriptionOptional: () => "\u5206\u7C7B\u63CF\u8FF0\uFF08\u53EF\u9009\uFF09",
    close: () => "\u5173\u95ED",
    closeDashboard: () => "\u5173\u95ED\u4F1A\u8BDD\u770B\u677F",
    configuredTags: ({ count }) => `${count} \u4E2A\u5DF2\u914D\u7F6E\u6807\u7B7E`,
    custom: () => "\u81EA\u5B9A\u4E49",
    customColor: () => "\u81EA\u5B9A\u4E49\u989C\u8272",
    customTagColor: () => "\u81EA\u5B9A\u4E49\u6807\u7B7E\u989C\u8272",
    deleteTag: ({ name }) => `\u5220\u9664 ${name} \u6807\u7B7E\u914D\u7F6E`,
    descriptionPlaceholder: () => "\u4F8B\u5982\uFF1A\u9700\u8981\u5B9A\u4F4D\u539F\u56E0\u6216\u8BC4\u4F30\u53EF\u884C\u6027\u7684\u4EFB\u52A1",
    duplicateTag: () => "\u8FD9\u4E2A\u6807\u7B7E\u5DF2\u7ECF\u5B58\u5728",
    filterByTag: () => "\u6309\u6807\u7B7E\u7B5B\u9009",
    filterSidebarByTag: () => "\u6309\u6807\u7B7E\u7B5B\u9009\u4FA7\u8FB9\u680F\u4F1A\u8BDD",
    indexOnDemand: ({ count }) => `${count} \u4E2A\u4F1A\u8BDD \xB7 \u672C\u5730\u7D22\u5F15\u6309\u9700\u52A0\u8F7D`,
    indexReady: ({ count }) => `${count} \u4E2A\u4F1A\u8BDD \xB7 \u672C\u5730\u7D22\u5F15\u5DF2\u5C31\u7EEA`,
    invalidTagName: () => "\u8BF7\u8F93\u5165 1\u201332 \u4E2A\u5B57\u7B26\uFF0C\u4E0D\u542B\u62EC\u53F7\uFF1BUncategorized \u4E3A\u4FDD\u7559\u540D\u79F0",
    launcherLabel: () => "\u6253\u5F00 Tags",
    nameAndContent: () => "\u540D\u79F0\u4E0E\u6B63\u6587",
    newTagName: () => "\u65B0\u6807\u7B7E\u540D\u79F0",
    noClassificationDescription: () => "\u672A\u8BBE\u7F6E\u5206\u7C7B\u63CF\u8FF0",
    noMatches: () => "\u6CA1\u6709\u5339\u914D\u7684\u4F1A\u8BDD",
    presetColors: () => "\u9884\u8BBE\u989C\u8272",
    resultCount: ({ visible, total }) => `${visible} / ${total} \u4E2A\u4F1A\u8BDD`,
    searchLabel: () => "\u641C\u7D22\u4F1A\u8BDD",
    searchPlaceholder: () => "\u641C\u7D22\u4F1A\u8BDD\u540D\u79F0\u6216\u5185\u5BB9\u2026",
    searchUnavailable: () => "\u672C\u5730\u641C\u7D22\u670D\u52A1\u5C1A\u672A\u8FDE\u63A5",
    searchingContent: () => "\u6B63\u5728\u641C\u7D22\u6B63\u6587\u2026",
    selectCustomColor: () => "\u9009\u62E9\u81EA\u5B9A\u4E49\u989C\u8272",
    sessionCount: ({ count }) => `${count} \u4E2A\u4F1A\u8BDD`,
    sessions: () => "\u4F1A\u8BDD",
    sessionsDashboard: () => "\u4F1A\u8BDD\u770B\u677F",
    settingsNote: () => "\u63CF\u8FF0\u5E2E\u52A9 AI \u5728\u9996\u6B21\u547D\u540D\u65F6\u9009\u62E9\u6807\u7B7E\uFF1B\u989C\u8272\u4EC5\u7528\u4E8E\u663E\u793A\u3002",
    sort: () => "\u6392\u5E8F",
    sortAria: () => "\u4F1A\u8BDD\u6392\u5E8F",
    sortDateDescending: () => "\u6700\u8FD1\u66F4\u65B0",
    sortDefault: () => "\u9ED8\u8BA4",
    sortTag: () => "\u6807\u7B7E",
    sortTitle: () => "\u6807\u9898",
    tagColor: () => "\u6807\u7B7E\u989C\u8272",
    tagDescription: () => "\u6807\u7B7E\u5206\u7C7B\u63CF\u8FF0",
    tagHeader: ({ count }) => `\u6807\u7B7E \xB7 ${count}`,
    tagName: () => "\u6807\u7B7E\u540D\u79F0",
    tagNamePlaceholder: () => "\u4F8B\u5982 Review",
    tagSettings: () => "\u6807\u7B7E\u8BBE\u7F6E",
    tags: () => "\u6807\u7B7E",
    unconfigured: ({ names }) => `\u672A\u914D\u7F6E\uFF1A${names}`,
    uncategorized: () => "\u672A\u5206\u7C7B"
  };
  var enUS = {
    add: () => "Add tag",
    cancel: () => "Cancel",
    save: () => "Save",
    editTag: ({ name }) => `Edit color and description for ${name}`,
    confirmDelete: () => "Confirm",
    deleteImpact: ({ count }) => `${count} known sessions use this tag. Only the configuration is removed; titles are unchanged. Click again to confirm.`,
    undoDelete: ({ name }) => `Undo deletion of ${name}`,
    tagLimit: () => "Up to 32 tags are supported",
    settingsSaveFailed: () => "Tags could not be saved. Saved settings were restored. Run CLI doctor to investigate.",
    catalogUnavailable: () => "Local catalog unavailable. Results currently include only sessions discovered in the sidebar.",
    all: () => "All",
    classificationDescription: () => "Classification description",
    classificationDescriptionOptional: () => "Classification description (optional)",
    close: () => "Close",
    closeDashboard: () => "Close session dashboard",
    configuredTags: ({ count }) => `${count} configured ${Number(count) === 1 ? "tag" : "tags"}`,
    custom: () => "Custom",
    customColor: () => "Custom color",
    customTagColor: () => "Custom tag color",
    deleteTag: ({ name }) => `Delete ${name} tag configuration`,
    descriptionPlaceholder: () => "For example: tasks that require investigation or feasibility analysis",
    duplicateTag: () => "This tag already exists",
    filterByTag: () => "Filter by tag",
    filterSidebarByTag: () => "Filter sidebar sessions by tag",
    indexOnDemand: ({ count }) => `${count} ${Number(count) === 1 ? "session" : "sessions"} \xB7 Index loads on demand`,
    indexReady: ({ count }) => `${count} ${Number(count) === 1 ? "session" : "sessions"} \xB7 Local index ready`,
    invalidTagName: () => "Enter 1\u201332 characters without brackets; Uncategorized is reserved",
    launcherLabel: () => "Open Tags",
    nameAndContent: () => "Title and content",
    newTagName: () => "New tag name",
    noClassificationDescription: () => "No classification description",
    noMatches: () => "No matching sessions",
    presetColors: () => "Preset colors",
    resultCount: ({ visible, total }) => `${visible} / ${total} ${Number(total) === 1 ? "session" : "sessions"}`,
    searchLabel: () => "Search sessions",
    searchPlaceholder: () => "Search session titles or content\u2026",
    searchUnavailable: () => "Local search service is not connected",
    searchingContent: () => "Searching content\u2026",
    selectCustomColor: () => "Choose a custom color",
    sessionCount: ({ count }) => `${count} ${Number(count) === 1 ? "session" : "sessions"}`,
    sessions: () => "Sessions",
    sessionsDashboard: () => "Sessions",
    settingsNote: () => "Descriptions help AI choose a tag when first naming a session; colors only affect display.",
    sort: () => "Sort",
    sortAria: () => "Sort sessions",
    sortDateDescending: () => "Recently updated",
    sortDefault: () => "Default",
    sortTag: () => "Tag",
    sortTitle: () => "Title",
    tagColor: () => "Tag color",
    tagDescription: () => "Tag classification description",
    tagHeader: ({ count }) => `Tags \xB7 ${count}`,
    tagName: () => "Tag name",
    tagNamePlaceholder: () => "For example: Review",
    tagSettings: () => "Tag settings",
    tags: () => "Tags",
    unconfigured: ({ names }) => `Not configured: ${names}`,
    uncategorized: () => "Uncategorized"
  };
  var messages = {
    "en-US": enUS,
    "zh-CN": zhCN
  };
  var colorNames = {
    "en-US": {
      "\u6D77\u84DD": "Ocean blue",
      "\u9E22\u7D2B": "Violet",
      "\u73CA\u745A": "Coral",
      "\u7425\u73C0": "Amber",
      "\u677E\u7EFF": "Pine green",
      "\u96FE\u7070": "Mist gray"
    },
    "zh-CN": {
      "\u6D77\u84DD": "\u6D77\u84DD",
      "\u9E22\u7D2B": "\u9E22\u7D2B",
      "\u73CA\u745A": "\u73CA\u745A",
      "\u7425\u73C0": "\u7425\u73C0",
      "\u677E\u7EFF": "\u677E\u7EFF",
      "\u96FE\u7070": "\u96FE\u7070"
    }
  };
  function resolveUiLocale(language) {
    return language?.trim().toLocaleLowerCase().startsWith("zh") ? "zh-CN" : "en-US";
  }
  function readCodexLocale() {
    return resolveUiLocale(document.documentElement.lang || navigator.language);
  }
  var RuntimeI18n = class {
    currentLocale;
    constructor(language) {
      this.currentLocale = language === void 0 ? readCodexLocale() : resolveUiLocale(language);
    }
    get locale() {
      return this.currentLocale;
    }
    setLocale(locale) {
      if (locale === this.currentLocale) return false;
      this.currentLocale = locale;
      return true;
    }
    t(key, params = {}) {
      return messages[this.currentLocale][key](params);
    }
    compare(left, right) {
      return left.localeCompare(right, this.currentLocale);
    }
    colorName(name) {
      return colorNames[this.currentLocale][name] ?? name;
    }
  };
  function observeCodexLocale(onChange) {
    const observer = new MutationObserver(() => onChange(readCodexLocale()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }

  // runtime/src/injected/runtime-client.ts
  var RuntimeClient = class {
    constructor(bindingName, onMessage, onRejectedMessage, resolveBinding = (name) => window[name]) {
      this.bindingName = bindingName;
      this.onMessage = onMessage;
      this.onRejectedMessage = onRejectedMessage;
      this.resolveBinding = resolveBinding;
    }
    bindingName;
    onMessage;
    onRejectedMessage;
    resolveBinding;
    protocolVersion = RUNTIME_PROTOCOL_VERSION;
    get connected() {
      return typeof this.resolveBinding(this.bindingName) === "function";
    }
    send(type, payload, requestId) {
      const binding = this.resolveBinding(this.bindingName);
      if (typeof binding !== "function") return false;
      binding(JSON.stringify(createRuntimeMessage(type, payload, requestId)));
      return true;
    }
    handle(value) {
      const parsed = parseRuntimeMessage(value);
      if (!parsed.ok) {
        this.onRejectedMessage(parsed.reason);
        return false;
      }
      return this.onMessage(parsed.message);
    }
  };

  // runtime/src/injected/runtime-config.ts
  var HEX_COLOR = /^#[0-9a-f]{6}$/iu;
  function isRecord(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }
  function parseRuntimeConfig(value) {
    if (!isRecord(value)) throw new Error("Invalid Codex Tags runtime config");
    if (typeof value.version !== "string" || !value.version.trim()) throw new Error("Invalid Codex Tags runtime version");
    if (value.protocolVersion !== RUNTIME_PROTOCOL_VERSION) throw new Error(`Unsupported Codex Tags protocol ${String(value.protocolVersion)}`);
    if (value.settingsSource !== "repository" && value.settingsSource !== "defaults") throw new Error("Invalid Codex Tags settings source");
    if (typeof value.requestBinding !== "string" || !/^__[A-Za-z0-9]+$/u.test(value.requestBinding)) throw new Error("Invalid Codex Tags runtime binding");
    if (!Array.isArray(value.tagDefinitions)) throw new Error("Invalid Codex Tags tag definitions");
    const colorPresets = Array.isArray(value.colorPresets) ? value.colorPresets.flatMap((item) => {
      if (!isRecord(item) || typeof item.name !== "string" || typeof item.color !== "string" || !HEX_COLOR.test(item.color)) return [];
      return [{ name: item.name.trim(), color: item.color.toLocaleLowerCase() }];
    }) : [];
    if (colorPresets.length === 0) throw new Error("Invalid Codex Tags color presets");
    if (!isRecord(value.legacyToneColors)) throw new Error("Invalid Codex Tags legacy colors");
    const legacyToneColors = Object.fromEntries(
      Object.entries(value.legacyToneColors).filter((entry) => typeof entry[1] === "string" && HEX_COLOR.test(entry[1]))
    );
    if (!legacyToneColors.neutral || !legacyToneColors.blue) throw new Error("Codex Tags neutral and blue colors are required");
    return {
      version: value.version,
      protocolVersion: value.protocolVersion,
      tagDefinitions: normalizeTagDefinitions(value.tagDefinitions, []),
      settingsSource: value.settingsSource,
      colorPresets,
      legacyToneColors,
      requestBinding: value.requestBinding
    };
  }

  // runtime/src/injected/session-registry.ts
  var SessionRegistry = class {
    constructor(storage, cacheKey, parseTitle, colorForTag) {
      this.storage = storage;
      this.cacheKey = cacheKey;
      this.parseTitle = parseTitle;
      this.colorForTag = colorForTag;
      this.restore();
    }
    storage;
    cacheKey;
    parseTitle;
    colorForTag;
    catalogIds = null;
    entriesByKey = /* @__PURE__ */ new Map();
    persistedCacheJson = null;
    ingest(nodes, bindings) {
      nodes.forEach((node, index) => {
        const raw = node.getAttribute(bindings.rawTitleAttribute) ?? node.textContent?.trim() ?? "";
        const parsed = this.parseTitle(raw);
        if (!parsed) return;
        const row = bindings.rowForTitle(node);
        row?.setAttribute(bindings.rowAttribute, "true");
        const threadId = bindings.threadIdForRow(row);
        const localId = threadId?.replace(/^local:/u, "");
        const key = localId ?? `title:${raw}`;
        if (this.catalogIds && localId && !localId.includes(":") && !this.catalogIds.has(localId)) return;
        const pinned = bindings.isPinnedRow(row);
        if (pinned) {
          const toggle = bindings.sectionToggleForRow(row);
          if (toggle) bindings.onPinnedToggle(toggle);
        }
        this.entriesByKey.set(key, {
          ...this.entriesByKey.get(key),
          ...parsed,
          key,
          threadId,
          node,
          row,
          index: this.entriesByKey.get(key)?.index ?? index,
          pinned,
          projectId: bindings.projectIdForRow(row)
        });
      });
      this.persist();
      return this.values();
    }
    values() {
      return Array.from(this.entriesByKey.values(), (entry) => ({
        ...entry,
        node: entry.node?.isConnected ? entry.node : null,
        row: entry.row?.isConnected ? entry.row : null
      }));
    }
    applyCatalog(items) {
      const ids = /* @__PURE__ */ new Set();
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const candidate = item;
        if (typeof candidate.threadId !== "string" || typeof candidate.raw !== "string") continue;
        const parsed = this.parseTitle(candidate.raw);
        if (!parsed) continue;
        const key = candidate.threadId;
        ids.add(key);
        this.entriesByKey.set(key, {
          ...this.entriesByKey.get(key),
          ...parsed,
          key,
          threadId: this.entriesByKey.get(key)?.threadId ?? key,
          updatedAt: typeof candidate.updatedAt === "number" && Number.isFinite(candidate.updatedAt) ? candidate.updatedAt : 0,
          index: this.entriesByKey.get(key)?.index ?? ids.size,
          pinned: typeof candidate.pinned === "boolean" ? candidate.pinned : this.entriesByKey.get(key)?.pinned ?? false,
          projectId: typeof candidate.projectId === "string" ? candidate.projectId : this.entriesByKey.get(key)?.projectId ?? null
        });
      }
      this.catalogIds = ids;
      for (const [key, entry] of this.entriesByKey) {
        const localId = entry.threadId?.replace(/^local:/u, "");
        if (localId && !localId.includes(":") && !ids.has(localId)) this.entriesByKey.delete(key);
      }
      this.persist();
    }
    updateColors() {
      this.entriesByKey.forEach((entry) => {
        entry.color = this.colorForTag(entry.tag);
      });
      this.persist();
    }
    reparse() {
      this.entriesByKey.forEach((entry) => {
        const parsed = this.parseTitle(entry.raw);
        if (parsed) Object.assign(entry, parsed);
      });
      this.persist();
    }
    delete(key) {
      this.entriesByKey.delete(key);
      this.persist();
    }
    threadIds() {
      return Array.from(this.entriesByKey.values(), ({ threadId }) => threadId).filter((threadId) => Boolean(threadId));
    }
    debugIndex() {
      return Array.from(this.entriesByKey.values(), ({ key, threadId, title, projectId, pinned }) => ({ key, threadId, title, projectId, pinned }));
    }
    get size() {
      return this.entriesByKey.size;
    }
    clearPersistentCache() {
      try {
        this.storage.removeItem(this.cacheKey);
      } catch {
      }
    }
    restore() {
      try {
        const savedEntries = JSON.parse(this.storage.getItem(this.cacheKey) ?? "[]");
        if (!Array.isArray(savedEntries)) return;
        savedEntries.forEach((candidate) => {
          if (!candidate || typeof candidate !== "object") return;
          const entry = candidate;
          if (typeof entry.key !== "string" || typeof entry.raw !== "string" || typeof entry.tag !== "string") return;
          const key = entry.threadId?.replace(/^local:/u, "") ?? entry.key;
          this.entriesByKey.set(key, {
            ...entry,
            key,
            color: this.colorForTag(entry.tag),
            node: null,
            row: null
          });
        });
        this.persistedCacheJson = JSON.stringify(savedEntries);
      } catch {
      }
    }
    persist() {
      try {
        const savedEntries = Array.from(this.entriesByKey.values(), ({ node: _node, row: _row, ...entry }) => entry);
        const nextCacheJson = JSON.stringify(savedEntries);
        if (nextCacheJson === this.persistedCacheJson) return;
        this.storage.setItem(this.cacheKey, nextCacheJson);
        this.persistedCacheJson = nextCacheJson;
      } catch {
      }
    }
  };

  // runtime/src/injected/sidebar-tag-order.ts
  var SidebarTagOrder = class {
    originals = /* @__PURE__ */ new Map();
    apply(groups, definitions, tagForTitle) {
      const configured = definitions.map((name) => name.toLocaleLowerCase());
      const active = /* @__PURE__ */ new Set();
      for (const group of groups) {
        const tags = group.map(({ title }) => tagForTitle(title).toLocaleLowerCase());
        const unknown = [...new Set(tags.filter((tag) => !configured.includes(tag)))].sort();
        const order = [...configured, ...unknown];
        group.forEach(({ element }, index) => {
          active.add(element);
          if (!this.originals.has(element)) this.originals.set(element, {
            value: element.style.getPropertyValue("order"),
            priority: element.style.getPropertyPriority("order")
          });
          const value = String(order.indexOf(tags[index]) - order.length);
          if (element.style.order !== value) element.style.setProperty("order", value);
        });
      }
      for (const element of this.originals.keys()) if (!active.has(element)) this.restore(element);
    }
    dispose() {
      for (const element of this.originals.keys()) this.restore(element);
    }
    restore(element) {
      const original = this.originals.get(element);
      if (original.value) element.style.setProperty("order", original.value, original.priority);
      else element.style.removeProperty("order");
      this.originals.delete(element);
    }
  };

  // runtime/src/injected/sidebar-tag-filter.ts
  var SidebarTagFilter = class {
    constructor(options) {
      this.options = options;
    }
    options;
    apply() {
      const selectedTag = this.options.getSelectedTag();
      const selected = selectedTag.toLocaleLowerCase();
      if (selectedTag === "all") document.documentElement.removeAttribute(this.options.activeAttribute);
      else document.documentElement.setAttribute(this.options.activeAttribute, "true");
      this.options.getRows().forEach(({ row, tag }) => {
        if (!row.isConnected) return;
        const matches = selectedTag === "all" || tag.toLocaleLowerCase() === selected;
        if (matches) row.removeAttribute(this.options.filteredAttribute);
        else row.setAttribute(this.options.filteredAttribute, "true");
      });
    }
    render() {
      const mounted = this.options.ensureHost();
      if (!mounted) return;
      const { filterHost, pinnedToggle } = mounted;
      const previousRail = filterHost.querySelector(".codex-sidebar-quick-filter-rail");
      const previousScrollLeft = previousRail?.scrollLeft ?? 0;
      const focusedValue = filterHost.contains(document.activeElement) ? document.activeElement?.closest(".codex-sidebar-quick-filter")?.dataset.value : null;
      filterHost.replaceChildren();
      const heading = document.createElement("div");
      heading.className = "codex-sidebar-tags-section-heading";
      heading.textContent = "Tags";
      const pinnedStyle = getComputedStyle(pinnedToggle);
      ["color", "font-family", "font-size", "font-style", "font-weight", "letter-spacing", "line-height", "padding-left", "padding-right"].forEach((property) => heading.style.setProperty(property, pinnedStyle.getPropertyValue(property)));
      const counts = /* @__PURE__ */ new Map();
      const rows = this.options.getRows().filter(({ row }) => row.isConnected);
      rows.forEach(({ tag }) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
      const configuredOrder = new Map(this.options.getDefinitions().map(({ name }, index) => [name.toLocaleLowerCase(), index]));
      const filters = [{ value: "all", label: this.options.i18n.t("all"), count: rows.length, color: null }];
      Array.from(counts, ([tag, count]) => ({
        value: tag,
        label: tag,
        count,
        color: this.options.colorForTag(tag) ?? this.options.neutralColor
      })).sort((left, right) => {
        const leftOrder = configuredOrder.get(left.value.toLocaleLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = configuredOrder.get(right.value.toLocaleLowerCase()) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder || this.options.i18n.compare(left.label, right.label);
      }).forEach((item) => filters.push(item));
      const rail = document.createElement("div");
      rail.className = "codex-sidebar-quick-filter-rail";
      rail.setAttribute("role", "group");
      rail.setAttribute("aria-label", this.options.i18n.t("tags"));
      rail.style.paddingLeft = pinnedStyle.paddingLeft;
      rail.style.paddingRight = pinnedStyle.paddingRight;
      filters.forEach(({ value, label, count, color }) => {
        const filter = document.createElement("button");
        filter.type = "button";
        filter.className = "codex-sidebar-quick-filter";
        filter.textContent = label;
        filter.dataset.value = value;
        if (color) filter.style.setProperty("--codex-sidebar-tag-color", color);
        filter.setAttribute("aria-pressed", String(this.options.getSelectedTag() === value));
        filter.title = `${label} \xB7 ${this.options.i18n.t("sessionCount", { count })}`;
        const badge = document.createElement("span");
        badge.className = "codex-sidebar-quick-filter-count";
        badge.textContent = String(count);
        filter.appendChild(badge);
        filter.addEventListener("click", () => {
          const next = this.options.getSelectedTag() === value && value !== "all" ? "all" : value;
          this.options.setSelectedTag(next);
          this.options.trace("sidebar-tag-click", { value, selected: next });
          this.render();
        });
        rail.appendChild(filter);
      });
      filterHost.append(heading, rail);
      rail.scrollLeft = previousScrollLeft;
      this.apply();
      if (focusedValue) {
        const filterButtons = [...rail.querySelectorAll(".codex-sidebar-quick-filter")];
        const nextFocus = filterButtons.find((item) => item.dataset.value === focusedValue) ?? filterButtons.find((item) => item.dataset.value === this.options.getSelectedTag());
        nextFocus?.focus({ preventScroll: true });
        rail.scrollLeft = previousScrollLeft;
      }
    }
    dispose(filteredRows) {
      for (const row of filteredRows) row.removeAttribute(this.options.filteredAttribute);
      document.documentElement.removeAttribute(this.options.activeAttribute);
      document.getElementById(this.options.hostId)?.remove();
    }
  };

  // runtime/src/injected/store.ts
  function createInitialState() {
    return {
      query: "",
      tag: "all",
      sort: "sidebar",
      sortOpen: false,
      open: false,
      view: "sessions",
      tagError: ""
    };
  }
  function reduceRuntimeState(state, action) {
    if (action.type === "query.set") return { ...state, query: action.value };
    if (action.type === "tag.set") return { ...state, tag: action.value };
    if (action.type === "sort.set") return { ...state, sort: action.value, sortOpen: false };
    if (action.type === "sort-menu.set") return { ...state, sortOpen: action.value };
    if (action.type === "view.set") return { ...state, view: action.value, sortOpen: false, tagError: "" };
    if (action.type === "tag-error.set") return { ...state, tagError: action.value };
    if (action.type === "dashboard.open") return { ...state, open: true, view: "sessions", sortOpen: false };
    if (action.type === "dashboard.close") return { ...state, open: false, sortOpen: false };
    return { ...state, query: "", tag: "all", sortOpen: false };
  }
  var RuntimeStore = class {
    state;
    constructor(initialState = createInitialState()) {
      this.state = initialState;
    }
    dispatch(action) {
      Object.assign(this.state, reduceRuntimeState(this.state, action));
    }
  };

  // runtime/src/injected/styles.ts
  function buildRuntimeStyles({
    enhancedAttribute,
    toolbarId,
    filterBarId,
    filteredAttribute,
    rowAttribute
  }) {
    const ENHANCED = enhancedAttribute;
    const TOOLBAR_ID = toolbarId;
    const FILTER_BAR_ID = filterBarId;
    const FILTERED = filteredAttribute;
    const ROW = rowAttribute;
    return `

    [${ENHANCED}] { min-width: 0; }
    .codex-sidebar-tag-layout { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 6px; min-width: 0; max-width: 100%; vertical-align: middle; }
    .codex-sidebar-filter-chip {
      display: inline-flex; flex: 0 0 auto; align-items: center; border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      border-radius: 999px; font-weight: 650; letter-spacing: .01em;
    }
    .codex-sidebar-tag-chip, .codex-sidebar-result-tag {
      display: inline-flex; align-items: center; min-width: 0; height: 18px; padding: 0;
      border: 0; color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-tertiary, #777)) 44%, var(--color-text-tertiary, var(--color-token-text-tertiary, #777)));
      background: transparent; font-size: 10px; font-weight: 600; line-height: 18px; white-space: nowrap; transition: color 120ms ease;
    }
    [${ROW}="true"]:hover .codex-sidebar-tag-chip { color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-secondary, #999)) 68%, var(--color-text-secondary, var(--color-token-text-secondary, #999))); }
    .codex-sidebar-tag-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    #${FILTER_BAR_ID} { min-width: 0; margin: 0 0 6px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); }
    .codex-sidebar-tags-section-heading { min-height: 28px; margin: 0; pointer-events: none; }
    .codex-sidebar-quick-filter-rail {
      display: flex; min-width: 0; gap: 3px; padding: 1px 4px 5px; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none;
    }
    .codex-sidebar-quick-filter-rail::-webkit-scrollbar { display: none; }
    .codex-sidebar-quick-filter {
      display: inline-flex; flex: 0 0 auto; align-items: center; min-height: 26px; gap: 4px; padding: 0 7px; border: 0; border-radius: 6px;
      color: var(--color-text-secondary, var(--color-token-text-secondary, inherit)); background: transparent; font: inherit; font-size: 12px; cursor: pointer;
      transition: color 100ms ease, background 100ms ease, transform 100ms ease;
    }
    .codex-sidebar-quick-filter:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-quick-filter:active { transform: scale(.97); }
    .codex-sidebar-quick-filter:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: -2px; }
    .codex-sidebar-quick-filter:not([data-value="all"]) { color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-secondary, inherit)) 36%, var(--color-text-secondary, var(--color-token-text-secondary, inherit))); }
    .codex-sidebar-quick-filter[aria-pressed="true"] {
      color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-foreground, inherit)) 86%, var(--color-text-foreground, var(--color-token-list-active-selection-foreground, inherit)));
      background: color-mix(in srgb, var(--codex-sidebar-tag-color, #888) 9%, var(--color-token-list-active-selection-background, #8883));
    }
    .codex-sidebar-quick-filter-count { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; font-variant-numeric: tabular-nums; }
    [${ROW}="true"][${FILTERED}="true"] { display: none !important; }

    #${TOOLBAR_ID} {
      display: contents; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
    }
    .codex-sidebar-dashboard-entry { display: contents; }
    .codex-sidebar-dashboard-launcher { width: 100%; color: inherit; font: inherit; }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"] {
      display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 12px; border: 0; border-radius: 6px;
      background: transparent; text-align: left; cursor: pointer; transition: background 100ms ease, transform 100ms ease;
    }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"]:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-dashboard-launcher:active { transform: scale(.985); }
    .codex-sidebar-dashboard-launcher:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: -2px; }

    .codex-sidebar-dashboard-overlay {
      position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px;
      background: #0006; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    }
    .codex-sidebar-dashboard-dialog {
      display: flex; width: min(680px, calc(100vw - 40px)); max-height: min(720px, calc(100vh - 48px)); flex-direction: column;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 16px;
      color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: var(--color-background-elevated-base, var(--color-token-menu-background, #181818));
      box-shadow: 0 24px 70px #0007, 0 4px 18px #0003; overflow: hidden; transform-origin: 50% 45%;
    }
    .codex-sidebar-dashboard-header { display: flex; align-items: center; gap: 12px; padding: 15px 16px 12px; border-bottom: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); }
    .codex-sidebar-dashboard-heading { margin: 0; font-size: 17px; font-weight: 650; }
    .codex-sidebar-dashboard-subtitle { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-dashboard-tabs { display: flex; gap: 3px; margin-left: auto; padding: 3px; border-radius: 8px; background: var(--color-background-control, var(--color-token-input-background, #8881)); }
    .codex-sidebar-dashboard-tab { height: 29px; padding: 0 11px; border: 0; border-radius: 6px; color: var(--color-text-secondary, inherit); background: transparent; font: inherit; font-size: 12px; cursor: pointer; transition: color 120ms ease, background 120ms ease, box-shadow 120ms ease, transform 100ms ease; }
    .codex-sidebar-dashboard-tab[aria-selected="true"] { color: var(--color-text-foreground, inherit); background: var(--color-background-elevated-high, var(--color-token-list-active-selection-background, #8883)); box-shadow: 0 1px 2px #0002; }
    .codex-sidebar-dashboard-tab:active, .codex-sidebar-dashboard-close:active, .codex-sidebar-sort-trigger:active, .codex-sidebar-tag-add:active, .codex-sidebar-tag-delete:active { transform: scale(.97); }
    .codex-sidebar-dashboard-close { display: grid; width: 28px; height: 28px; place-items: center; padding: 0; border: 0; border-radius: 7px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; font-size: 17px; cursor: pointer; transition: color 100ms ease, background 100ms ease, transform 100ms ease; }
    .codex-sidebar-dashboard-close:hover { color: var(--color-text-foreground, inherit); background: var(--color-token-toolbar-hover-background, #8882); }
    .codex-sidebar-dashboard-body { min-height: 0; padding: 14px 16px 16px; overflow-y: auto; }
    .codex-sidebar-dashboard-controls { display: flex; align-items: center; gap: 8px; }
    .codex-sidebar-search {
      display: flex; flex: 1 1 auto; align-items: center; min-width: 0; height: 36px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      background: var(--color-background-control, var(--color-token-input-background, #8881)); transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .codex-sidebar-search:focus-within {
      border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff));
      background: var(--color-background-control-opaque, var(--color-token-input-background, #8882));
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent);
    }
    .codex-sidebar-search-icon { width: 29px; flex: 0 0 29px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 15px; text-align: center; pointer-events: none; }
    .codex-sidebar-search[data-loading="true"] .codex-sidebar-search-icon { font-size: 0; }
    .codex-sidebar-search[data-loading="true"] .codex-sidebar-search-icon::after {
      display: inline-block; width: 11px; height: 11px; border: 1.5px solid color-mix(in srgb, currentColor 30%, transparent); border-top-color: currentColor; border-radius: 50%; content: ""; animation: codex-sidebar-search-spin 700ms linear infinite;
    }
    @keyframes codex-sidebar-search-spin { to { transform: rotate(360deg); } }
    .codex-sidebar-search-input {
      width: 100%; min-width: 0; border: 0; outline: 0; padding: 0 7px 0 0; color: var(--color-text-foreground, var(--color-token-input-foreground, inherit));
      background: transparent; font: inherit; font-size: 14px;
    }
    .codex-sidebar-search-input::placeholder { color: var(--color-text-tertiary, var(--color-token-input-placeholder-foreground, #888)); }
    .codex-sidebar-sort-control {
      position: relative; display: flex; flex: 0 0 144px; align-items: center; height: 36px;
    }
    .codex-sidebar-sort-trigger {
      display: flex; width: 100%; height: 36px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      color: var(--color-text-foreground, var(--color-token-input-foreground, inherit)); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px; cursor: pointer; transition: border-color 120ms ease, background 100ms ease, box-shadow 120ms ease, transform 100ms ease;
    }
    .codex-sidebar-sort-trigger:hover { background: var(--color-background-control-opaque, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-sort-trigger:focus-visible, .codex-sidebar-sort-trigger[aria-expanded="true"] { outline: 0; border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-sort-label { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); pointer-events: none; }
    .codex-sidebar-sort-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .codex-sidebar-sort-chevron { width: 7px; height: 7px; margin: -3px 2px 0 auto; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; opacity: .7; transform: rotate(45deg); transition: transform 120ms ease; }
    .codex-sidebar-sort-trigger[aria-expanded="true"] .codex-sidebar-sort-chevron { margin-top: 3px; transform: rotate(225deg); }
    .codex-sidebar-sort-menu {
      position: absolute; top: calc(100% + 5px); right: 0; z-index: 8; width: 144px; padding: 4px;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 9px;
      color: var(--color-text-foreground, var(--color-token-dropdown-foreground, inherit)); background: var(--color-background-elevated-high, var(--color-token-menu-background, #202020));
      box-shadow: 0 12px 32px #0006, 0 2px 8px #0003; transform-origin: top right;
    }
    .codex-sidebar-sort-option { display: flex; width: 100%; height: 32px; align-items: center; padding: 0 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; text-align: left; cursor: pointer; transition: background 100ms ease; }
    .codex-sidebar-sort-option:hover, .codex-sidebar-sort-option:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-sort-option[aria-selected="true"] { background: var(--color-token-list-active-selection-background, #8883); }
    .codex-sidebar-sort-check { width: 14px; margin-left: auto; color: var(--color-text-secondary, inherit); text-align: center; }
    .codex-sidebar-filter-rail { display: flex; gap: 5px; margin-top: 10px; padding: 0 1px 2px; overflow-x: auto; scrollbar-width: none; }
    .codex-sidebar-filter-rail::-webkit-scrollbar { display: none; }
    .codex-sidebar-filter-chip {
      height: 27px; padding: 0 7px; border-color: transparent; color: var(--color-text-secondary, var(--color-token-text-secondary, inherit));
      background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 12px; cursor: pointer; transition: transform 100ms ease, color 100ms ease, background 100ms ease;
    }
    .codex-sidebar-filter-chip:hover { background: var(--color-background-control, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-filter-chip:active { transform: scale(.97); }
    .codex-sidebar-filter-chip[aria-pressed="true"] {
      color: var(--color-text-foreground, var(--color-token-list-active-selection-foreground, inherit));
      border-color: var(--color-border-light, var(--color-token-border-light, #8884));
      background: var(--color-background-elevated-base, var(--color-token-list-active-selection-background, #8883)); box-shadow: 0 1px 2px #0001;
    }
    .codex-sidebar-filter-count { margin-left: 4px; opacity: .62; font-variant-numeric: tabular-nums; }
    .codex-sidebar-results {
      margin-top: 12px; padding: 6px; border: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius: 11px;
      background: var(--color-background-surface, var(--color-token-bg-secondary, #8881)); overflow-anchor: none; transition: opacity 120ms ease;
    }
    .codex-sidebar-results[data-loading="true"] { opacity: .78; }
    .codex-sidebar-results-head { display: flex; align-items: center; justify-content: space-between; min-height: 26px; padding: 0 5px 5px 7px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-results-list { max-height: min(430px, calc(100vh - 250px)); overflow-y: auto; overscroll-behavior: contain; }
    .codex-sidebar-result-group {
      position: sticky; top: 0; z-index: 1; padding: 5px 7px 3px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888));
      background: var(--color-background-elevated-base, var(--color-token-menu-background, #181818)); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    }
    .codex-sidebar-result {
      display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 8px; width: 100%; min-height: 40px; padding: 8px;
      border: 0; border-radius: 8px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: transparent; text-align: left; font: inherit; cursor: pointer; transition: background 100ms ease, transform 100ms ease;
    }
    .codex-sidebar-result:hover, .codex-sidebar-result:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-result:active { transform: scale(.995); }
    .codex-sidebar-result-tag { font-size: 11px; }
    .codex-sidebar-result-content { min-width: 0; }
    .codex-sidebar-result-title { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 1.4; }
    .codex-sidebar-result-snippet { display: -webkit-box; margin-top: 4px; overflow: hidden; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .codex-sidebar-search-mark {
      padding: 0 1px; border-radius: 3px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
      background: color-mix(in srgb, var(--color-border-focus, var(--color-token-focus-border, #4b8cff)) 32%, transparent);
      font-weight: 650; box-decoration-break: clone; -webkit-box-decoration-break: clone; animation: codex-sidebar-search-mark-in 180ms ease-out;
    }
    @keyframes codex-sidebar-search-mark-in { from { background-color: transparent; } }
    .codex-sidebar-results-empty { padding: 17px 8px 19px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 13px; text-align: center; }
    .codex-sidebar-tag-settings-note { margin: 0 0 14px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; line-height: 1.45; }
    .codex-sidebar-tag-settings-unconfigured { display: inline-flex; margin-left: 7px; padding: 1px 6px; border-radius: 5px; color: var(--color-text-secondary, inherit); background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-tag-form { display: grid; gap: 9px; margin-bottom: 14px; padding: 0 0 14px; border-bottom: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); }
    .codex-sidebar-tag-form-row { display: grid; grid-template-columns: minmax(130px, .7fr) minmax(220px, 1.5fr) auto; align-items: end; gap: 8px; }
    .codex-sidebar-tag-field { display: grid; min-width: 0; gap: 5px; }
    .codex-sidebar-tag-field-label { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; font-weight: 600; }
    .codex-sidebar-tag-input, .codex-sidebar-tag-description {
      min-width: 0; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px; outline: 0;
      color: var(--color-text-foreground, inherit); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px;
    }
    .codex-sidebar-tag-input { height: 34px; padding: 0 9px; }
    .codex-sidebar-tag-description { height: 34px; padding: 0 9px; }
    .codex-sidebar-tag-input:focus, .codex-sidebar-tag-description:focus, .codex-sidebar-tag-color-custom:focus-visible { border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-tag-color-field { display: flex; min-width: 0; align-items: center; gap: 10px; }
    .codex-sidebar-tag-color-field > .codex-sidebar-tag-field-label { flex: 0 0 auto; }
    .codex-sidebar-tag-color-row { display: flex; min-width: 0; align-items: center; gap: 5px; }
    .codex-sidebar-tag-color-presets { display: flex; align-items: center; gap: 3px; }
    .codex-sidebar-tag-color-preset { display: grid; width: 27px; height: 27px; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 7px; background: transparent; cursor: pointer; }
    .codex-sidebar-tag-color-preset::after { display: block; width: 14px; height: 14px; border-radius: 999px; background: var(--preset-color); box-shadow: inset 0 0 0 1px #fff4; content: ""; }
    .codex-sidebar-tag-color-preset:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-tag-color-preset[aria-pressed="true"] { border-color: var(--color-border-light, #8884); background: var(--color-token-list-active-selection-background, #8883); }
    .codex-sidebar-tag-color-preset:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: 1px; }
    .codex-sidebar-tag-color-custom-control { position: relative; display: inline-flex; height: 27px; align-items: center; gap: 6px; margin-left: 3px; padding: 0 8px 0 6px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 7px; color: var(--color-text-secondary, inherit); background: transparent; font-size: 11px; cursor: pointer; }
    .codex-sidebar-tag-color-custom-control:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-tag-color-custom-preview { width: 12px; height: 12px; border-radius: 3px; background: var(--custom-color); box-shadow: inset 0 0 0 1px #fff4; }
    .codex-sidebar-tag-color-custom { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .codex-sidebar-tag-color-custom:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: 1px; }
    .codex-sidebar-tag-add { height: 34px; padding: 0 13px; border: 1px solid var(--color-border-light, #8884); border-radius: 8px; color: var(--color-token-button-foreground, inherit); background: var(--color-token-button-background, #8882); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 100ms ease, transform 100ms ease; }
    .codex-sidebar-tag-add:hover { background: var(--color-token-list-hover-background, #8883); }
    .codex-sidebar-tag-error { color: #c53b3b; font-size: 12px; }
    .codex-sidebar-tag-error:empty { display: none; }
    .codex-sidebar-tag-config-list { overflow: hidden; border: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius: 10px; }
    .codex-sidebar-tag-config-header, .codex-sidebar-tag-config-row { display: grid; grid-template-columns: 12px minmax(92px, .55fr) minmax(0, 1.8fr) 28px; align-items: center; gap: 9px; padding: 0 7px 0 11px; }
    .codex-sidebar-tag-config-header { min-height: 30px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); background: var(--color-background-surface, var(--color-token-bg-secondary, #8881)); font-size: 10px; font-weight: 600; }
    .codex-sidebar-tag-config-row { min-height: 40px; border-top: 1px solid var(--color-border-light, var(--color-token-border-light, #8882)); background: transparent; transition: background 100ms ease; }
    .codex-sidebar-tag-config-row:hover { background: var(--color-token-list-hover-background, #8881); }
    .codex-sidebar-tag-config-swatch { width: 9px; height: 9px; border-radius: 3px; background: var(--codex-sidebar-tag-color); box-shadow: inset 0 0 0 1px #fff3; }
    .codex-sidebar-tag-config-name { min-width: 0; color: var(--color-text-foreground, inherit); font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 0; background: transparent; padding: 0; text-align: left; cursor: pointer; }
    .codex-sidebar-tag-config-name:hover { text-decoration: underline; }
    .codex-sidebar-tag-delete[data-confirm="true"] { width: auto; font-size: 10px; }
    .codex-sidebar-tag-config-description { min-width: 0; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .codex-sidebar-tag-config-description[data-empty="true"] { opacity: .6; font-style: italic; }
    .codex-sidebar-tag-delete { display: grid; width: 26px; height: 26px; place-items: center; padding: 0; border: 0; border-radius: 6px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; cursor: pointer; transition: color 100ms ease, background 100ms ease, transform 100ms ease; }
    .codex-sidebar-tag-delete:hover { color: #c53b3b; background: #ef444418; }
    @media (max-width: 760px) {
      .codex-sidebar-dashboard-overlay { padding: 10px; }
      .codex-sidebar-dashboard-dialog { width: calc(100vw - 20px); max-height: calc(100vh - 20px); }
      .codex-sidebar-dashboard-header { flex-wrap: wrap; }
      .codex-sidebar-dashboard-tabs { order: 3; width: 100%; margin-left: 0; }
      .codex-sidebar-dashboard-tab { flex: 1; }
      .codex-sidebar-tag-form-row { grid-template-columns: minmax(0, 1fr) auto; }
      .codex-sidebar-tag-form-row .codex-sidebar-tag-field:nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
      .codex-sidebar-tag-add { grid-column: 2; grid-row: 1; }
      .codex-sidebar-tag-color-field { align-items: flex-start; flex-direction: column; gap: 5px; }
      .codex-sidebar-tag-config-header, .codex-sidebar-tag-config-row { grid-template-columns: 12px minmax(64px, .6fr) minmax(0, 1.4fr) 28px; }
      .codex-sidebar-results-list { max-height: calc(100vh - 300px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .codex-sidebar-dashboard-launcher, .codex-sidebar-dashboard-tab, .codex-sidebar-dashboard-close, .codex-sidebar-search, .codex-sidebar-sort-trigger, .codex-sidebar-sort-chevron, .codex-sidebar-sort-option, .codex-sidebar-filter-chip, .codex-sidebar-quick-filter, .codex-sidebar-results, .codex-sidebar-result, .codex-sidebar-search-mark, .codex-sidebar-tag-add, .codex-sidebar-tag-delete { animation: none; transition: none; }
      .codex-sidebar-search[data-loading="true"] .codex-sidebar-search-icon::after { animation: none; border-color: currentColor; opacity: .65; }
    }
  `;
  }

  // runtime/src/injected/title-decorator.ts
  var TitleDecorator = class {
    constructor(options) {
      this.options = options;
    }
    options;
    originalNodeState = /* @__PURE__ */ new WeakMap();
    enhance(node) {
      const { version, toolbarId, enhancedAttribute, rawTitleAttribute } = this.options;
      if (node.closest(`#${toolbarId}`)) return;
      const generated = node.querySelector(":scope > .codex-sidebar-tag-layout");
      if (node.getAttribute(enhancedAttribute) === version && generated) return;
      const existingRaw = node.getAttribute(rawTitleAttribute);
      const raw = existingRaw !== null && generated ? existingRaw : node.textContent?.trim() ?? "";
      const parsed = this.options.parseTitle(raw);
      if (!parsed?.tagged) {
        if (existingRaw !== null) this.restore(node);
        return;
      }
      if (!this.originalNodeState.has(node)) {
        this.originalNodeState.set(node, {
          children: [...node.childNodes].map((child) => child.cloneNode(true)),
          ariaLabel: node.getAttribute("aria-label"),
          title: node.getAttribute("title")
        });
      }
      const layout = document.createElement("span");
      layout.className = "codex-sidebar-tag-layout";
      const tag = document.createElement("span");
      tag.className = "codex-sidebar-tag-chip";
      tag.style.setProperty("--codex-sidebar-tag-color", parsed.color);
      tag.textContent = parsed.tag;
      const title = document.createElement("span");
      title.className = "codex-sidebar-tag-title";
      title.textContent = parsed.title;
      layout.append(tag, title);
      node.setAttribute(rawTitleAttribute, parsed.raw);
      node.setAttribute(enhancedAttribute, version);
      node.setAttribute("aria-label", parsed.raw);
      node.setAttribute("title", parsed.raw);
      node.replaceChildren(layout);
    }
    refreshColors(nodes) {
      for (const node of nodes) {
        const parsed = this.options.parseTitle(node.getAttribute(this.options.rawTitleAttribute));
        const chip = node.querySelector(":scope > .codex-sidebar-tag-layout > .codex-sidebar-tag-chip");
        if (parsed && chip) chip.style.setProperty("--codex-sidebar-tag-color", parsed.color);
      }
    }
    restore(node) {
      const { enhancedAttribute, rawTitleAttribute } = this.options;
      const raw = node.getAttribute(rawTitleAttribute);
      if (raw === null) return;
      const original = this.originalNodeState.get(node);
      if (original) node.replaceChildren(...original.children.map((child) => child.cloneNode(true)));
      else node.replaceChildren(document.createTextNode(raw));
      node.removeAttribute(enhancedAttribute);
      node.removeAttribute(rawTitleAttribute);
      this.restoreAttribute(node, "aria-label", original?.ariaLabel);
      this.restoreAttribute(node, "title", original?.title);
      this.originalNodeState.delete(node);
    }
    dispose(nodes) {
      for (const node of nodes) this.restore(node);
    }
    restoreAttribute(node, name, value) {
      if (value == null) node.removeAttribute(name);
      else node.setAttribute(name, value);
    }
  };

  // runtime/src/injected/runtime.ts
  function installRuntime(input) {
    const config = parseRuntimeConfig(input);
    const { version, colorPresets, legacyToneColors, requestBinding } = config;
    const STYLE_ID = "codex-sidebar-tags-style";
    const TOOLBAR_ID = "codex-sidebar-tags-toolbar";
    const FILTER_BAR_ID = "codex-sidebar-tags-filter-bar";
    const CACHE_KEY = "codex-sidebar-tags-index-v1";
    const TAG_CONFIG_KEY = "codex-sidebar-tags-config-v1";
    const ENHANCED = "data-codex-sidebar-tags-enhanced";
    const RAW = "data-codex-sidebar-tags-raw";
    const FILTERED = "data-codex-sidebar-tags-filtered";
    const ROW = "data-codex-sidebar-tags-row";
    const previous = window.__codexSidebarTags;
    if (previous?.version === version) return previous.status();
    try {
      previous?.dispose?.();
    } catch {
    }
    const defaultDefinitions = config.tagDefinitions.map((item) => ({ ...item }));
    let tagDefinitions = normalizeTagDefinitions(config.tagDefinitions, defaultDefinitions);
    try {
      const savedDefinitions = JSON.parse(localStorage.getItem(TAG_CONFIG_KEY) ?? "null");
      if (config.settingsSource !== "repository" && Array.isArray(savedDefinitions)) tagDefinitions = normalizeTagDefinitions(savedDefinitions, defaultDefinitions);
    } catch {
    }
    let tagColors = new Map(tagDefinitions.map(({ name, color }) => [name.toLocaleLowerCase(), color]));
    const contentMatches = /* @__PURE__ */ new Map();
    let searchRequestTimer = null;
    let activeSearchRequestId = 0;
    let searchLoading = false;
    let searchError = "";
    let catalogError = "";
    let searchIndexStatus = { phase: "idle", completed: 0, total: 0 };
    const runtimeStore = new RuntimeStore();
    const state = runtimeStore.state;
    let host = null;
    let filterHost = null;
    let navTemplate = null;
    let renderedIndexSignature = null;
    let renderCount = 0;
    let pinnedToggleRef = null;
    const debugEvents = [];
    const i18n = new RuntimeI18n();
    let stopLocaleObserver = () => {
    };
    const clearPendingSearch = () => {
      if (searchRequestTimer !== null) clearTimeout(searchRequestTimer);
      searchRequestTimer = null;
    };
    const trace = (event, details = {}) => {
      debugEvents.push({ at: (/* @__PURE__ */ new Date()).toISOString(), event, ...details });
      if (debugEvents.length > 80) debugEvents.shift();
    };
    let receiveRuntimeMessage = () => false;
    const runtimeClient = new RuntimeClient(
      requestBinding,
      (message) => receiveRuntimeMessage(message),
      (reason) => trace("protocol-rejected", { reason })
    );
    const parse = (value) => {
      const raw = typeof value === "string" ? value.trim() : "";
      const parsed = parseTitleMetadata(raw);
      if (!parsed) return raw ? { raw, tag: i18n.t("uncategorized"), time: "", title: raw, color: legacyToneColors.neutral, tagged: false } : null;
      if (parsed.tag.toLowerCase() === "uncategorized") return { ...parsed, tag: i18n.t("uncategorized"), color: legacyToneColors.neutral, tagged: false };
      return { ...parsed, color: tagColors.get(parsed.tag.toLocaleLowerCase()) ?? legacyToneColors.neutral, tagged: true };
    };
    const titleDecorator = new TitleDecorator({
      version,
      toolbarId: TOOLBAR_ID,
      enhancedAttribute: ENHANCED,
      rawTitleAttribute: RAW,
      parseTitle: parse
    });
    const sessionRegistry = new SessionRegistry(
      localStorage,
      CACHE_KEY,
      parse,
      (tag) => tagColors.get(tag.toLocaleLowerCase()) ?? legacyToneColors.neutral
    );
    const persistTagDefinitions = () => {
      try {
        localStorage.setItem(TAG_CONFIG_KEY, JSON.stringify(tagDefinitions));
      } catch {
      }
    };
    const syncTagDefinitions = (notifyController = true) => {
      tagColors = new Map(tagDefinitions.map(({ name, color }) => [name.toLocaleLowerCase(), color]));
      sessionRegistry.updateColors();
      titleDecorator.refreshColors(document.querySelectorAll(`[${ENHANCED}]`));
      persistTagDefinitions();
      if (notifyController) {
        runtimeClient.send(RuntimeMessageType.settingsUpdate, {
          tags: tagDefinitions.map(({ name, color, description }) => ({ name, color, description }))
        });
      }
    };
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head ?? document.documentElement).appendChild(style);
    }
    style.textContent = buildRuntimeStyles({
      enhancedAttribute: ENHANCED,
      toolbarId: TOOLBAR_ID,
      filterBarId: FILTER_BAR_ID,
      filteredAttribute: FILTERED,
      rowAttribute: ROW
    });
    const titleNodes = () => queryThreadTitles(TOOLBAR_ID);
    const sidebarTagOrder = new SidebarTagOrder();
    const applySidebarOrder = () => sidebarTagOrder.apply(
      sidebarOrderGroups(),
      tagDefinitions.map(({ name }) => name),
      (title) => parse(title.getAttribute(RAW) ?? title.textContent)?.tag ?? i18n.t("uncategorized")
    );
    const commonAncestor = (left, right) => {
      if (!left || !right) return left?.parentElement ?? null;
      const parents = /* @__PURE__ */ new Set();
      for (let node = left; node; node = node.parentElement) parents.add(node);
      for (let node = right; node; node = node.parentElement) if (parents.has(node)) return node;
      return null;
    };
    const ensureToolbar = (nodes) => {
      if (host?.isConnected) {
        host.setAttribute("aria-label", i18n.t("sessionsDashboard"));
        return host;
      }
      host = document.getElementById(TOOLBAR_ID);
      if (host) return host;
      const pluginsButton = findNavigationButton(codexLabels.plugins);
      if (pluginsButton) {
        navTemplate = pluginsButton;
        const anchor2 = pluginsButton.parentElement?.classList.contains("contents") ? pluginsButton.parentElement : pluginsButton;
        host = document.createElement("div");
        host.id = TOOLBAR_ID;
        host.setAttribute("aria-label", i18n.t("sessionsDashboard"));
        anchor2.insertAdjacentElement("afterend", host);
        return host;
      }
      const pinnedToggle = pinnedToggleRef?.isConnected ? pinnedToggleRef : findAnySectionToggle();
      const projectRow = findFirstProjectRow();
      const first = nodes[0] ?? pinnedToggle ?? projectRow;
      if (!first) return null;
      const projectsHeader = findProjectsHeader();
      const boundary = commonAncestor(first, projectsHeader ?? projectRow ?? nodes[nodes.length - 1] ?? first);
      if (!(boundary instanceof HTMLElement)) return null;
      let anchor = first;
      while (anchor.parentElement && anchor.parentElement !== boundary) anchor = anchor.parentElement;
      host = document.createElement("div");
      host.id = TOOLBAR_ID;
      host.setAttribute("aria-label", i18n.t("sessionsDashboard"));
      boundary.insertBefore(host, anchor);
      return host;
    };
    const ensureFilterHost = () => {
      const pinnedToggle = findSectionToggle(codexLabels.pinned) ?? (pinnedToggleRef?.isConnected ? pinnedToggleRef : null);
      if (!pinnedToggle) return null;
      const pinnedHeadingRow = pinnedToggle.parentElement ?? pinnedToggle;
      filterHost = document.getElementById(FILTER_BAR_ID);
      if (!filterHost) {
        filterHost = document.createElement("section");
        filterHost.id = FILTER_BAR_ID;
      }
      filterHost.setAttribute("aria-label", i18n.t("filterSidebarByTag"));
      if (filterHost.nextElementSibling !== pinnedHeadingRow) pinnedHeadingRow.insertAdjacentElement("beforebegin", filterHost);
      return { filterHost, pinnedToggle };
    };
    const entriesFrom = (nodes) => {
      return sessionRegistry.ingest(nodes, {
        rawTitleAttribute: RAW,
        rowAttribute: ROW,
        rowForTitle: findThreadRow,
        threadIdForRow,
        isPinnedRow: isPinnedThreadRow,
        projectIdForRow: projectIdForThreadRow,
        sectionToggleForRow: sectionToggleForThreadRow,
        onPinnedToggle: (toggle) => {
          pinnedToggleRef = toggle;
        }
      });
    };
    const sidebarTagFilter = new SidebarTagFilter({
      hostId: FILTER_BAR_ID,
      filteredAttribute: FILTERED,
      activeAttribute: "data-codex-sidebar-tags-filter-active",
      i18n,
      neutralColor: legacyToneColors.neutral,
      ensureHost: ensureFilterHost,
      // Catalog membership must not decide whether a mounted native row gets filtered.
      getRows: () => titleNodes().flatMap((title) => {
        const row = findThreadRow(title);
        const parsed = parse(title.getAttribute(RAW) ?? title.textContent);
        return row ? [{ row, tag: parsed?.tag ?? i18n.t("uncategorized") }] : [];
      }),
      getDefinitions: () => tagDefinitions,
      getSelectedTag: () => state.tag,
      setSelectedTag: (value) => {
        runtimeStore.dispatch({ type: "tag.set", value });
      },
      colorForTag: (tag) => tagColors.get(tag.toLocaleLowerCase()) ?? legacyToneColors.neutral,
      trace
    });
    let dashboardView;
    let hostLifecycle;
    const openEntry = async (entry) => {
      const owningProject = entry.projectId ? findProjectRow(entry.projectId) : null;
      const projectCollapsed = isProjectCollapsed(owningProject);
      let row = projectCollapsed ? null : entry.row?.isConnected && entry.row.getClientRects().length > 0 ? entry.row : findVisibleThreadRow(entry.threadId);
      trace("open-entry", { threadId: entry.threadId, projectId: entry.projectId, pinned: entry.pinned, visibleRow: Boolean(row) });
      runtimeStore.dispatch({ type: "entry.open" });
      clearPendingSearch();
      contentMatches.clear();
      searchLoading = false;
      searchError = "";
      await dashboardView.close("open-entry");
      if (!row && entry.pinned) {
        const pinnedToggle = pinnedToggleRef?.isConnected ? pinnedToggleRef : findAnySectionToggle();
        if (pinnedToggle && !hasVisiblePinnedThread()) pinnedToggle.click();
      }
      if (!row && entry.projectId) {
        const projectRow = owningProject ?? findProjectRow(entry.projectId);
        if (projectRow && isProjectCollapsed(projectRow)) {
          trace("expand-project", { projectId: entry.projectId });
          projectRow.click();
        }
      }
      for (let attempt = 0; !row && attempt < 80; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 25));
        row = findVisibleThreadRow(entry.threadId);
      }
      if (row) {
        row.scrollIntoView({ block: "nearest" });
        row.click();
      } else {
        if (entry.threadId) runtimeClient.send(RuntimeMessageType.navigationOpen, { threadId: entry.threadId });
      }
    };
    const indexSignature = (entries) => entries.map((entry) => [entry.key, entry.raw, entry.pinned, entry.projectId].join("")).join("") + "" + titleNodes().map((node) => node.getAttribute(RAW) ?? node.textContent ?? "").join("");
    const scheduleContentSearch = (entries) => {
      clearPendingSearch();
      contentMatches.clear();
      searchError = "";
      const query = state.query.trim();
      if (!query) {
        searchLoading = false;
        return;
      }
      searchLoading = true;
      activeSearchRequestId += 1;
      const requestId = activeSearchRequestId;
      searchRequestTimer = setTimeout(() => {
        searchRequestTimer = null;
        if (!runtimeClient.connected) {
          searchLoading = false;
          searchError = i18n.t("searchUnavailable");
          renderToolbar(entriesFrom(titleNodes()), "search-unavailable");
          return;
        }
        runtimeClient.send(RuntimeMessageType.searchRequest, {
          query,
          threadIds: entries.map(({ threadId }) => threadId).filter((threadId) => Boolean(threadId)),
          limit: 100
        }, requestId);
        trace("search-request", { requestId, queryLength: query.length, threads: entries.length });
      }, 200);
    };
    dashboardView = new DashboardView({
      state,
      store: runtimeStore,
      i18n,
      colorPresets,
      fallbackBlue: legacyToneColors.blue,
      ensureToolbar,
      getNavigationTemplate: () => navTemplate,
      getEntries: () => entriesFrom(titleNodes()),
      getTagDefinitions: () => tagDefinitions,
      getSearchState: () => ({
        loading: searchLoading,
        error: searchError || catalogError,
        indexStatus: searchIndexStatus,
        contentMatches
      }),
      scheduleContentSearch,
      onTagDefinitionsChanged: (definitions) => {
        tagDefinitions = definitions;
        syncTagDefinitions();
      },
      onOpenEntry: (entry) => {
        void openEntry(entry);
      },
      requestRender: (reason) => renderToolbar(entriesFrom(titleNodes()), reason),
      trace
    });
    const renderToolbar = (entries, reason = "state") => {
      if (dashboardView.isClosing && state.open) return;
      hostLifecycle.didRender();
      renderedIndexSignature = indexSignature(entries);
      renderCount += 1;
      trace("render", { reason, count: entries.length, open: state.open });
      applySidebarOrder();
      sidebarTagFilter.render();
      dashboardView.render(entries, reason);
    };
    const refresh = (reason = "observer") => {
      const nodes = titleNodes();
      nodes.forEach((node) => titleDecorator.enhance(node));
      const entries = entriesFrom(nodes);
      applySidebarOrder();
      sidebarTagFilter.apply();
      if (host?.isConnected && renderedIndexSignature === indexSignature(entries)) return;
      if (hostLifecycle.deferIfInteracting(reason)) return;
      renderToolbar(entries, reason);
    };
    hostLifecycle = new HostLifecycle({
      isInsideOwnedSurface: (target) => Boolean(host?.contains(target) || filterHost?.contains(target) || dashboardView.contains(target)),
      hasInteractionFocus: () => Boolean(host?.matches(":focus-within") || filterHost?.matches(":focus-within") || dashboardView.hasFocus()),
      isRelevantMutation: (mutation) => {
        const target = mutation.target instanceof Element ? mutation.target : mutation.target.parentElement;
        if (!target || host?.contains(target) || filterHost?.contains(target) || dashboardView.contains(target)) return false;
        if (isThreadTitleElement(target)) return true;
        return [...mutation.addedNodes, ...mutation.removedNodes].some(mutationContainsSidebarNode);
      },
      onRefresh: refresh,
      trace
    });
    hostLifecycle.mount(document.body ?? document.documentElement);
    refresh("install");
    stopLocaleObserver = observeCodexLocale((locale) => {
      const previousUncategorized = i18n.t("uncategorized");
      const previousSearchUnavailable = i18n.t("searchUnavailable");
      if (!i18n.setLocale(locale)) return;
      if (state.tag === previousUncategorized) runtimeStore.dispatch({ type: "tag.set", value: i18n.t("uncategorized") });
      if (searchError === previousSearchUnavailable) searchError = i18n.t("searchUnavailable");
      sessionRegistry.reparse();
      trace("locale-change", { locale });
      renderToolbar(entriesFrom(titleNodes()), "locale");
    });
    const isRecord2 = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
    const applySearchResult = (value) => {
      if (!isRecord2(value) || value.type !== "searchResult" || value.requestId !== activeSearchRequestId || value.query !== state.query.trim()) return false;
      contentMatches.clear();
      if (Array.isArray(value.items)) {
        value.items.forEach((item) => {
          if (!isRecord2(item) || typeof item.threadId !== "string" || typeof item.snippet !== "string") return;
          contentMatches.set(item.threadId, {
            role: typeof item.role === "string" ? item.role : "Codex",
            snippet: item.snippet,
            score: typeof item.score === "number" ? item.score : 0
          });
        });
      }
      searchLoading = false;
      searchError = typeof value.error === "string" ? value.error : "";
      if (isRecord2(value.indexStatus) && typeof value.indexStatus.phase === "string") searchIndexStatus = { ...value.indexStatus, phase: value.indexStatus.phase };
      trace("search-result", { requestId: value.requestId, results: contentMatches.size, error: searchError || null });
      if (state.open) renderToolbar(entriesFrom(titleNodes()), "search-result");
      return true;
    };
    const handleRuntimeMessage = (message) => {
      if (message.type === RuntimeMessageType.settingsError) {
        searchError = i18n.t("settingsSaveFailed");
        renderToolbar(entriesFrom(titleNodes()), "settings-error");
        return true;
      }
      if (message.type === RuntimeMessageType.catalogSnapshot) {
        catalogError = message.payload.complete === true ? "" : i18n.t("catalogUnavailable");
        if (message.payload.complete === true && Array.isArray(message.payload.items)) {
          sessionRegistry.applyCatalog(message.payload.items);
          const entries = entriesFrom(titleNodes());
          if (state.query.trim()) scheduleContentSearch(entries);
          renderToolbar(entries, "catalog-snapshot");
        }
        if (catalogError && state.open) renderToolbar(entriesFrom(titleNodes()), "catalog-snapshot");
        return true;
      }
      if (message.type === RuntimeMessageType.searchResult) {
        return applySearchResult({ type: "searchResult", requestId: message.requestId, ...message.payload });
      }
      if (message.type === RuntimeMessageType.settingsSnapshot) {
        if (searchError === i18n.t("settingsSaveFailed")) searchError = "";
        const settings = isRecord2(message.payload.settings) ? message.payload.settings : null;
        const nextDefinitions = normalizeTagDefinitions(settings?.tags, defaultDefinitions);
        tagDefinitions = nextDefinitions;
        syncTagDefinitions(false);
        renderToolbar(entriesFrom(titleNodes()), "settings-snapshot");
        return true;
      }
      return false;
    };
    receiveRuntimeMessage = handleRuntimeMessage;
    const runtime = {
      version,
      protocolVersion: RUNTIME_PROTOCOL_VERSION,
      tagDefinitions: () => tagDefinitions.map(({ name, color, description }) => ({ name, color, description })),
      contentThreadIds: () => sessionRegistry.threadIds(),
      debugIndex: () => sessionRegistry.debugIndex(),
      handleMessage: (value) => runtimeClient.handle(value),
      setSearchResult: applySearchResult,
      status: () => ({
        version,
        locale: i18n.locale,
        protocolVersion: RUNTIME_PROTOCOL_VERSION,
        enhanced: document.querySelectorAll(`[${ENHANCED}]`).length,
        indexed: sessionRegistry.size,
        searchLoading,
        searchResults: contentMatches.size,
        searchIndexStatus,
        capabilities: detectCodexCapabilities(),
        lastError: searchError || catalogError || null,
        toolbar: Boolean(document.getElementById(TOOLBAR_ID)),
        sidebarFilter: Boolean(document.getElementById(FILTER_BAR_ID)),
        activeTag: state.tag,
        visibleResults: dashboardView.visibleResultCount,
        renderCount,
        observerRefreshCount: hostLifecycle.observerRefreshCount
      }),
      debug: () => debugEvents.slice(),
      dispose: () => {
        clearPendingSearch();
        stopLocaleObserver();
        hostLifecycle.dispose();
        sidebarTagOrder.dispose();
        titleDecorator.dispose(document.querySelectorAll(`[${ENHANCED}]`));
        sidebarTagFilter.dispose(document.querySelectorAll(`[${FILTERED}]`));
        document.querySelectorAll(`[${ROW}]`).forEach((row) => row.removeAttribute(ROW));
        dashboardView.dispose();
        document.getElementById(TOOLBAR_ID)?.remove();
        document.getElementById(STYLE_ID)?.remove();
        sessionRegistry.clearPersistentCache();
        if (window.__codexSidebarTags === runtime) delete window.__codexSidebarTags;
        return true;
      }
    };
    window.__codexSidebarTags = runtime;
    return runtime.status();
  }
  return __toCommonJS(entry_exports);
})();
