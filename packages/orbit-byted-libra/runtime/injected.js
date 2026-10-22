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

  // ../orbit-byted/dist/injected/styles.js
  var feedStyles = `
:host { display:block; min-width:0; color:var(--color-text-foreground,CanvasText); font:inherit; color-scheme:inherit; }
* { box-sizing:border-box; } [hidden] { display:none !important; }
.feed { --muted:var(--color-text-secondary,GrayText); --line:var(--color-border,#8883); --hover:var(--color-background-primary-hover,#8881); font-size:12px; }
.feed-list { display:grid; gap:4px; margin:0; padding:0; list-style:none; max-height:320px; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; }
.feed-row { display:flex; align-items:center; gap:8px; padding-right:12px; border:1px solid transparent; border-radius:9px; }
.feed-row:hover { background:var(--hover); }
.feed-link { display:block; flex:1; min-width:0; border-radius:8px; padding:10px 12px; color:inherit; text-decoration:none; }
.feed-link:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:-3px; }
.feed-remove { display:grid; place-items:center; flex:none; width:28px; height:28px; padding:6px; border:0; border-radius:6px; background:transparent; color:var(--muted); cursor:pointer; opacity:0; }
.feed-row:hover .feed-remove,.feed-row:focus-within .feed-remove,.feed-remove:disabled { opacity:1; }
.feed-remove:hover { background:color-mix(in srgb,var(--color-text-danger,#cf6666) 12%,transparent); color:var(--color-text-danger,#cf6666); }
.feed-remove:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:2px; }
.feed-remove:disabled { opacity:.45; cursor:wait; }
.feed-title { display:flex; align-items:center; flex-wrap:wrap; gap:5px 8px; }
.feed-name { min-width:0; font-weight:500; line-height:1.6; overflow-wrap:anywhere; }
.feed-status { --status-color:var(--muted); display:inline-flex; align-items:center; flex:none; gap:4px; padding:1px 6px; border-radius:5px; background:color-mix(in srgb,var(--status-color) 10%,transparent); color:var(--status-color); font-size:10px; line-height:1.6; white-space:nowrap; }
.feed-status::before { content:""; width:4px; height:4px; border-radius:50%; background:currentColor; }
.feed-status[data-tone=positive] { --status-color:var(--color-text-success,color-mix(in srgb,CanvasText 35%,#4eab83)); }
.feed-status[data-tone=warning] { --status-color:var(--color-text-warning,color-mix(in srgb,CanvasText 35%,#b18a45)); }
.feed-status[data-tone=info] { --status-color:var(--color-text-info,color-mix(in srgb,CanvasText 35%,#6299cf)); }
.feed-meter { --meter-color:var(--color-text-foreground,CanvasText); position:relative; display:inline-flex; align-items:center; justify-content:center; flex:none; width:86px; height:20px; overflow:hidden; border-radius:5px; background:color-mix(in srgb,var(--meter-color) 5%,transparent); font-size:10px; font-variant-numeric:tabular-nums; line-height:1; white-space:nowrap; }
.feed-meter-fill { position:absolute; inset:0 auto 0 0; background:color-mix(in srgb,var(--meter-color) 13%,transparent); }
.feed-meter-label { position:relative; }
.feed-details { display:flex; align-items:baseline; flex-wrap:wrap; gap:2px 12px; color:var(--muted); font-size:11px; line-height:1.6; margin-top:3px; }
.feed-detail { overflow-wrap:anywhere; }
.feed-detail:first-child { font-variant-numeric:tabular-nums; }
.feed-notice { margin:4px 0 10px; color:var(--muted); line-height:1.7; overflow-wrap:anywhere; }
.feed-command { display:block; margin-top:4px; font-size:11px; user-select:all; }
.feed-empty { padding:8px 0; color:var(--muted); }
.feed-footer { margin-top:8px; padding:0 12px; color:var(--muted); font-size:11px; }
.feed-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
button,a { font:inherit; }
@media(hover:none) { .feed-remove { opacity:.7; } }
@media(max-width:480px) { .feed-row { gap:2px; padding-right:9px; } .feed-link { padding:9px; } .feed-meter { width:76px; } .feed-details { column-gap:10px; } }
`;
  var toolbarStyles = `
:host { display:inline-flex; min-width:0; font:inherit; color-scheme:inherit; color:var(--color-text-secondary,GrayText); }
* { box-sizing:border-box; } [hidden] { display:none!important; }
.feed-toolbar { display:flex; align-items:center; gap:4px; }
.feed-updated { font-size:10px; font-variant-numeric:tabular-nums; white-space:nowrap; margin-right:6px; }
button,a { display:inline-flex; align-items:center; justify-content:center; flex:none; gap:5px; height:28px; margin:0; padding:5px 7px; border:0; border-radius:6px; background:transparent; color:inherit; font:inherit; font-size:11px; line-height:1; text-decoration:none; cursor:pointer; }
button { width:28px; padding:6px; }
button:hover,a:hover { background:var(--color-background-primary-hover,#8881); color:var(--color-text-foreground,CanvasText); }
button:focus-visible,a:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:2px; }
button:disabled { opacity:.45; cursor:wait; }
.feed-platform svg { width:12px; height:12px; opacity:.7; }
.is-loading svg { animation:feed-spin 1s linear infinite; }
@keyframes feed-spin { to { transform:rotate(360deg); } }
@media(max-width:600px) { .feed-updated { display:none; } }
@media(prefers-reduced-motion:reduce) { .is-loading svg { animation:none; } }
`;

  // ../orbit-byted/dist/injected/feed-view.js
  function icon(document, path) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [name, value] of Object.entries({ viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }))
      svg.setAttribute(name, value);
    const shape = document.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", path);
    svg.append(shape);
    return svg;
  }
  var errors = {
    "cli-missing": "\u672A\u627E\u5230 bytedcli\uFF0C\u8BF7\u5B89\u88C5\u540E\u5237\u65B0\u3002",
    auth: "\u5C1A\u672A\u767B\u5F55\u6216\u767B\u5F55\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5728\u7EC8\u7AEF\u767B\u5F55\u540E\u5237\u65B0\u3002",
    permission: "\u5F53\u524D\u8D26\u53F7\u6CA1\u6709\u8BBF\u95EE\u6743\u9650\uFF0C\u8BF7\u5728\u539F\u5E73\u53F0\u786E\u8BA4\u6743\u9650\u540E\u5237\u65B0\u3002",
    network: "\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u516C\u53F8\u7F51\u7EDC\u540E\u91CD\u8BD5\u3002",
    data: "\u8FD4\u56DE\u7684\u6570\u636E\u683C\u5F0F\u4E0D\u53D7\u652F\u6301\uFF0C\u8BF7\u68C0\u67E5 bytedcli \u7248\u672C\u540E\u91CD\u8BD5\u3002",
    storage: "\u5217\u8868\u5DF2\u66F4\u65B0\uFF0C\u4F46\u672C\u5730\u7F13\u5B58\u4FDD\u5B58\u5931\u8D25\u3002"
  };
  function activateFeedView(context, options) {
    const listeners = /* @__PURE__ */ new Set();
    let current, unavailable = false;
    const accept = (value) => {
      if (!isFeedSnapshot(value, options.hosts)) {
        unavailable = true;
        for (const listener of listeners)
          listener();
        return;
      }
      if (current && current.generation === value.generation && value.revision < current.revision)
        return;
      current = value;
      unavailable = false;
      for (const listener of listeners)
        listener();
    };
    const request = async (method) => {
      try {
        accept(await context.rpc.call(method));
      } catch {
        if (!context.signal.aborted) {
          unavailable = true;
          for (const listener of listeners)
            listener();
        }
      }
    };
    context.onDispose(context.events.subscribe("feed", accept));
    const mount = (container, header) => {
      const document = container.ownerDocument, host = document.createElement("div"), shadow = host.attachShadow({ mode: "open" });
      const element = (tag, className, content = "") => {
        const node = document.createElement(tag);
        node.className = className;
        node.textContent = content;
        return node;
      };
      const style = element("style", "");
      style.textContent = feedStyles;
      const body = element("div", "feed"), notice = element("div", "feed-notice"), empty = element("div", "feed-empty");
      const list = element("ul", "feed-list"), footer = element("div", "feed-footer"), actions = element("div", "feed-actions");
      const count = element("span", ""), toolbar = element("span", ""), controls = toolbar.attachShadow({ mode: "open" });
      const controlStyle = element("style", "");
      controlStyle.textContent = toolbarStyles;
      const buttons = element("div", "feed-toolbar"), updated = element("time", "feed-updated");
      const refresh = element("button", "feed-refresh"), open = element("a", "feed-platform");
      const refreshLabel = `\u5237\u65B0${options.title}`;
      count.style.cssText = "display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:6px;background:var(--color-background-primary-hover,#8881);color:var(--color-text-secondary,GrayText);font-size:11px;font-variant-numeric:tabular-nums";
      refresh.type = "button";
      refresh.setAttribute("aria-label", refreshLabel);
      refresh.title = refreshLabel;
      refresh.append(icon(document, "M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"));
      open.href = options.homeUrl;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.setAttribute("aria-label", `\u6253\u5F00${options.platformLabel ?? "\u539F\u5E73\u53F0"}`);
      open.append(element("span", "", options.platformLabel ?? "\u539F\u5E73\u53F0"), icon(document, "M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"));
      buttons.append(updated, refresh, open);
      controls.append(controlStyle, buttons);
      refresh.addEventListener("click", () => {
        void request("refreshFeed");
      });
      if (header) {
        header.summary.append(count);
        header.actions.append(toolbar);
      } else {
        actions.append(count, toolbar);
        body.append(actions);
      }
      notice.setAttribute("role", "status");
      list.setAttribute("aria-label", options.title);
      body.append(notice, empty, list, footer);
      shadow.append(style, body);
      container.append(host);
      let previousItems;
      const dismissing = /* @__PURE__ */ new Set();
      let dismissError = "";
      const dismiss = async (id) => {
        if (dismissing.has(id))
          return;
        dismissing.add(id);
        dismissError = "";
        render();
        try {
          const value = await context.rpc.call("dismissFeedItem", { id });
          if (!isFeedSnapshot(value, options.hosts))
            throw new Error("Invalid feed response");
          accept(value);
        } catch {
          if (!context.signal.aborted)
            dismissError = "\u5220\u9664\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002";
        } finally {
          dismissing.delete(id);
          render();
        }
      };
      const render = () => {
        const data = current;
        refresh.disabled = Boolean(data?.refreshing);
        refresh.setAttribute("aria-label", data?.refreshing ? "\u6B63\u5728\u5237\u65B0\u2026" : refreshLabel);
        refresh.title = data?.refreshing ? "\u6B63\u5728\u5237\u65B0\u2026" : refreshLabel;
        refresh.classList.toggle("is-loading", Boolean(data?.refreshing));
        body.setAttribute("aria-busy", String(Boolean(data?.refreshing)));
        count.textContent = data?.updatedAt ? `${data.items.length}${data.complete ? "" : "+"}` : "";
        count.style.display = count.textContent ? "inline-flex" : "none";
        notice.replaceChildren();
        if (dismissError)
          notice.textContent = dismissError;
        else if (unavailable)
          notice.textContent = "\u63D2\u4EF6\u670D\u52A1\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u8BD5\u3002";
        else if (data?.error) {
          notice.textContent = `${errors[data.error]}${data.updatedAt && data.error !== "storage" ? " \u5F53\u524D\u663E\u793A\u4E0A\u6B21\u540C\u6B65\u7684\u5217\u8868\u3002" : ""}`;
          if (data.error === "auth")
            notice.append(element("code", "feed-command", options.loginCommand));
        }
        notice.hidden = !notice.textContent;
        empty.hidden = Boolean(data?.items.length) || Boolean(data?.error) || unavailable;
        empty.textContent = !data?.updatedAt ? "\u6B63\u5728\u83B7\u53D6\u5217\u8868\u2026" : !data.complete ? "\u5217\u8868\u5C1A\u672A\u53D6\u5168\uFF0C\u8BF7\u5237\u65B0\u91CD\u8BD5\u3002" : options.empty;
        if (data?.items !== previousItems) {
          previousItems = data?.items;
          const focused = shadow.activeElement, focusId = focused?.dataset.feedFocus;
          const scrollTop = list.scrollTop;
          const fragment = document.createDocumentFragment();
          for (const item of data?.items ?? []) {
            const row = element("li", "feed-row"), link = element("a", "feed-link"), title = element("div", "feed-title");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.dataset.feedFocus = `open:${item.id}`;
            const status = element("span", "feed-status", item.status);
            status.dataset.tone = options.statusTones?.[item.status] ?? "neutral";
            title.append(element("span", "feed-name", item.title), status);
            link.append(title);
            if (item.details.length) {
              const details = element("div", "feed-details");
              for (const detail of item.details)
                details.append(element("span", "feed-detail", detail));
              link.append(details);
            }
            row.append(link);
            if (options.dismissible) {
              const remove = element("button", "feed-remove");
              remove.type = "button";
              remove.dataset.itemId = item.id;
              remove.dataset.feedFocus = `remove:${item.id}`;
              remove.append(icon(document, "M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7"));
              remove.setAttribute("aria-label", `\u5220\u9664\u201C${item.title}\u201D`);
              remove.title = "\u4ECE\u5217\u8868\u5220\u9664\uFF0C\u539F\u5E73\u53F0\u4E0A\u7684\u6570\u636E\u4FDD\u7559";
              remove.addEventListener("click", () => {
                void dismiss(item.id);
              });
              row.append(remove);
            }
            if (item.meter) {
              const { label, value } = item.meter, meter = element("span", "feed-meter");
              meter.setAttribute("role", "meter");
              meter.setAttribute("aria-label", label);
              meter.setAttribute("aria-valuemin", "0");
              meter.setAttribute("aria-valuemax", "100");
              meter.setAttribute("aria-valuenow", String(value));
              meter.setAttribute("aria-valuetext", `${value}%`);
              const fill = element("span", "feed-meter-fill");
              fill.style.width = `${value}%`;
              fill.setAttribute("aria-hidden", "true");
              const text = element("span", "feed-meter-label", `${label} ${value}%`);
              text.setAttribute("aria-hidden", "true");
              meter.append(fill, text);
              row.append(meter);
            }
            fragment.append(row);
          }
          list.replaceChildren(fragment);
          list.scrollTop = scrollTop;
          if (focusId)
            [...list.querySelectorAll("[data-feed-focus]")].find((node) => node.dataset.feedFocus === focusId)?.focus({ preventScroll: true });
        }
        for (const button of list.querySelectorAll(".feed-remove")) {
          button.disabled = dismissing.has(button.dataset.itemId);
          button.setAttribute("aria-busy", String(button.disabled));
          button.title = button.disabled ? "\u6B63\u5728\u5220\u9664\u2026" : "\u4ECE\u5217\u8868\u5220\u9664\uFF0C\u539F\u5E73\u53F0\u4E0A\u7684\u6570\u636E\u4FDD\u7559";
        }
        footer.replaceChildren();
        updated.hidden = !data?.updatedAt;
        if (data?.updatedAt) {
          const date = new Date(data.updatedAt);
          updated.textContent = `${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} \u66F4\u65B0`;
          updated.dateTime = date.toISOString();
          updated.title = date.toLocaleString("zh-CN");
          if (!data.complete)
            footer.append(element("span", "", "\u4EC5\u663E\u793A\u90E8\u5206\u7ED3\u679C"));
        }
        footer.hidden = !footer.textContent;
        header?.setCompact(Boolean(data?.updatedAt && !data.items.length && !data.error && !unavailable));
      };
      listeners.add(render);
      render();
      void request("getFeed");
      return () => {
        listeners.delete(render);
        count.remove();
        toolbar.remove();
        host.remove();
      };
    };
    context.onDispose(registerHomeSection({ id: `${context.id}.list`, title: options.title, slot: "main", order: options.order, mount }));
    context.onDispose(() => listeners.clear());
    return { status: () => ({ version: options.runtimeVersion, count: current?.items.length ?? null, updatedAt: current?.updatedAt ?? null, refreshing: current?.refreshing ?? false, error: current?.error ?? null }) };
  }

  // src/shared/site.ts
  function libraSite(config) {
    const site = config.site ?? "i18n-tt";
    if (site !== "cn" && site !== "i18n-tt") throw new Error("Unsupported Libra site");
    return { site, host: site === "cn" ? "data.bytedance.net" : "libra-sg.tiktok-row.net" };
  }

  // src/injected/entry.ts
  var RUNTIME_VERSION = "0.1.7";
  function activate(context) {
    const { site, host } = libraSite(context.config);
    return activateFeedView(context, {
      title: "\u6211\u7684\u5B9E\u9A8C",
      empty: "\u5F53\u524D\u6CA1\u6709\u4F60\u8D1F\u8D23\u7684\u672A\u7ED3\u675F\u5B9E\u9A8C",
      order: 210,
      homeUrl: `https://${host}/libra/`,
      hosts: [host],
      loginCommand: `bytedcli --site ${site} auth login`,
      runtimeVersion: RUNTIME_VERSION,
      dismissible: true,
      platformLabel: "Libra",
      statusTones: { "\u8FD0\u884C\u4E2D": "positive", "\u8C03\u8BD5\u4E2D": "info", "\u5F85\u5F00\u59CB": "info", "\u5F85\u5BA1\u6279": "warning", "\u5F85\u7ED3\u675F": "warning", "\u5DF2\u6682\u505C": "warning", "\u5DF2\u9A73\u56DE": "warning" }
    });
  }
  return __toCommonJS(entry_exports);
})();
