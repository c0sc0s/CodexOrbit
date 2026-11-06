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
  function selectedThreadId() {
    return document.querySelector('[data-app-action-sidebar-thread-selected="true"]')?.getAttribute("data-app-action-sidebar-thread-id") ?? null;
  }
  function workspaceComposer() {
    const roots = [...document.querySelectorAll('[data-codex-composer-root][data-composer-placement="thread"]')].filter((root) => root.getBoundingClientRect().width > 0 && root.querySelector('[data-codex-composer][contenteditable="true"]'));
    return roots.length === 1 ? roots[0] : null;
  }
  function workspaceComposerControls() {
    const composer = workspaceComposer();
    const template = composer?.querySelector('button[data-composer-navigation-target="add-context"]');
    const permissions = composer?.querySelector('button[data-composer-navigation-target="permissions"]');
    const container = permissions?.parentElement;
    return template && container && template.parentElement === container ? { container, template } : null;
  }
  var workspaceObserverAttributes = [
    "data-app-action-sidebar-thread-selected",
    "data-app-action-sidebar-thread-id",
    "data-composer-placement",
    "data-composer-navigation-target",
    "hidden",
    "aria-hidden",
    "style"
  ];

  // src/shared/model.ts
  var RUNTIME_VERSION = "0.7.0";
  var PLUGIN_ID = "better-work-tree";
  var SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
  function localSessionId(value) {
    const id = value?.startsWith("local:") ? value.slice(6) : value;
    return id && SESSION_ID.test(id) ? id.toLowerCase() : null;
  }
  function sessionFromUrl(value) {
    try {
      const match = new URL(value).pathname.match(/\/(?:threads|thread|chat)\/([^/]+)\/?$/u);
      return localSessionId(match?.[1] ?? null);
    } catch {
      return null;
    }
  }
  function localSessionIdentity(selected, url) {
    const id = selected ? localSessionId(selected) : sessionFromUrl(url);
    if (id) return { key: id, id };
    const prefix = "local:client-new-thread:";
    return selected?.startsWith(prefix) && SESSION_ID.test(selected.slice(prefix.length)) ? { key: selected, id: null } : null;
  }
  function currentWorkspace(snapshot) {
    if (snapshot.toolActivity?.unresolved) return null;
    const directories = snapshot.toolActivity?.directories ?? [];
    if (directories.length > 1) return null;
    return directories[0] ?? { directory: snapshot.directory, git: snapshot.git };
  }

  // ../orbit/dist/ui/tooltip.js
  var tooltipStyles = `
  position: fixed; z-index: 10000; width: max-content; max-width: min(20rem, calc(100vw - 16px));
  padding: var(--tooltip-padding-block, 5px) var(--tooltip-padding-inline, 12px);
  border: 1px solid var(--tooltip-border-color, var(--color-border-tooltip, #8883));
  border-radius: var(--tooltip-border-radius, 16px); corner-shape: var(--tooltip-corner-shape, round);
  background: var(--tooltip-background-color, var(--color-background-tooltip, Canvas));
  color: var(--tooltip-text-color, var(--color-text-tooltip, CanvasText));
  box-shadow: var(--tooltip-box-shadow, var(--shadow-tooltip, 0 8px 18px #0f172a33));
  font-size: var(--tooltip-font-size, 13px); font-weight: var(--tooltip-font-weight, 400);
  line-height: var(--tooltip-line-height, 18px); letter-spacing: var(--tooltip-letter-spacing, -.15px);
  zoom: var(--codex-window-zoom, 1); overflow-wrap: break-word; text-align: center; pointer-events: none; user-select: none;
`;
  function mountTooltip(trigger, options) {
    const doc = trigger.ownerDocument;
    const view = doc.defaultView;
    if (!view)
      throw new Error("Tooltips require a browser document");
    const events = new view.AbortController();
    const id = options.id ?? `orbit-tooltip-${view.crypto.randomUUID()}`;
    let timer = null;
    let tooltip = null;
    const hide = () => {
      if (timer !== null)
        view.clearTimeout(timer);
      timer = null;
      tooltip?.remove();
      tooltip = null;
      const describedBy = trigger.getAttribute("aria-describedby")?.split(/\s+/).filter((value) => value !== id).join(" ");
      if (describedBy)
        trigger.setAttribute("aria-describedby", describedBy);
      else
        trigger.removeAttribute("aria-describedby");
    };
    const show = () => {
      hide();
      if (!trigger.isConnected || trigger.getAttribute("aria-expanded") === "true")
        return;
      tooltip = doc.createElement("div");
      tooltip.id = id;
      tooltip.className = "orbit-ui-tooltip";
      tooltip.setAttribute("role", "tooltip");
      tooltip.textContent = options.label;
      tooltip.style.cssText = tooltipStyles;
      doc.body.appendChild(tooltip);
      trigger.setAttribute("aria-describedby", [trigger.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));
      const anchor = trigger.getBoundingClientRect();
      const zoom = Number.parseFloat(view.getComputedStyle(tooltip).zoom) || 1;
      const offset = options.offset ?? 2;
      const padding = 8;
      tooltip.style.maxWidth = `min(20rem, ${Math.max(0, view.innerWidth - padding * 2) / zoom}px)`;
      const bounds = tooltip.getBoundingClientRect();
      let side = options.side ?? "right";
      if (side === "right" && anchor.right + offset + bounds.width > view.innerWidth - padding)
        side = "left";
      else if (side === "left" && anchor.left - offset - bounds.width < padding)
        side = "right";
      else if (side === "bottom" && anchor.bottom + offset + bounds.height > view.innerHeight - padding)
        side = "top";
      else if (side === "top" && anchor.top - offset - bounds.height < padding)
        side = "bottom";
      const left = side === "right" ? anchor.right + offset : side === "left" ? anchor.left - offset - bounds.width : anchor.left + (anchor.width - bounds.width) / 2;
      const top = side === "bottom" ? anchor.bottom + offset : side === "top" ? anchor.top - offset - bounds.height : anchor.top + (anchor.height - bounds.height) / 2;
      tooltip.style.left = `${Math.max(padding, Math.min(left, view.innerWidth - padding - bounds.width)) / zoom}px`;
      tooltip.style.top = `${Math.max(padding, Math.min(top, view.innerHeight - padding - bounds.height)) / zoom}px`;
      tooltip.dataset.side = side;
    };
    const listenerOptions = { signal: events.signal };
    trigger.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch" || event.buttons)
        return;
      hide();
      timer = view.setTimeout(show, options.delay ?? 200);
    }, listenerOptions);
    trigger.addEventListener("pointerleave", hide, listenerOptions);
    trigger.addEventListener("focus", show, listenerOptions);
    trigger.addEventListener("blur", hide, listenerOptions);
    trigger.addEventListener("click", hide, listenerOptions);
    doc.addEventListener("pointerdown", hide, { ...listenerOptions, capture: true });
    doc.addEventListener("keydown", (event) => {
      if (event.key === "Escape")
        hide();
    }, listenerOptions);
    doc.addEventListener("scroll", (event) => {
      if (event.target === doc || event.target instanceof view.Element && event.target.contains(trigger))
        hide();
    }, { ...listenerOptions, capture: true });
    view.addEventListener("resize", hide, listenerOptions);
    view.addEventListener("blur", hide, listenerOptions);
    return () => {
      hide();
      events.abort();
    };
  }

  // ../orbit/dist/ui/sidebar-button.js
  var presentationAttributes = /* @__PURE__ */ new Set([
    "class",
    "style",
    "data-color",
    "data-variant",
    "data-squircle",
    "data-pill",
    "data-uniform",
    "data-size",
    "data-icon-size",
    "data-suppress-active-style"
  ]);
  function createSidebarButton(options) {
    const doc = options.icon.ownerDocument;
    const view = doc.defaultView;
    if (!view)
      throw new Error("Sidebar buttons require a browser document");
    const button = options.template?.cloneNode(true) ?? doc.createElement("button");
    for (const attribute of Array.from(button.attributes)) {
      if (!presentationAttributes.has(attribute.name))
        button.removeAttribute(attribute.name);
    }
    button.type = "button";
    button.id = options.id;
    button.setAttribute("aria-label", options.ariaLabel ?? options.label);
    const icon = options.icon.cloneNode(true);
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    const nativeIcon = button.querySelector("svg");
    if (nativeIcon) {
      for (const name of ["class", "style", "width", "height"]) {
        const value = nativeIcon.getAttribute(name);
        if (value !== null)
          icon.setAttribute(name, value);
      }
      nativeIcon.replaceWith(icon);
    } else {
      icon.setAttribute("width", "20");
      icon.setAttribute("height", "20");
      button.prepend(icon);
    }
    const walker = doc.createTreeWalker(button, view.NodeFilter.SHOW_TEXT);
    let labeled = false;
    while (walker.nextNode()) {
      if (icon.contains(walker.currentNode))
        continue;
      if (!walker.currentNode.textContent?.trim())
        continue;
      walker.currentNode.textContent = labeled ? "" : options.label;
      labeled = true;
    }
    let style = null;
    if (!options.template) {
      button.append(doc.createTextNode(options.label));
      const selector = `#${view.CSS.escape(options.id)}`;
      style = doc.createElement("style");
      style.id = `${options.id}-style`;
      doc.getElementById(style.id)?.remove();
      style.textContent = `
      ${selector} { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 32px; padding: 0 12px;
        border: 0; border-radius: 6px; background: transparent; color: var(--color-text-tertiary, var(--color-token-text-secondary, inherit));
        font: inherit; text-align: left; cursor: pointer; }
      ${selector}:hover { background: var(--color-token-list-hover-background, #8882); color: var(--color-text-foreground, inherit); }
      ${selector}:focus-visible { outline: 2px solid var(--color-border-focus, #4b8cff); outline-offset: -2px; }
    `;
      doc.head.append(style);
    }
    if (options.onClick)
      button.addEventListener("click", options.onClick);
    const disposeTooltip = options.tooltip === false ? () => {
    } : mountTooltip(button, {
      label: options.label,
      ...options.tooltip,
      id: `${options.id}-tooltip`
    });
    return {
      element: button,
      dispose() {
        disposeTooltip();
        if (options.onClick)
          button.removeEventListener("click", options.onClick);
        style?.remove();
        button.remove();
      }
    };
  }

  // src/injected/view.ts
  var styles = `
*{box-sizing:border-box}.panel{width:360px;max-width:100%;padding:13px 14px;border:1px solid var(--color-border-default,var(--color-border-secondary,#8883));border-radius:11px;background:var(--color-background-elevated-primary-opaque,var(--color-background-elevated-primary,Canvas));color:var(--color-text-primary,CanvasText);box-shadow:0 12px 36px #0004,0 2px 8px #0002;font:12px/1.5 var(--font-sans,system-ui,sans-serif);overflow:auto}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.title{font-size:12px;font-weight:600}.mode{font-size:10px;color:var(--color-text-secondary,GrayText);white-space:nowrap}.panel[data-worktree=true] .mode{color:var(--color-text-success,#53bba9)}.row+.row{margin-top:11px}.label{margin-bottom:3px;color:var(--color-text-secondary,GrayText);font-size:10px}.branch,.directory{white-space:pre-wrap;overflow-wrap:anywhere;font:11.5px/1.6 var(--font-mono,ui-monospace,monospace)}.directory{display:block;max-width:100%;padding:0;border:0;background:transparent;text-align:left;color:inherit;cursor:pointer;user-select:text}.directory:disabled{cursor:default}.directory:hover:not(:disabled){color:var(--color-text-link,inherit);text-decoration:underline;text-underline-offset:3px}.directory:focus-visible{outline:2px solid var(--color-border-focus,#999);outline-offset:3px;border-radius:2px}.feedback{margin-top:8px;font-size:10px;color:var(--color-text-secondary,GrayText)}.feedback:empty{display:none}
`;
  function branchLabel(git) {
    return git.status === "ready" ? git.branch ?? (git.commit ? `detached \xB7 ${git.commit.slice(0, 8)}` : "\u5C1A\u65E0\u63D0\u4EA4") : git.status === "not-git" ? "\u975E Git \u76EE\u5F55" : "\u5206\u652F\u672A\u77E5";
  }
  function createWorkspaceView(template, onOpen = () => {
  }) {
    const host = document.createElement("span");
    host.id = "better-work-tree-indicator";
    host.style.cssText = "display:inline-flex;align-items:center;flex:none;pointer-events:auto;-webkit-app-region:no-drag";
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.65");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.innerHTML = '<circle cx="5" cy="5" r="2"/><path d="M5 7v10a2 2 0 0 0 2 2h6M7 5h6"/><rect x="13" y="2" width="8" height="6" rx="1.4"/><rect x="13" y="16" width="8" height="6" rx="1.4"/>';
    const control = createSidebarButton({ id: "better-work-tree-trigger", label: "Better Work Tree", icon, template, tooltip: false });
    const button = control.element;
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", "better-work-tree-panel");
    host.append(button);
    const panelHost = document.createElement("div");
    panelHost.id = "better-work-tree-panel";
    panelHost.style.cssText = "position:fixed;z-index:10001;inset:auto;zoom:var(--codex-window-zoom,1);pointer-events:auto";
    const root = panelHost.attachShadow({ mode: "open" });
    root.innerHTML = `<style>${styles}</style><section class="panel" role="dialog" aria-label="Better Work Tree" tabindex="-1">
    <div class="header"><span class="title">Better Work Tree</span><span class="mode"></span></div>
    <div class="row"><div class="label">\u5206\u652F</div><div class="branch"></div></div>
    <div class="row"><div class="label">\u5DE5\u4F5C\u76EE\u5F55</div><button class="directory" type="button" aria-label="\u590D\u5236\u5B8C\u6574\u5DE5\u4F5C\u76EE\u5F55" disabled></button></div>
    <div class="feedback" role="status"></div>
  </section>`;
    const panel = root.querySelector(".panel"), mode = root.querySelector(".mode");
    const branch = root.querySelector(".branch"), directory = root.querySelector(".directory"), feedback = root.querySelector(".feedback");
    const events = new window.AbortController(), options = { signal: events.signal };
    let path = null, opened = false, pinned = false, disposed = false, restoringFocus = false;
    let opening, closing;
    const cancelClose = () => {
      window.clearTimeout(closing);
      closing = void 0;
    };
    const position = () => {
      if (!opened) return;
      const currentZoom = Reflect.get(panelHost, "currentCSSZoom");
      const zoom = typeof currentZoom === "number" && currentZoom > 0 ? currentZoom : Number.parseFloat(window.getComputedStyle(panelHost).zoom) || 1;
      panel.style.maxWidth = `${Math.max(0, window.innerWidth - 24) / zoom}px`;
      panel.style.maxHeight = `${Math.max(0, window.innerHeight - 24) / zoom}px`;
      const anchor = button.getBoundingClientRect(), bounds = panelHost.getBoundingClientRect();
      const left = Math.max(12, Math.min(anchor.left, window.innerWidth - bounds.width - 12));
      const above = anchor.top - bounds.height - 8, top = above >= 12 ? above : Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - bounds.height - 12));
      panelHost.style.left = `${left / zoom}px`;
      panelHost.style.top = `${top / zoom}px`;
    };
    const close = (restoreFocus = false) => {
      window.clearTimeout(opening);
      opening = void 0;
      cancelClose();
      opened = false;
      pinned = false;
      const focused = Boolean(root.activeElement);
      panelHost.remove();
      button.setAttribute("aria-expanded", "false");
      if (restoreFocus && focused && button.isConnected) {
        restoringFocus = true;
        button.focus({ preventScroll: true });
        restoringFocus = false;
      }
    };
    const open = () => {
      window.clearTimeout(opening);
      opening = void 0;
      cancelClose();
      if (disposed || !button.isConnected || document.hidden) return;
      if (!opened) {
        opened = true;
        feedback.textContent = "";
        document.body.append(panelHost);
        button.setAttribute("aria-expanded", "true");
        onOpen();
      }
      position();
    };
    const scheduleClose = () => {
      window.clearTimeout(opening);
      opening = void 0;
      cancelClose();
      closing = window.setTimeout(() => {
        if (!pinned && document.activeElement !== button && !root.activeElement) close();
      }, 180);
    };
    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch" || event.buttons) return;
      cancelClose();
      window.clearTimeout(opening);
      opening = window.setTimeout(open, 180);
    }, options);
    button.addEventListener("pointerleave", scheduleClose, options);
    button.addEventListener("focus", () => {
      if (!restoringFocus) open();
    }, options);
    button.addEventListener("blur", scheduleClose, options);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (pinned) close();
      else {
        open();
        pinned = opened;
      }
    }, options);
    button.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        open();
        (directory.disabled ? panel : directory).focus({ preventScroll: true });
      }
    }, options);
    panelHost.addEventListener("pointerenter", cancelClose, options);
    panelHost.addEventListener("pointerleave", scheduleClose, options);
    panelHost.addEventListener("focusin", cancelClose, options);
    panelHost.addEventListener("focusout", scheduleClose, options);
    document.addEventListener("pointerdown", (event) => {
      const nodes = event.composedPath();
      if (opened && !nodes.includes(panelHost) && !nodes.includes(button)) close();
    }, { ...options, capture: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && opened) {
        event.preventDefault();
        event.stopPropagation();
        close(true);
      }
    }, { ...options, capture: true });
    document.addEventListener("scroll", (event) => {
      if (event.composedPath().includes(panelHost)) return;
      if (event.target === document || event.target instanceof Element && event.target.contains(button)) close();
    }, { ...options, capture: true });
    window.addEventListener("resize", () => close(true), options);
    window.addEventListener("blur", () => close(), options);
    directory.addEventListener("click", () => {
      if (!path) return;
      const selected = path;
      void Promise.resolve().then(() => navigator.clipboard.writeText(selected)).then(() => {
        if (!disposed && path === selected) {
          feedback.textContent = "\u76EE\u5F55\u5DF2\u590D\u5236";
          position();
        }
      }).catch(() => {
        if (disposed || path !== selected) return;
        const selection = root.getSelection?.() ?? window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(directory);
        selection?.removeAllRanges();
        selection?.addRange(range);
        feedback.textContent = "\u8BF7\u6309 \u2318C \u590D\u5236\u76EE\u5F55";
        position();
      });
    }, options);
    const update = (result, id) => {
      host.dataset.sessionId = id ?? "";
      panelHost.dataset.sessionId = id ?? "";
      const selected = result?.status === "ready" ? currentWorkspace(result.snapshot) : null;
      path = selected?.directory ?? null;
      directory.disabled = !path;
      const git = selected?.git, worktree = git?.status === "ready" && git.worktree;
      panel.dataset.worktree = String(worktree);
      host.dataset.worktree = String(worktree);
      button.style.color = worktree ? "var(--color-text-success,#53bba9)" : "";
      mode.textContent = !id ? "\u65B0\u4F1A\u8BDD" : git?.status === "ready" ? worktree ? "Worktree" : "\u4E3B\u5DE5\u4F5C\u526F\u672C" : git?.status === "not-git" ? "\u975E Git" : "\u5DE5\u4F5C\u76EE\u5F55";
      branch.textContent = selected ? branchLabel(selected.git) : "\u2014";
      directory.textContent = path ?? (!id ? "\u53D1\u9001\u6D88\u606F\u540E\u663E\u793A\u5DE5\u4F5C\u76EE\u5F55" : !result ? "\u6B63\u5728\u8BFB\u53D6\u2026" : result.status === "ready" && (result.snapshot.toolActivity?.directories.length ?? 0) > 1 ? "\u591A\u4E2A\u5DE5\u4F5C\u76EE\u5F55" : "\u76EE\u5F55\u672A\u77E5");
      directory.setAttribute("aria-label", path ? `\u590D\u5236\u5DE5\u4F5C\u76EE\u5F55\uFF1A${path}` : "\u5DE5\u4F5C\u76EE\u5F55");
      feedback.textContent = "";
      position();
    };
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      close();
      events.abort();
      control.dispose();
      host.remove();
    };
    return { host, button, panelHost, root, update, dispose, close, isOpen: () => opened };
  }

  // src/injected/entry.ts
  function activate(context) {
    let view = null, anchor = null, template = null, sessionId = null, sessionKey = null;
    let controller = null, disposed = false, lastRead = 0, timer;
    let result = null;
    const currentSession = () => localSessionIdentity(selectedThreadId(), window.location.href);
    const read = async () => {
      if (!view || !sessionId || disposed || document.hidden || controller) return;
      const target = view, id = sessionId, request = new AbortController();
      controller = request;
      lastRead = Date.now();
      try {
        const next = await context.rpc.call("workspace.read", { sessionId: id }, { signal: request.signal, timeoutMs: 15e3 });
        if (disposed || view !== target || sessionId !== id || currentSession()?.id !== id || request.signal.aborted) return;
        result = next;
        target.update(next, id);
      } catch {
        if (view === target && sessionId === id && !request.signal.aborted) {
          result = { status: "unavailable" };
          target.update(result, id);
        }
      } finally {
        if (controller === request) controller = null;
      }
    };
    const unmount = () => {
      controller?.abort();
      controller = null;
      view?.dispose();
      view = null;
      anchor = null;
      template = null;
      sessionId = null;
      sessionKey = null;
      result = null;
    };
    const reconcile = () => {
      timer = void 0;
      if (disposed) return;
      const controls = workspaceComposerControls(), identity = currentSession();
      if (document.hidden || !controls || !identity) {
        unmount();
        return;
      }
      if (anchor !== controls.container || template !== controls.template || sessionKey !== identity.key || !view?.host.isConnected) {
        unmount();
        anchor = controls.container;
        template = controls.template;
        sessionId = identity.id;
        sessionKey = identity.key;
        view = createWorkspaceView(template, () => void read());
        anchor.append(view.host);
        view.update(null, sessionId);
        void read();
      } else if (Date.now() - lastRead >= 3e3) void read();
    };
    const schedule = () => {
      if (sessionKey && currentSession()?.key !== sessionKey) unmount();
      if (!timer && !disposed) timer = setTimeout(reconcile, 100);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: [...workspaceObserverAttributes] });
    const onFocus = () => {
      lastRead = 0;
      schedule();
    }, interval = setInterval(reconcile, 1e3);
    window.addEventListener("focus", onFocus);
    window.addEventListener("popstate", schedule);
    document.addEventListener("visibilitychange", onFocus);
    const dispose = () => {
      if (disposed) return;
      disposed = true;
      observer.disconnect();
      clearInterval(interval);
      clearTimeout(timer);
      unmount();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("popstate", schedule);
      document.removeEventListener("visibilitychange", onFocus);
    };
    context.onDispose(dispose);
    reconcile();
    return { dispose, status: () => ({
      id: PLUGIN_ID,
      name: "Better Work Tree",
      placement: "composer",
      version: RUNTIME_VERSION,
      mounted: Boolean(view),
      tooltipOpen: Boolean(view?.isOpen()),
      sessionResolved: Boolean(sessionId),
      status: result?.status ?? (sessionId ? "loading" : "not-started"),
      source: result?.status === "ready" ? result.snapshot.source : null,
      gitStatus: result?.status === "ready" ? result.snapshot.git.status : null
    }) };
  }
  return __toCommonJS(entry_exports);
})();
