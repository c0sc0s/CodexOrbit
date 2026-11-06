import { createSidebarButton } from "@c0sc0s/orbit/ui";
import { currentWorkspace } from "../shared/model.js";
import type { GitState, WorkspaceResult } from "../shared/model.js";

const styles = `
*{box-sizing:border-box}.panel{width:360px;max-width:100%;padding:13px 14px;border:1px solid var(--color-border-default,var(--color-border-secondary,#8883));border-radius:11px;background:var(--color-background-elevated-primary-opaque,var(--color-background-elevated-primary,Canvas));color:var(--color-text-primary,CanvasText);box-shadow:0 12px 36px #0004,0 2px 8px #0002;font:12px/1.5 var(--font-sans,system-ui,sans-serif);overflow:auto}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:13px}.title{font-size:12px;font-weight:600}.mode{font-size:10px;color:var(--color-text-secondary,GrayText);white-space:nowrap}.panel[data-worktree=true] .mode{color:var(--color-text-success,#53bba9)}.row+.row{margin-top:11px}.label{margin-bottom:3px;color:var(--color-text-secondary,GrayText);font-size:10px}.branch,.directory{white-space:pre-wrap;overflow-wrap:anywhere;font:11.5px/1.6 var(--font-mono,ui-monospace,monospace)}.directory{display:block;max-width:100%;padding:0;border:0;background:transparent;text-align:left;color:inherit;cursor:pointer;user-select:text}.directory:disabled{cursor:default}.directory:hover:not(:disabled){color:var(--color-text-link,inherit);text-decoration:underline;text-underline-offset:3px}.directory:focus-visible{outline:2px solid var(--color-border-focus,#999);outline-offset:3px;border-radius:2px}.feedback{margin-top:8px;font-size:10px;color:var(--color-text-secondary,GrayText)}.feedback:empty{display:none}
`;
export function branchLabel(git: GitState): string {
  return git.status === "ready" ? git.branch ?? (git.commit ? `detached · ${git.commit.slice(0, 8)}` : "尚无提交")
    : git.status === "not-git" ? "非 Git 目录" : "分支未知";
}
export function createWorkspaceView(template: HTMLButtonElement, onOpen: () => void = () => {}) {
  const host = document.createElement("span"); host.id = "better-work-tree-indicator";
  host.style.cssText = "display:inline-flex;align-items:center;flex:none;pointer-events:auto;-webkit-app-region:no-drag";
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("fill", "none"); icon.setAttribute("stroke", "currentColor"); icon.setAttribute("stroke-width", "1.65"); icon.setAttribute("stroke-linecap", "round"); icon.setAttribute("stroke-linejoin", "round");
  icon.innerHTML = '<circle cx="5" cy="5" r="2"/><path d="M5 7v10a2 2 0 0 0 2 2h6M7 5h6"/><rect x="13" y="2" width="8" height="6" rx="1.4"/><rect x="13" y="16" width="8" height="6" rx="1.4"/>';
  const control = createSidebarButton({ id: "better-work-tree-trigger", label: "Better Work Tree", icon, template, tooltip: false });
  const button = control.element; button.setAttribute("aria-haspopup", "dialog"); button.setAttribute("aria-expanded", "false"); button.setAttribute("aria-controls", "better-work-tree-panel"); host.append(button);
  const panelHost = document.createElement("div"); panelHost.id = "better-work-tree-panel";
  panelHost.style.cssText = "position:fixed;z-index:10001;inset:auto;zoom:var(--codex-window-zoom,1);pointer-events:auto";
  const root = panelHost.attachShadow({ mode: "open" });
  root.innerHTML = `<style>${styles}</style><section class="panel" role="dialog" aria-label="Better Work Tree" tabindex="-1">
    <div class="header"><span class="title">Better Work Tree</span><span class="mode"></span></div>
    <div class="row"><div class="label">分支</div><div class="branch"></div></div>
    <div class="row"><div class="label">工作目录</div><button class="directory" type="button" aria-label="复制完整工作目录" disabled></button></div>
    <div class="feedback" role="status"></div>
  </section>`;
  const panel = root.querySelector<HTMLElement>(".panel")!, mode = root.querySelector<HTMLElement>(".mode")!;
  const branch = root.querySelector<HTMLElement>(".branch")!, directory = root.querySelector<HTMLButtonElement>(".directory")!, feedback = root.querySelector<HTMLElement>(".feedback")!;
  const events = new window.AbortController(), options = { signal: events.signal };
  let path: string | null = null, opened = false, pinned = false, disposed = false, restoringFocus = false;
  let opening: number | undefined, closing: number | undefined;
  const cancelClose = () => { window.clearTimeout(closing); closing = undefined; };
  const position = () => {
    if (!opened) return;
    const currentZoom: unknown = Reflect.get(panelHost, "currentCSSZoom");
    const zoom = typeof currentZoom === "number" && currentZoom > 0 ? currentZoom : Number.parseFloat(window.getComputedStyle(panelHost).zoom) || 1;
    panel.style.maxWidth = `${Math.max(0, window.innerWidth - 24) / zoom}px`;
    panel.style.maxHeight = `${Math.max(0, window.innerHeight - 24) / zoom}px`;
    const anchor = button.getBoundingClientRect(), bounds = panelHost.getBoundingClientRect();
    const left = Math.max(12, Math.min(anchor.left, window.innerWidth - bounds.width - 12));
    const above = anchor.top - bounds.height - 8, top = above >= 12 ? above : Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - bounds.height - 12));
    panelHost.style.left = `${left / zoom}px`; panelHost.style.top = `${top / zoom}px`;
  };
  const close = (restoreFocus = false) => {
    window.clearTimeout(opening); opening = undefined; cancelClose(); opened = false; pinned = false;
    const focused = Boolean(root.activeElement); panelHost.remove(); button.setAttribute("aria-expanded", "false");
    if (restoreFocus && focused && button.isConnected) { restoringFocus = true; button.focus({ preventScroll: true }); restoringFocus = false; }
  };
  const open = () => {
    window.clearTimeout(opening); opening = undefined; cancelClose();
    if (disposed || !button.isConnected || document.hidden) return;
    if (!opened) { opened = true; feedback.textContent = ""; document.body.append(panelHost); button.setAttribute("aria-expanded", "true"); onOpen(); }
    position();
  };
  const scheduleClose = () => {
    window.clearTimeout(opening); opening = undefined; cancelClose();
    closing = window.setTimeout(() => { if (!pinned && document.activeElement !== button && !root.activeElement) close(); }, 180);
  };
  button.addEventListener("pointerenter", event => {
    if (event.pointerType === "touch" || event.buttons) return;
    cancelClose(); window.clearTimeout(opening); opening = window.setTimeout(open, 180);
  }, options);
  button.addEventListener("pointerleave", scheduleClose, options);
  button.addEventListener("focus", () => { if (!restoringFocus) open(); }, options);
  button.addEventListener("blur", scheduleClose, options);
  button.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); if (pinned) close(); else { open(); pinned = opened; } }, options);
  button.addEventListener("keydown", event => { if (event.key === "ArrowDown") { event.preventDefault(); open(); (directory.disabled ? panel : directory).focus({ preventScroll: true }); } }, options);
  panelHost.addEventListener("pointerenter", cancelClose, options); panelHost.addEventListener("pointerleave", scheduleClose, options);
  panelHost.addEventListener("focusin", cancelClose, options); panelHost.addEventListener("focusout", scheduleClose, options);
  document.addEventListener("pointerdown", event => { const nodes = event.composedPath(); if (opened && !nodes.includes(panelHost) && !nodes.includes(button)) close(); }, { ...options, capture: true });
  document.addEventListener("keydown", event => { if (event.key === "Escape" && opened) { event.preventDefault(); event.stopPropagation(); close(true); } }, { ...options, capture: true });
  document.addEventListener("scroll", event => { if (event.composedPath().includes(panelHost)) return; if (event.target === document || event.target instanceof Element && event.target.contains(button)) close(); }, { ...options, capture: true });
  window.addEventListener("resize", () => close(true), options); window.addEventListener("blur", () => close(), options);
  directory.addEventListener("click", () => {
    if (!path) return;
    const selected = path;
    void Promise.resolve().then(() => navigator.clipboard.writeText(selected)).then(() => { if (!disposed && path === selected) { feedback.textContent = "目录已复制"; position(); } }).catch(() => {
      if (disposed || path !== selected) return;
      const selection = (root as ShadowRoot & { getSelection?(): Selection | null }).getSelection?.() ?? window.getSelection();
      const range = document.createRange(); range.selectNodeContents(directory); selection?.removeAllRanges(); selection?.addRange(range); feedback.textContent = "请按 ⌘C 复制目录"; position();
    });
  }, options);
  const update = (result: WorkspaceResult | null, id: string | null) => {
    host.dataset.sessionId = id ?? ""; panelHost.dataset.sessionId = id ?? "";
    const selected = result?.status === "ready" ? currentWorkspace(result.snapshot) : null;
    path = selected?.directory ?? null; directory.disabled = !path;
    const git = selected?.git, worktree = git?.status === "ready" && git.worktree;
    panel.dataset.worktree = String(worktree); host.dataset.worktree = String(worktree);
    button.style.color = worktree ? "var(--color-text-success,#53bba9)" : "";
    mode.textContent = !id ? "新会话" : git?.status === "ready" ? worktree ? "Worktree" : "主工作副本" : git?.status === "not-git" ? "非 Git" : "工作目录";
    branch.textContent = selected ? branchLabel(selected.git) : "—";
    directory.textContent = path ?? (!id ? "发送消息后显示工作目录" : !result ? "正在读取…" : result.status === "ready" && (result.snapshot.toolActivity?.directories.length ?? 0) > 1 ? "多个工作目录" : "目录未知");
    directory.setAttribute("aria-label", path ? `复制工作目录：${path}` : "工作目录"); feedback.textContent = ""; position();
  };
  const dispose = () => { if (disposed) return; disposed = true; close(); events.abort(); control.dispose(); host.remove(); };
  return { host, button, panelHost, root, update, dispose, close, isOpen: () => opened };
}
