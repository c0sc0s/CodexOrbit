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

  // ../orbit/dist/ui/select.js
  var styles = `
.orbit-ui-select-trigger { display:inline-flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; min-height:32px; padding:6px 9px; border:1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius:8px; background:var(--color-background-control, var(--color-token-input-background, Canvas)); color:var(--color-text-foreground, var(--color-token-text-primary, CanvasText)); font:inherit; text-align:left; cursor:pointer; }
.orbit-ui-select-trigger > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.orbit-ui-select-trigger > svg { width:14px; height:14px; flex:none; }
.orbit-ui-select-trigger:disabled { opacity:.5; cursor:default; }
.orbit-ui-select-trigger:focus-visible { outline:2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset:2px; }
.orbit-ui-select-popup { position:fixed; inset:auto; margin:0; z-index:10001; box-sizing:border-box; width:max-content; max-width:calc(100vw - 16px); overflow:auto; overscroll-behavior:contain; padding:4px; border:1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius:10px; background:var(--color-background-elevated-secondary-opaque, var(--color-background-elevated-high, var(--color-token-dropdown-background, Canvas))); color:var(--color-text-foreground, var(--color-token-text-primary, CanvasText)); font:inherit; font-size:13px; line-height:1.5; box-shadow:0 8px 24px #0003, 0 2px 6px #0002; zoom:var(--codex-window-zoom, 1); }
.orbit-ui-select-option { display:flex; align-items:center; gap:10px; box-sizing:border-box; min-height:32px; padding:6px 8px; border-radius:6px; color:inherit; cursor:pointer; }
.orbit-ui-select-option > span { flex:1; min-width:0; overflow-wrap:anywhere; }
.orbit-ui-select-option > svg { width:14px; height:14px; flex:none; visibility:hidden; }
.orbit-ui-select-option[aria-selected="true"] > svg { visibility:visible; }
.orbit-ui-select-option[data-active] { background:var(--color-token-list-hover-background, #8882); }
.orbit-ui-select-option[aria-disabled="true"] { opacity:.45; cursor:default; }
`;
  function icon(doc, path) {
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.7");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const shape = doc.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  }
  function mountSelect(trigger, options) {
    const doc = trigger.ownerDocument, view = doc.defaultView;
    if (!view)
      throw new Error("Selects require a browser document");
    if (!trigger.isConnected)
      throw new Error("Select triggers must be connected before mounting");
    const root = trigger.getRootNode();
    const scope = trigger.closest('dialog, [role="dialog"]') ?? (root instanceof view.ShadowRoot ? root : doc.body);
    const sheet = doc.createElement("style");
    sheet.textContent = styles;
    (root instanceof view.ShadowRoot ? root : doc.head).append(sheet);
    const events = new view.AbortController(), listenerOptions = { signal: events.signal };
    const id = `orbit-select-${view.crypto.randomUUID()}`;
    const ownedAttributes = ["role", "type", "aria-haspopup", "aria-expanded", "aria-controls", "aria-activedescendant"];
    const originals = new Map(ownedAttributes.map((name) => [name, trigger.getAttribute(name)]));
    const originalNodes = [...trigger.childNodes], originalValue = trigger.value;
    const label = doc.createElement("span");
    trigger.replaceChildren(label, icon(doc, "m6 9 6 6 6-6"));
    trigger.classList.add("orbit-ui-select-trigger");
    trigger.type = "button";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    let state = options, popup = null, active = -1;
    let search = "", lastTyped = 0, disposed = false;
    const disabled = () => trigger.matches(":disabled");
    const close = () => {
      popup?.remove();
      popup = null;
      active = -1;
      search = "";
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      trigger.removeAttribute("aria-controls");
    };
    const selectActive = (index, scroll = true) => {
      active = index;
      popup?.querySelectorAll('[role="option"]').forEach((element2, i) => element2.toggleAttribute("data-active", i === index));
      const current = popup?.children[index];
      if (current) {
        trigger.setAttribute("aria-activedescendant", current.id);
        if (scroll)
          current.scrollIntoView({ block: "nearest" });
      } else
        trigger.removeAttribute("aria-activedescendant");
    };
    const enabled = () => state.choices.map((choice, index) => choice.disabled ? -1 : index).filter((index) => index >= 0);
    const position = () => {
      if (!popup)
        return;
      const anchor = trigger.getBoundingClientRect(), currentZoom = Reflect.get(popup, "currentCSSZoom");
      const zoom = typeof currentZoom === "number" && Number.isFinite(currentZoom) && currentZoom > 0 ? currentZoom : Number.parseFloat(view.getComputedStyle(popup).zoom) || 1;
      const padding = 8, gap = 4, below = view.innerHeight - padding - anchor.bottom - gap, above = anchor.top - padding - gap;
      const side = below >= Math.min(280 * zoom, popup.scrollHeight * zoom) || below >= above ? "bottom" : "top";
      popup.style.maxWidth = `${Math.max(0, view.innerWidth - padding * 2) / zoom}px`;
      popup.style.minWidth = `${Math.min(Math.max(120, anchor.width), view.innerWidth - padding * 2) / zoom}px`;
      popup.style.maxHeight = `${Math.max(0, Math.min(280, (side === "bottom" ? below : above) / zoom))}px`;
      const bounds = popup.getBoundingClientRect();
      popup.style.left = `${Math.max(padding, Math.min(anchor.left, view.innerWidth - padding - bounds.width)) / zoom}px`;
      popup.style.top = `${Math.max(padding, side === "bottom" ? anchor.bottom + gap : anchor.top - gap - bounds.height) / zoom}px`;
      popup.dataset.side = side;
    };
    const choose = () => {
      const choice = state.choices[active];
      if (disabled() || !choice || choice.disabled) {
        close();
        return;
      }
      const changed = choice.value !== state.value;
      state = { ...state, value: choice.value };
      label.textContent = choice.label;
      trigger.value = choice.value;
      close();
      trigger.focus({ preventScroll: true });
      if (changed)
        options.onChange(choice.value);
    };
    const renderOptions = () => {
      if (!popup)
        return;
      popup.replaceChildren(...state.choices.map((choice, index) => {
        const item = doc.createElement("div");
        item.className = "orbit-ui-select-option";
        item.id = `${id}-${index}`;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(choice.value === state.value));
        if (choice.disabled)
          item.setAttribute("aria-disabled", "true");
        const text = doc.createElement("span");
        text.textContent = choice.label;
        item.append(text, icon(doc, "m5 12 4 4L19 6"));
        item.addEventListener("pointermove", () => {
          if (!choice.disabled)
            selectActive(index, false);
        });
        item.addEventListener("pointerdown", (event) => event.preventDefault());
        item.addEventListener("click", () => {
          if (!choice.disabled) {
            active = index;
            choose();
          }
        });
        return item;
      }));
    };
    const open = () => {
      if (disposed || disabled() || popup || !enabled().length)
        return;
      popup = doc.createElement("div");
      popup.className = "orbit-ui-select-popup";
      popup.id = id;
      popup.setAttribute("role", "listbox");
      const accessibleLabel = trigger.getAttribute("aria-label");
      if (accessibleLabel)
        popup.setAttribute("aria-label", accessibleLabel);
      const labeledBy = trigger.getAttribute("aria-labelledby");
      if (labeledBy)
        popup.setAttribute("aria-labelledby", labeledBy);
      scope.append(popup);
      renderOptions();
      if (typeof popup.showPopover === "function") {
        popup.popover = "manual";
        popup.showPopover();
      }
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("aria-controls", id);
      const index = state.choices.findIndex((choice) => choice.value === state.value && !choice.disabled);
      selectActive(index >= 0 ? index : enabled()[0], false);
      position();
      popup.children[active]?.scrollIntoView({ block: "nearest" });
    };
    trigger.addEventListener("click", () => {
      if (popup)
        close();
      else
        open();
    }, listenerOptions);
    trigger.addEventListener("keydown", (event) => {
      if (event.isComposing || disabled())
        return;
      if (event.key === "Escape" && popup) {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key === "Tab") {
        if (popup)
          choose();
        return;
      }
      if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const wasOpen = Boolean(popup);
        if ((event.key === "Enter" || event.key === " ") && wasOpen) {
          choose();
          return;
        }
        open();
        if (!popup)
          return;
        const indices = enabled(), offset = indices.indexOf(active);
        if (event.key === "Home")
          selectActive(indices[0]);
        else if (event.key === "End")
          selectActive(indices.at(-1));
        else if (wasOpen && (event.key === "ArrowDown" || event.key === "ArrowUp"))
          selectActive(indices[Math.max(0, Math.min(indices.length - 1, offset + (event.key === "ArrowDown" ? 1 : -1)))]);
        return;
      }
      if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now(), character = event.key.toLocaleLowerCase();
        search = now - lastTyped > 750 ? character : search + character;
        lastTyped = now;
        const needle = [...search].every((value) => value === character) ? character : search;
        open();
        for (let step = 1; step <= state.choices.length; step++) {
          const index = (active + step) % state.choices.length, choice = state.choices[index];
          if (!choice.disabled && choice.label.toLocaleLowerCase().startsWith(needle)) {
            selectActive(index);
            break;
          }
        }
      }
    }, listenerOptions);
    const outside = (event) => {
      if (!event.composedPath().includes(trigger) && (!popup || !event.composedPath().includes(popup)))
        close();
    };
    doc.addEventListener("pointerdown", outside, { ...listenerOptions, capture: true });
    doc.addEventListener("focusin", outside, { ...listenerOptions, capture: true });
    doc.addEventListener("scroll", (event) => {
      const target = event.composedPath()[0];
      if (target === doc || target instanceof view.Element && target.contains(trigger))
        close();
    }, { ...listenerOptions, capture: true });
    view.addEventListener("resize", close, listenerOptions);
    view.addEventListener("blur", close, listenerOptions);
    const update = (next) => {
      if (disposed)
        return;
      const previousActive = state.choices[active]?.value;
      state = next;
      label.textContent = state.choices.find((choice) => choice.value === state.value)?.label ?? "";
      trigger.value = state.value;
      if (disabled() || !enabled().length) {
        close();
        return;
      }
      if (popup) {
        renderOptions();
        const index = state.choices.findIndex((choice) => choice.value === previousActive && !choice.disabled);
        selectActive(index >= 0 ? index : enabled()[0], false);
        position();
      }
    };
    update(options);
    return { update, close, dispose() {
      if (disposed)
        return;
      close();
      disposed = true;
      events.abort();
      sheet.remove();
      trigger.classList.remove("orbit-ui-select-trigger");
      for (const [name, value] of originals) {
        if (value === null)
          trigger.removeAttribute(name);
        else
          trigger.setAttribute(name, value);
      }
      trigger.replaceChildren(...originalNodes);
      trigger.value = originalValue;
    } };
  }

  // ../orbit/dist/ui/home-sections.js
  function registry(document) {
    const owner = document.defaultView;
    if (!owner)
      throw new Error("Home sections require a browser document");
    const key = /* @__PURE__ */ Symbol.for("@c0sc0s/orbit/ui/home-sections/v1");
    let value = Reflect.get(owner, key);
    if (!value) {
      value = { sections: /* @__PURE__ */ new Map(), listeners: /* @__PURE__ */ new Set() };
      Reflect.set(owner, key, value);
    }
    return value;
  }
  function registerHomeSection(section, document = globalThis.document) {
    if (!/^[a-z][a-z0-9.-]{0,63}$/u.test(section.id) || typeof section.title !== "string" || !section.title.trim() || section.title.length > 80 || typeof section.mount !== "function" || section.slot !== void 0 && !["overview", "main"].includes(section.slot) || section.order !== void 0 && !Number.isSafeInteger(section.order) || section.defaultVisible !== void 0 && typeof section.defaultVisible !== "boolean")
      throw new Error("Invalid Home section");
    const state = registry(document);
    if (state.sections.has(section.id))
      throw new Error(`Home section already registered: ${section.id}`);
    const registered = Object.freeze({ ...section, title: section.title.trim() });
    state.sections.set(section.id, registered);
    for (const listener of state.listeners)
      listener();
    return () => {
      if (state.sections.get(section.id) !== registered)
        return;
      state.sections.delete(section.id);
      for (const listener of state.listeners)
        listener();
    };
  }

  // ../orbit-byted/dist/shared/feed.js
  var MAX_ITEMS = 500;
  var MAX_FEED_BYTES = 700 * 1024;
  function record(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Invalid object");
    return value;
  }
  function safeUrl(value, hosts) {
    if (typeof value !== "string" || value.length > 2048)
      return false;
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password && !url.port && hosts.includes(url.hostname);
    } catch {
      return false;
    }
  }
  function isFeedResult(value, hosts) {
    try {
      const result = record(value);
      return typeof result.complete === "boolean" && Array.isArray(result.items) && result.items.length <= MAX_ITEMS && result.items.every((value2) => {
        const item = record(value2);
        if (item.meter !== void 0) {
          const meter = record(item.meter);
          if (typeof meter.label !== "string" || !meter.label.trim() || meter.label.length > 40 || typeof meter.value !== "number" || !Number.isFinite(meter.value) || meter.value < 0 || meter.value > 100)
            return false;
        }
        return typeof item.id === "string" && item.id.length > 0 && item.id.length <= 128 && typeof item.title === "string" && item.title.length > 0 && item.title.length <= 512 && typeof item.status === "string" && item.status.length <= 80 && safeUrl(item.url, hosts) && Array.isArray(item.details) && item.details.length <= 5 && item.details.every((v) => typeof v === "string" && v.length <= 200);
      }) && new Set(result.items.map((value2) => record(value2).id)).size === result.items.length;
    } catch {
      return false;
    }
  }
  function isFeedSnapshot(value, hosts) {
    if (!isFeedResult(value, hosts))
      return false;
    const snapshot = value;
    return typeof snapshot.generation === "string" && snapshot.generation.length <= 64 && Number.isSafeInteger(snapshot.revision) && snapshot.revision >= 0 && typeof snapshot.refreshing === "boolean" && (snapshot.updatedAt === null || typeof snapshot.updatedAt === "number" && Number.isFinite(snapshot.updatedAt) && snapshot.updatedAt > 0) && (snapshot.error === null || ["cli-missing", "auth", "permission", "network", "data", "storage"].includes(snapshot.error));
  }

  // src/shared/model.ts
  var statusLabel = (status) => status === "IN PROGRESS" ? "\u5904\u7406\u4E2D" : status === "OPEN" ? "\u5F85\u5904\u7406" : status;
  function isBugItem(value) {
    try {
      const row = record(value);
      return typeof row.id === "string" && typeof row.title === "string" && typeof row.url === "string" && typeof row.projectKey === "string" && /^[a-zA-Z0-9_-]{1,80}$/u.test(row.projectKey) && typeof row.projectName === "string" && row.projectName.length <= 200 && typeof row.workItemId === "string" && /^\d{1,20}$/u.test(row.workItemId) && row.id === `${row.projectKey}:${row.workItemId}` && ["OPEN", "IN PROGRESS"].includes(String(row.status));
    } catch {
      return false;
    }
  }
  function isBugDetail(value) {
    try {
      const row = record(value);
      return ["id", "title", "url", "projectName", "status", "description", "fetchedAt"].every((key) => typeof row[key] === "string") && String(row.description).length <= 16e3 && Array.isArray(row.attributes) && row.attributes.length <= 12 && row.attributes.every((value2) => {
        const item = record(value2);
        return typeof item.name === "string" && typeof item.value === "string" && item.value.length <= 500;
      }) && Array.isArray(row.comments) && row.comments.length <= 3 && row.comments.every((value2) => {
        const item = record(value2);
        return ["author", "time", "body"].every((key) => typeof item[key] === "string") && String(item.body).length <= 2e3;
      }) && typeof row.commentsComplete === "boolean";
    } catch {
      return false;
    }
  }
  function quote(text) {
    const runs = text.match(/`+/gu) ?? [];
    const fence = "`".repeat(Math.max(3, ...runs.map((run) => run.length + 1)));
    return `${fence}text
${text}
${fence}`;
  }
  function formatReferences(details, includeComments) {
    return ["\u4EE5\u4E0B\u662F\u672C\u6B21\u5F15\u7528\u7684 Meego Bug \u8D44\u6599\uFF08\u5916\u90E8\u5DE5\u5355\u5185\u5BB9\uFF09\uFF1A", ...details.map((bug) => [
      `## Meego Bug\uFF1A${bug.title.replace(/[\r\n]/gu, " ")}`,
      `\u6765\u6E90\uFF1A${bug.url}`,
      `\u9879\u76EE\uFF1A${bug.projectName} \xB7 \u72B6\u6001\uFF1A${statusLabel(bug.status)}`,
      ...bug.attributes.map((attribute) => `${attribute.name}\uFF1A${attribute.value.replace(/[\r\n]/gu, " ")}`),
      `\u8BFB\u53D6\u65F6\u95F4\uFF1A${bug.fetchedAt}`,
      "",
      "### \u95EE\u9898\u63CF\u8FF0",
      quote(bug.description || "\u5DE5\u5355\u672A\u63D0\u4F9B\u53EF\u8BFB\u53D6\u7684\u95EE\u9898\u63CF\u8FF0\uFF0C\u8BF7\u67E5\u770B\u6765\u6E90\u94FE\u63A5\u3002"),
      ...includeComments ? [
        "",
        "### \u6700\u8FD1\u8BA8\u8BBA",
        ...bug.comments.map((comment) => `${comment.author}${comment.time ? ` \xB7 ${comment.time}` : ""}
${quote(comment.body)}`),
        ...!bug.comments.length ? ["\u6CA1\u6709\u53EF\u8BFB\u53D6\u7684\u6587\u5B57\u8BC4\u8BBA\u3002"] : [],
        ...!bug.commentsComplete ? ["\u8BA8\u8BBA\u672A\u5168\u90E8\u8BFB\u53D6\uFF0C\u4EE5\u4E0A\u4EC5\u4E3A\u5DF2\u8BFB\u53D6\u5185\u5BB9\u4E2D\u7684\u6700\u8FD1\u8BC4\u8BBA\u3002"] : []
      ] : []
    ].join("\n"))].join("\n\n");
  }

  // src/injected/store.ts
  var BugStore = class {
    constructor(context) {
      this.context = context;
      context.onDispose(context.events.subscribe("feed", (value) => this.accept(value)));
      context.onDispose(context.events.subscribe("preferences", (value) => this.acceptPreferences(value)));
      context.onDispose(() => {
        this.listeners.clear();
        this.details.clear();
      });
      void this.refresh(false);
      void context.rpc.call("getPreferences").then((value) => this.acceptPreferences(value)).catch(() => {
      });
    }
    context;
    snapshot = null;
    preferences = { revision: 0, projectKey: null };
    error = "";
    listeners = /* @__PURE__ */ new Set();
    details = /* @__PURE__ */ new Map();
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    notify() {
      for (const listener of this.listeners) listener();
    }
    accept(value) {
      if (!isFeedSnapshot(value, ["meego.larkoffice.com"]) || !value.items.every(isBugItem)) {
        this.error = "\u5217\u8868\u6570\u636E\u683C\u5F0F\u4E0D\u53D7\u652F\u6301\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002";
        this.notify();
        return;
      }
      if (this.snapshot?.generation === value.generation && value.revision < this.snapshot.revision) return;
      this.snapshot = value;
      this.error = "";
      this.notify();
    }
    acceptPreferences(value) {
      try {
        const preferences = record(value);
        if (!Number.isSafeInteger(preferences.revision) || Number(preferences.revision) < this.preferences.revision || preferences.projectKey !== null && typeof preferences.projectKey !== "string") return;
        this.preferences = { revision: Number(preferences.revision), projectKey: preferences.projectKey };
        this.notify();
      } catch {
      }
    }
    get bugs() {
      return (this.snapshot?.items ?? []).filter(isBugItem);
    }
    async refresh(force = true) {
      try {
        this.accept(await this.context.rpc.call(force ? "refreshFeed" : "getFeed"));
      } catch {
        if (!this.context.signal.aborted) {
          this.error = "\u63D2\u4EF6\u670D\u52A1\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u8BD5\u3002";
          this.notify();
        }
      }
    }
    async project(projectKey) {
      try {
        this.acceptPreferences(await this.context.rpc.call("setPreferences", { projectKey }));
      } catch {
        this.error = "\u9879\u76EE\u7B5B\u9009\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002";
        this.notify();
      }
    }
    async detail(bug, includeComments, signal) {
      const key = `${bug.id}:${includeComments}`, cached = this.details.get(key);
      if (cached && Date.now() - cached.time < 12e4) return cached.value;
      const value = await this.context.rpc.call("getBug", { id: bug.id, includeComments }, { signal, timeoutMs: 3e4 });
      if (!isBugDetail(value) || value.id !== bug.id || value.url !== bug.url) throw new Error("Invalid bug details");
      if (this.details.size >= 20) this.details.delete(this.details.keys().next().value);
      this.details.set(key, { value, time: Date.now() });
      return value;
    }
  };

  // src/injected/list-view.ts
  function element(document, tag, className = "", text = "") {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    if (node instanceof document.defaultView.HTMLButtonElement) node.type = "button";
    return node;
  }
  function icon2(document, path) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.6");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    const shape = document.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  }
  var failures = {
    "cli-missing": "\u672A\u627E\u5230 bytedcli\uFF0C\u8BF7\u5B89\u88C5\u540E\u5237\u65B0\u3002",
    auth: "\u8BF7\u5728\u7EC8\u7AEF\u8FD0\u884C bytedcli meego login\uFF0C\u5B8C\u6210\u767B\u5F55\u540E\u5237\u65B0\u3002",
    permission: "\u5F53\u524D\u8D26\u53F7\u6CA1\u6709\u8BBF\u95EE\u6743\u9650\uFF0C\u8BF7\u5728\u539F\u5E73\u53F0\u786E\u8BA4\u6743\u9650\u540E\u5237\u65B0\u3002",
    network: "\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u516C\u53F8\u7F51\u7EDC\u540E\u91CD\u8BD5\u3002",
    data: "\u8FD4\u56DE\u7684\u6570\u636E\u683C\u5F0F\u4E0D\u53D7\u652F\u6301\uFF0C\u8BF7\u68C0\u67E5 bytedcli \u7248\u672C\u540E\u91CD\u8BD5\u3002",
    storage: "\u5217\u8868\u5DF2\u66F4\u65B0\uFF0C\u4F46\u672C\u5730\u7F13\u5B58\u4FDD\u5B58\u5931\u8D25\u3002"
  };
  function mountBugList(container, store, options) {
    const document = container.ownerDocument, toolbar = element(document, "div", "toolbar");
    const search = element(document, "input", "search");
    search.type = "search";
    search.placeholder = "\u641C\u7D22 Bug";
    search.setAttribute("aria-label", "\u641C\u7D22 Bug \u6807\u9898\u6216 ID");
    const project = element(document, "button", "project");
    project.setAttribute("aria-label", "\u7B5B\u9009\u9879\u76EE");
    const tabs = element(document, "div", "tabs");
    tabs.setAttribute("aria-label", "\u7B5B\u9009 Bug \u72B6\u6001");
    let status = null;
    const tabButtons = [null, "IN PROGRESS", "OPEN"].map((value) => {
      const button = element(document, "button", "tab");
      button.addEventListener("click", () => {
        status = value;
        render();
      });
      tabs.append(button);
      return { button, value };
    });
    toolbar.append(search, project, tabs);
    const notice = element(document, "div", "notice"), list = element(document, "div", "list"), foot = element(document, "div", "foot");
    notice.setAttribute("role", "status");
    list.setAttribute("aria-label", "\u5206\u914D\u7ED9\u6211\u7684\u672A\u89E3\u51B3 Bug");
    container.append(toolbar, notice, list, foot);
    const select = mountSelect(project, { value: "", choices: [{ value: "", label: "\u5168\u90E8\u9879\u76EE" }], onChange: (value) => {
      void store.project(value || null);
    } });
    function render() {
      const snapshot = store.snapshot, bugs = store.bugs, projectKey = store.preferences.projectKey;
      const projects = new Map(bugs.map((bug) => [bug.projectKey, bug.projectName]));
      if (projectKey && !projects.has(projectKey)) projects.set(projectKey, "\u5DF2\u9009\u9879\u76EE\uFF08\u6682\u65E0 Bug\uFF09");
      select.update({ value: projectKey ?? "", choices: [{ value: "", label: "\u5168\u90E8\u9879\u76EE" }, ...[...projects].map(([value, label]) => ({ value, label }))] });
      const scoped = bugs.filter((bug) => !projectKey || bug.projectKey === projectKey);
      for (const { button, value } of tabButtons) {
        button.textContent = value ? statusLabel(value) : "\u5168\u90E8";
        button.setAttribute("aria-pressed", String(status === value));
      }
      notice.textContent = store.error || (snapshot?.error ? `${failures[snapshot.error]}${snapshot.updatedAt && snapshot.error !== "storage" ? " \u5F53\u524D\u663E\u793A\u4E0A\u6B21\u540C\u6B65\u7684\u5217\u8868\u3002" : ""}` : "");
      notice.hidden = !notice.textContent;
      const needle = search.value.trim().toLocaleLowerCase();
      const visible = scoped.filter((bug) => (!status || bug.status === status) && `${bug.title} ${bug.workItemId} ${bug.projectName}`.toLocaleLowerCase().includes(needle));
      const active = container.getRootNode() instanceof document.defaultView.ShadowRoot ? container.getRootNode().activeElement : document.activeElement;
      const focusedId = active instanceof document.defaultView.HTMLElement && list.contains(active) ? active.dataset.bugFocus : null;
      const scrollTop = list.scrollTop, fragment = document.createDocumentFragment();
      for (const state of ["IN PROGRESS", "OPEN"]) {
        const group = visible.filter((bug) => bug.status === state);
        if (!group.length) continue;
        fragment.append(element(document, "div", "group", `${statusLabel(state)} \xB7 ${group.length}`));
        for (const bug of group) {
          const row = element(document, "div", "row");
          if (options.selection) {
            const checkbox = element(document, "input");
            checkbox.type = "checkbox";
            checkbox.checked = options.selection.has(bug.id);
            checkbox.dataset.bugFocus = `select:${bug.id}`;
            checkbox.setAttribute("aria-label", `\u9009\u62E9 ${bug.title}`);
            checkbox.addEventListener("change", () => options.selection.toggle(bug));
            row.append(checkbox);
          } else row.append(element(document, "span", `dot${state === "IN PROGRESS" ? " progress" : ""}`));
          const main = element(document, "button", "row-main");
          main.dataset.bugFocus = `preview:${bug.id}`;
          main.setAttribute("aria-label", `\u67E5\u770B ${bug.title}`);
          main.append(element(document, "span", "title", bug.title), element(document, "div", "meta", `#${bug.workItemId} \xB7 ${bug.projectName}`));
          main.addEventListener("click", () => options.preview(bug));
          row.append(main);
          if (options.reference) {
            const cite = element(document, "button", "cite");
            cite.append(icon2(document, "M12 5v14M5 12h14"));
            cite.title = "\u5F15\u7528\u6B64 Bug";
            cite.setAttribute("aria-label", `\u5F15\u7528 ${bug.title}`);
            cite.addEventListener("click", () => options.reference(bug));
            row.append(cite);
          }
          fragment.append(row);
        }
      }
      if (!visible.length) fragment.append(element(document, "div", "empty", !snapshot?.updatedAt ? notice.textContent ? "" : "\u6B63\u5728\u83B7\u53D6\u5217\u8868\u2026" : notice.textContent ? "" : bugs.length ? "\u6CA1\u6709\u7B26\u5408\u5F53\u524D\u7B5B\u9009\u7684 Bug" : snapshot.complete ? "\u5F53\u524D\u6CA1\u6709\u5206\u914D\u7ED9\u4F60\u7684 OPEN / IN PROGRESS Bug" : "\u5217\u8868\u5C1A\u672A\u53D6\u5168\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002"));
      list.replaceChildren(fragment);
      list.scrollTop = scrollTop;
      if (focusedId) [...list.querySelectorAll("[data-bug-focus]")].find((node) => node.dataset.bugFocus === focusedId)?.focus({ preventScroll: true });
      foot.textContent = snapshot?.updatedAt && !snapshot.complete ? "\u4EC5\u663E\u793A\u90E8\u5206\u7ED3\u679C" : "";
      foot.hidden = !foot.textContent;
    }
    search.addEventListener("input", render);
    const unsubscribe = store.subscribe(render);
    render();
    return { render, search, dispose() {
      unsubscribe();
      select.dispose();
      toolbar.remove();
      notice.remove();
      list.remove();
      foot.remove();
    } };
  }

  // src/injected/styles.ts
  var styles2 = `
:host{display:block;color:var(--color-text-foreground,CanvasText);font:inherit;color-scheme:inherit;--muted:var(--color-text-secondary,GrayText);--line:var(--color-border,#8883);--hover:var(--color-background-primary-hover,#8881);--surface:var(--color-background-primary,Canvas)}
*{box-sizing:border-box}[hidden]{display:none!important}button,input,textarea{font:inherit;color:inherit}button{cursor:pointer;border:0;background:transparent;border-radius:6px}button:hover{background:var(--hover)}button:disabled{opacity:.5;cursor:default}button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--color-border-focused,#6b9eff);outline-offset:2px}
.toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:0 0 10px}.search{flex:1;min-width:160px;max-width:340px;border:1px solid var(--line);background:transparent;border-radius:7px;padding:6px 9px;font-size:12px}.toolbar .project{font-size:12px;min-height:30px;padding:5px 8px;border-color:transparent;background:transparent;color:var(--muted)}.toolbar .project:hover{background:var(--hover)}.tabs{display:flex;gap:4px}.tab{padding:5px 8px;font-size:12px;color:var(--muted)}.tab[aria-pressed=true]{background:var(--hover);color:inherit}
.list{max-height:330px;overflow:auto;overscroll-behavior:contain}.group{font-size:11px;color:var(--muted);margin:12px 0 3px}.row{display:flex;align-items:flex-start;gap:10px;padding:9px 8px;border-radius:8px}.row:hover,.row:focus-within{background:var(--hover)}.row input{margin-top:5px;accent-color:var(--color-text-foreground,CanvasText)}.row-main{flex:1;min-width:0;text-align:left;padding:0;border-radius:0}.row-main:hover,.row-main:active,.row-main:focus-visible{background:transparent}.row-main:focus-visible{outline-offset:3px}.title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.65;overflow-wrap:anywhere}.meta{font-size:11px;color:var(--muted);margin-top:3px;line-height:1.6}.dot{width:6px;height:6px;border-radius:50%;background:#ba9250;margin-top:7px;flex:none}.dot.progress{background:#6499cf}.cite{display:flex;align-items:center;justify-content:center;flex:none;width:26px;height:26px;padding:4px;margin:0;color:var(--muted);opacity:0;pointer-events:none}.cite:hover,.cite:active{background:transparent;color:var(--color-text-foreground,CanvasText)}.row:hover .cite,.row:focus-within .cite{opacity:1;pointer-events:auto}
.empty,.notice{font-size:12px;color:var(--muted);padding:9px 0;line-height:1.7;white-space:pre-wrap}.foot{font-size:11px;color:var(--muted);margin-top:8px}.primary{background:var(--color-text-foreground,CanvasText);color:var(--color-background-primary,Canvas);padding:8px 14px;font-size:12px}.primary:hover{opacity:.9;background:var(--color-text-foreground,CanvasText)}
.overlay{position:fixed;inset:0;z-index:10000;background:#0006;backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;padding:24px}.dialog{width:min(960px,100%);max-height:calc(100dvh - 48px);display:flex;flex-direction:column;overflow:hidden;background:var(--color-background-elevated-primary-opaque,var(--surface));border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 70px #0007,0 4px 18px #0003}.header{padding:16px 18px;display:flex;align-items:flex-start;justify-content:space-between;gap:14px}.header h2{font-size:16px;margin:0}.close{font-size:20px;width:28px;height:28px}.content{display:grid;grid-template-columns:minmax(260px,.9fr) minmax(0,1.1fr);min-height:0;overflow:hidden;border-top:1px solid var(--line)}.picker-list{padding:14px;min-height:0;overflow:auto}.picker-list .toolbar{display:block;margin-bottom:8px}.picker-list .search{width:100%;max-width:none;margin-bottom:8px}.picker-list .list{max-height:min(48dvh,450px)}.preview{padding:18px;border-left:1px solid var(--line);overflow:auto;max-height:min(58dvh,540px);font-size:12px;line-height:1.7}.preview h3{font-size:14px;margin:0 0 8px;overflow-wrap:anywhere}.preview pre{font:inherit;line-height:1.8;white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0}.preview-label{font-size:11px;color:var(--muted);margin-top:12px}
.footer{padding:12px 18px;border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.footer label{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--muted)}.footer-actions{display:flex;align-items:center;gap:10px}.reference{width:calc(100% - 36px);margin:10px 18px;min-height:140px;max-height:220px;resize:vertical;background:transparent;border:1px solid var(--line);border-radius:8px;padding:10px;font-size:11px;line-height:1.6}.message{padding:0 18px;color:var(--muted);font-size:12px;white-space:pre-wrap}.message:empty{display:none}.hint{font-size:11px;color:var(--muted)}
@media(max-width:720px){.overlay{padding:12px}.dialog{max-height:calc(100dvh - 24px)}.content{grid-template-columns:1fr;overflow:auto}.preview{border-left:0;border-top:1px solid var(--line);max-height:240px}.picker-list .list{max-height:220px}.tabs{flex-wrap:wrap}.footer{gap:8px}}
@media(hover:none){.cite{opacity:1;pointer-events:auto}}
`;

  // src/injected/picker.ts
  function openBugPicker(document, store, initial, onClose) {
    const previousFocus = document.activeElement, host = element(document, "div"), shadow = host.attachShadow({ mode: "open" });
    host.dataset.orbitMeegoPicker = "true";
    const sheet = element(document, "style", "", styles2), overlay = element(document, "div", "overlay"), dialog = element(document, "div", "dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "\u5F15\u7528 Meego Bug");
    const header = element(document, "div", "header"), heading = element(document, "div"), close = element(document, "button", "close", "\xD7");
    close.setAttribute("aria-label", "\u5173\u95ED Bug \u9009\u62E9\u5668");
    heading.append(element(document, "h2", "", "\u5F15\u7528 Bug"));
    header.append(heading, close);
    const content = element(document, "div", "content"), listContainer = element(document, "div", "picker-list"), preview = element(document, "div", "preview");
    preview.setAttribute("role", "region");
    preview.setAttribute("aria-label", "Bug \u5185\u5BB9\u9884\u89C8");
    preview.setAttribute("aria-live", "polite");
    content.append(listContainer, preview);
    const message = element(document, "div", "message");
    message.setAttribute("role", "status");
    const footer = element(document, "div", "footer"), commentLabel = element(document, "label"), comments = element(document, "input");
    comments.type = "checkbox";
    commentLabel.append(comments, document.createTextNode("\u9644\u5E26\u6700\u8FD1\u8BA8\u8BBA"));
    commentLabel.title = "\u6700\u591A\u9644\u5E26 3 \u6761\u6587\u5B57\u8BC4\u8BBA";
    const actions = element(document, "div", "footer-actions"), count = element(document, "span", "hint"), copy = element(document, "button", "primary", "\u590D\u5236\u5F15\u7528");
    actions.append(count, copy);
    footer.append(commentLabel, actions);
    dialog.append(header, content, message, footer);
    overlay.append(dialog);
    shadow.append(sheet, overlay);
    document.body.append(host);
    const selected = new Map(initial ? [[initial.id, initial]] : []), lifetime = new AbortController();
    let active = initial ?? null, previewRequest = null, busy = false, disposed = false, reference = null;
    const closePicker = (restore = true) => {
      if (disposed) return;
      disposed = true;
      lifetime.abort();
      previewRequest?.abort();
      list.dispose();
      unsubscribe();
      host.remove();
      if (restore && previousFocus instanceof document.defaultView.HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
      onClose();
    };
    function controls() {
      count.textContent = `\u5DF2\u9009 ${selected.size} \u4E2A`;
      copy.disabled = !selected.size || busy;
      comments.disabled = busy;
      listContainer.inert = busy;
      dialog.setAttribute("aria-busy", String(busy));
    }
    function clearReference() {
      reference?.remove();
      reference = null;
      message.textContent = "";
    }
    async function show(bug) {
      previewRequest?.abort();
      active = bug;
      preview.replaceChildren();
      if (!bug) {
        preview.append(element(document, "div", "empty", "\u9009\u62E9 Bug \u67E5\u770B\u5185\u5BB9"));
        return;
      }
      const request = new AbortController();
      previewRequest = request;
      preview.append(element(document, "h3", "", bug.title), element(document, "div", "meta", `${bug.projectName} \xB7 ${statusLabel(bug.status)}`));
      const body = element(document, "pre", "", "\u6B63\u5728\u8BFB\u53D6\u63CF\u8FF0\u2026");
      preview.append(body);
      try {
        const detail = await store.detail(bug, comments.checked, AbortSignal.any([request.signal, lifetime.signal]));
        if (request.signal.aborted || disposed) return;
        body.textContent = detail.description || "\u5DE5\u5355\u6CA1\u6709\u63D0\u4F9B\u53EF\u8BFB\u53D6\u7684\u6587\u5B57\u63CF\u8FF0\uFF0C\u8BF7\u67E5\u770B\u539F\u5DE5\u5355\u3002";
        const metadata = element(document, "div", "meta", detail.attributes.map((item) => `${item.name}\uFF1A${item.value}`).join("\n"));
        metadata.style.whiteSpace = "pre-wrap";
        body.before(metadata);
        if (detail.status !== bug.status) body.before(element(document, "div", "notice", `\u5DE5\u5355\u5F53\u524D\u72B6\u6001\uFF1A${statusLabel(detail.status)}\u3002\u5217\u8868\u53EF\u80FD\u5C1A\u672A\u5237\u65B0\u3002`));
        if (comments.checked) {
          preview.append(element(document, "div", "preview-label", "\u6700\u8FD1\u8BA8\u8BBA"));
          for (const comment of detail.comments) preview.append(element(document, "div", "meta", `${comment.author} \xB7 ${comment.time}`), element(document, "pre", "", comment.body));
          if (!detail.comments.length) preview.append(element(document, "div", "meta", "\u6CA1\u6709\u53EF\u8BFB\u53D6\u7684\u6587\u5B57\u8BC4\u8BBA\u3002"));
          if (!detail.commentsComplete) preview.append(element(document, "div", "meta", "\u8BA8\u8BBA\u4EC5\u8BFB\u53D6\u4E86\u90E8\u5206\u5185\u5BB9\u3002"));
        }
      } catch {
        if (!request.signal.aborted && !disposed) body.textContent = "\u63CF\u8FF0\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u767B\u5F55\u548C\u7F51\u7EDC\u540E\u91CD\u65B0\u9009\u62E9\u6B64 Bug\u3002";
      }
    }
    const list = mountBugList(listContainer, store, {
      preview: (bug) => {
        void show(bug);
      },
      selection: { has: (id) => selected.has(id), toggle(bug) {
        clearReference();
        if (selected.has(bug.id)) selected.delete(bug.id);
        else if (selected.size < 5) {
          selected.set(bug.id, bug);
          void show(bug);
        } else message.textContent = "\u4E00\u6B21\u6700\u591A\u5F15\u7528 5 \u4E2A Bug\u3002";
        list.render();
        controls();
      } }
    });
    const unsubscribe = store.subscribe(() => {
      for (const id of selected.keys()) if (!store.bugs.some((bug) => bug.id === id)) selected.delete(id);
      controls();
      list.render();
    });
    async function generate() {
      if (busy || !selected.size) return;
      busy = true;
      clearReference();
      controls();
      message.textContent = "\u6B63\u5728\u51C6\u5907\u5F15\u7528\u2026";
      try {
        const details = [];
        for (const bug of selected.values()) details.push(await store.detail(bug, comments.checked, lifetime.signal));
        if (disposed) return;
        const text = formatReferences(details, comments.checked);
        reference = element(document, "textarea", "reference");
        reference.readOnly = true;
        reference.value = text;
        reference.setAttribute("aria-label", "\u5B8C\u6574 Bug \u5F15\u7528");
        message.after(reference);
        try {
          await document.defaultView.navigator.clipboard.writeText(text);
          if (!disposed) message.textContent = "\u5DF2\u590D\u5236";
        } catch {
          if (!disposed) {
            message.textContent = "\u6309 \u2318C \u590D\u5236\u4E0B\u65B9\u5F15\u7528";
            reference.focus();
            reference.select();
          }
        }
      } catch {
        if (!disposed) message.textContent = "\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u767B\u5F55\u548C\u7F51\u7EDC\u540E\u91CD\u8BD5\u3002";
      } finally {
        busy = false;
        if (!disposed) controls();
      }
    }
    comments.addEventListener("change", () => {
      clearReference();
      void show(active);
    });
    copy.addEventListener("click", () => {
      void generate();
    });
    close.addEventListener("click", () => closePicker());
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closePicker();
    });
    shadow.addEventListener("keydown", (event) => {
      if (!(event instanceof document.defaultView.KeyboardEvent) || event.isComposing || event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePicker();
      }
      if (event.key !== "Tab") return;
      const focusable = [...shadow.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea, a[href]")].filter((node) => !node.closest("[inert]"));
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && shadow.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && shadow.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    });
    controls();
    void show(initial ?? null);
    list.search.focus();
    void store.refresh(false);
    return () => closePicker();
  }

  // src/injected/entry.ts
  var RUNTIME_VERSION = "0.2.3";
  function activate(context) {
    const document = globalThis.document, store = new BugStore(context);
    let picker = null;
    const open = (initial) => {
      if (picker) return;
      picker = openBugPicker(document, store, initial, () => {
        picker = null;
      });
    };
    context.onDispose(() => picker?.());
    context.onDispose(registerHomeSection({ id: `${context.id}.list`, title: "\u6211\u7684 Bug", slot: "main", order: 200, mount(container, header) {
      const host = element(document, "div"), shadow = host.attachShadow({ mode: "open" }), body = element(document, "div");
      shadow.append(element(document, "style", "", styles2), body);
      container.append(host);
      const count = element(document, "span"), refresh = element(document, "button");
      refresh.append(icon2(document, "M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"));
      refresh.title = "\u5237\u65B0 Bug";
      refresh.setAttribute("aria-label", "\u5237\u65B0 Bug");
      refresh.style.cssText = "font:inherit;font-size:12px;color:var(--color-text-secondary,GrayText);padding:3px 0;background:transparent;border:0;cursor:pointer;display:inline-flex;align-items:center";
      const actions = header?.actions ?? body;
      (header?.summary ?? body).append(count);
      actions.append(refresh);
      refresh.addEventListener("click", () => {
        void store.refresh();
      });
      const list = mountBugList(body, store, { preview: (bug) => open(bug), reference: (bug) => open(bug) });
      const render = () => {
        const bugs = store.bugs.filter((bug) => !store.preferences.projectKey || bug.projectKey === store.preferences.projectKey);
        count.textContent = store.snapshot?.updatedAt ? `${bugs.length}${store.snapshot.complete ? "" : "+"}` : "";
        refresh.disabled = Boolean(store.snapshot?.refreshing);
        refresh.setAttribute("aria-label", refresh.disabled ? "\u6B63\u5728\u5237\u65B0 Bug" : "\u5237\u65B0 Bug");
        header?.setCompact(false);
      };
      const unsubscribe = store.subscribe(render);
      render();
      void store.refresh(false);
      return () => {
        unsubscribe();
        list.dispose();
        count.remove();
        refresh.remove();
        host.remove();
      };
    } }));
    return { status: () => ({ version: RUNTIME_VERSION, count: store.snapshot?.items.length ?? null, updatedAt: store.snapshot?.updatedAt ?? null, refreshing: store.snapshot?.refreshing ?? false, error: store.snapshot?.error ?? null, pickerOpen: Boolean(picker) }) };
  }
  return __toCommonJS(entry_exports);
})();
