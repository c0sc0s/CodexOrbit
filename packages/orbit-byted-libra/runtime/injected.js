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
.feed { --muted:var(--color-text-secondary,GrayText); --line:var(--color-border,#8883); font-size:12px; }
.feed-list { display:grid; gap:2px; margin:0; padding:0; list-style:none; max-height:300px; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; }
.feed-link { display:block; border-radius:8px; padding:9px 10px; color:inherit; text-decoration:none; }
.feed-link:hover { background:var(--color-background-primary-hover,#8881); }
.feed-link:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:-2px; }
.feed-title { display:flex; align-items:baseline; gap:12px; }
.feed-name { flex:1; min-width:0; line-height:1.6; overflow-wrap:anywhere; }
.feed-status { flex:none; color:var(--muted); font-size:11px; }
.feed-details { color:var(--muted); font-size:11px; line-height:1.6; margin-top:3px; overflow-wrap:anywhere; }
.feed-notice { margin:4px 0 10px; color:var(--muted); line-height:1.7; overflow-wrap:anywhere; }
.feed-command { display:block; margin-top:4px; font-size:11px; user-select:all; }
.feed-empty { padding:8px 0; color:var(--muted); }
.feed-footer { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; color:var(--muted); font-size:11px; }
.feed-actions { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
button,a { font:inherit; } .feed-actions button,.feed-actions a { border:0; padding:3px 0; color:var(--muted); background:transparent; text-decoration:none; cursor:pointer; }
@media(max-width:480px) { .feed-title { flex-wrap:wrap; gap:2px 8px; } }
`;

  // ../orbit-byted/dist/injected/feed-view.js
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
      const count = element("span", ""), refresh = element("button", "", "\u5237\u65B0"), open = element("a", "", "\u6253\u5F00\u539F\u5E73\u53F0");
      refresh.type = "button";
      refresh.setAttribute("aria-label", `\u5237\u65B0${options.title}`);
      open.href = options.homeUrl;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.style.cssText = "font:inherit;font-size:12px;color:var(--color-text-secondary,GrayText);text-decoration:none;padding:3px 0";
      refresh.addEventListener("click", () => {
        void request("refreshFeed");
      });
      if (header) {
        header.summary.append(count);
        header.actions.append(refresh, open);
      } else {
        actions.append(count, refresh, open);
        body.append(actions);
      }
      notice.setAttribute("role", "status");
      list.setAttribute("aria-label", options.title);
      body.append(notice, empty, list, footer);
      shadow.append(style, body);
      container.append(host);
      let previousItems;
      const render = () => {
        const data = current;
        refresh.disabled = Boolean(data?.refreshing);
        refresh.textContent = data?.refreshing ? "\u5237\u65B0\u4E2D\u2026" : "\u5237\u65B0";
        body.setAttribute("aria-busy", String(Boolean(data?.refreshing)));
        count.textContent = data?.updatedAt ? `${data.items.length}${data.complete ? "" : "+"}` : "";
        notice.replaceChildren();
        if (unavailable)
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
          const scrollTop = list.scrollTop;
          const fragment = document.createDocumentFragment();
          for (const item of data?.items ?? []) {
            const row = element("li", ""), link = element("a", "feed-link"), title = element("div", "feed-title");
            link.href = item.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            title.append(element("span", "feed-name", item.title), element("span", "feed-status", item.status));
            link.append(title);
            if (item.details.length)
              link.append(element("div", "feed-details", item.details.join(" \xB7 ")));
            row.append(link);
            fragment.append(row);
          }
          list.replaceChildren(fragment);
          list.scrollTop = scrollTop;
        }
        footer.replaceChildren();
        if (data?.updatedAt) {
          const date = new Date(data.updatedAt), time = element("time", "", `\u66F4\u65B0\u4E8E ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
          time.dateTime = date.toISOString();
          time.title = date.toLocaleString("zh-CN");
          footer.append(time);
          if (!data.complete)
            footer.append(element("span", "", "\u4EC5\u663E\u793A\u90E8\u5206\u7ED3\u679C"));
        }
        header?.setCompact(Boolean(data?.updatedAt && !data.items.length && !data.error && !unavailable));
      };
      listeners.add(render);
      render();
      void request("getFeed");
      return () => {
        listeners.delete(render);
        count.remove();
        refresh.remove();
        open.remove();
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
  var RUNTIME_VERSION = "0.1.2";
  function activate(context) {
    const { site, host } = libraSite(context.config);
    return activateFeedView(context, {
      title: "\u6211\u7684\u5B9E\u9A8C",
      empty: "\u5F53\u524D\u6CA1\u6709\u4F60\u8D1F\u8D23\u7684\u672A\u7ED3\u675F\u5B9E\u9A8C",
      order: 210,
      homeUrl: `https://${host}/libra/`,
      hosts: [host],
      loginCommand: `bytedcli --site ${site} auth login`,
      runtimeVersion: RUNTIME_VERSION
    });
  }
  return __toCommonJS(entry_exports);
})();
