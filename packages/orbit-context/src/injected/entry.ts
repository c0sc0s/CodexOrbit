import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { contextUsageTrigger, contextUsageTriggers, selectedThreadId } from "@c0sc0s/orbit-tags/host-adapter";
import { RUNTIME_VERSION, localSessionId, sessionFromUrl } from "../shared/model.js";
import type { ContextResult } from "../shared/model.js";
import { createPanel } from "./panel.js";

export function activate(context: RendererContext) {
  const original = new Map<HTMLElement, { tabIndex: string | null; popup: string | null; expanded: string | null; controls: string | null }>();
  let view: ReturnType<typeof createPanel> | null = null, anchor: HTMLElement | null = null, sessionId: string | null = null;
  let opening: ReturnType<typeof setTimeout> | undefined, closing: ReturnType<typeof setTimeout> | undefined, reconcileTimer: ReturnType<typeof setTimeout> | undefined;
  let poll: ReturnType<typeof setInterval> | undefined, controller: AbortController | null = null, disposed = false, lastRead = 0, signature = "", keyboard = false, keyboardInput = false, restoringFocus = false;
  const currentSession = () => sessionFromUrl(window.location.href) ?? localSessionId(selectedThreadId());
  const cancelClose = () => { clearTimeout(closing); closing = undefined; };
  const close = (restoreFocus = false) => {
    clearTimeout(opening); opening = undefined; cancelClose(); clearInterval(poll); poll = undefined;
    controller?.abort(); controller = null;
    const target = anchor, focused = Boolean(view?.root.activeElement);
    view?.host.remove(); view = null; sessionId = null; signature = ""; keyboard = false;
    if (target) target.setAttribute("aria-expanded", "false");
    anchor = null;
    if (restoreFocus && focused && target?.isConnected) { restoringFocus = true; target.focus({ preventScroll: true }); restoringFocus = false; }
  };
  const position = () => {
    if (!view || !anchor) return;
    const rect = anchor.getBoundingClientRect(), zoom = Number.parseFloat(window.getComputedStyle(view.host).zoom) || 1;
    view.panel.style.maxWidth = `${Math.max(0, window.innerWidth - 24) / zoom}px`;
    view.panel.style.maxHeight = `${Math.max(0, window.innerHeight - 24) / zoom}px`;
    const bounds = view.host.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.right - bounds.width, window.innerWidth - bounds.width - 12));
    const above = rect.top - bounds.height - 8, top = above >= 12 ? above : Math.max(12, Math.min(rect.bottom + 8, window.innerHeight - bounds.height - 12));
    view.host.style.left = `${left / zoom}px`; view.host.style.top = `${top / zoom}px`;
  };
  const read = async () => {
    if (!view || !sessionId || controller || document.hidden) return;
    const target = view, id = sessionId, request = new AbortController(); controller = request; lastRead = Date.now();
    try {
      const result = await context.rpc.call<ContextResult>("context.read", { sessionId: id }, { signal: request.signal, timeoutMs: 30_000 });
      if (disposed || view !== target || sessionId !== id || request.signal.aborted) return;
      const next = JSON.stringify(result);
      if (signature !== next) { signature = next; target.update(result); position(); }
    } catch {
      if (view === target && !request.signal.aborted) { target.update({ status: "unavailable" }); position(); }
    } finally { if (controller === request) controller = null; }
  };
  const scheduleClose = () => {
    clearTimeout(opening); opening = undefined; cancelClose();
    closing = setTimeout(() => { if (!keyboard || !view?.root.activeElement && document.activeElement !== anchor) close(true); }, 240);
  };
  const open = (target: HTMLElement, fromKeyboard = false) => {
    const id = currentSession();
    if (!id || disposed || !target.isConnected) return;
    clearTimeout(opening); opening = undefined; cancelClose();
    if (anchor === target && sessionId === id && view) { if (fromKeyboard) { keyboard = true; view.focus(); } return; }
    close(); anchor = target; sessionId = id; keyboard = fromKeyboard;
    view = createPanel(() => close(true), position); view.loading(); document.body.append(view.host);
    target.setAttribute("aria-expanded", "true");
    view.host.addEventListener("pointerenter", cancelClose); view.host.addEventListener("pointerleave", scheduleClose);
    view.host.addEventListener("focusout", scheduleClose);
    view.host.addEventListener("focusin", () => { keyboard = keyboardInput; cancelClose(); });
    position(); if (fromKeyboard) view.focus(); void read();
    poll = setInterval(() => {
      if (!target.isConnected || currentSession() !== id || target.getBoundingClientRect().width === 0) { close(); return; }
      if (Date.now() - lastRead >= 5000) void read();
    }, 300);
  };
  const onOver = (event: Event) => {
    const trigger = contextUsageTrigger(event.target);
    if (!trigger || !currentSession()) return;
    // React's delegated hover handlers would otherwise open a second native tooltip.
    event.stopPropagation(); cancelClose();
    if (anchor === trigger && view || opening) return;
    opening = setTimeout(() => open(trigger), 120);
  };
  const onMove = (event: Event) => { if (contextUsageTrigger(event.target) && currentSession()) event.stopPropagation(); };
  const onOut = (event: Event) => {
    const trigger = contextUsageTrigger(event.target);
    if (!trigger || !currentSession()) return;
    const related = (event as PointerEvent).relatedTarget;
    if (related instanceof Node && trigger.contains(related)) return;
    scheduleClose();
  };
  const onKey = (event: KeyboardEvent) => {
    if (["Tab", "Enter", " ", "ArrowDown", "ArrowUp"].includes(event.key)) { keyboardInput = true; keyboard = true; }
    if (event.key === "Escape" && view) { event.preventDefault(); event.stopPropagation(); close(true); return; }
    const trigger = contextUsageTrigger(event.target);
    if (trigger && ["Enter", " ", "ArrowDown"].includes(event.key) && currentSession()) { event.preventDefault(); event.stopPropagation(); open(trigger, true); }
  };
  const onFocus = (event: Event) => { const trigger = contextUsageTrigger(event.target); if (trigger && currentSession()) { event.stopPropagation(); if (!restoringFocus) { open(trigger); keyboard = keyboardInput; } } };
  const onBlur = (event: Event) => { if (contextUsageTrigger(event.target)) scheduleClose(); };
  const onDown = (event: Event) => {
    keyboardInput = false; keyboard = false;
    if (view && !event.composedPath().includes(view.host) && !contextUsageTrigger(event.target)) close();
  };
  const restore = (node: HTMLElement) => {
    const state = original.get(node); if (!state) return;
    for (const [attribute, value] of [["tabindex", state.tabIndex], ["aria-haspopup", state.popup], ["aria-expanded", state.expanded], ["aria-controls", state.controls]]) {
      if (value === null) node.removeAttribute(attribute!); else node.setAttribute(attribute!, value!);
    }
    original.delete(node);
  };
  const reconcile = () => {
    reconcileTimer = undefined;
    for (const node of original.keys()) if (!node.isConnected || !contextUsageTrigger(node)) restore(node);
    for (const node of contextUsageTriggers(document)) {
      if (original.has(node)) continue;
      original.set(node, { tabIndex: node.getAttribute("tabindex"), popup: node.getAttribute("aria-haspopup"), expanded: node.getAttribute("aria-expanded"), controls: node.getAttribute("aria-controls") });
      node.tabIndex = 0; node.setAttribute("aria-haspopup", "dialog"); node.setAttribute("aria-expanded", "false"); node.setAttribute("aria-controls", "orbit-context-panel");
    }
  };
  const observer = new MutationObserver(() => { if (!reconcileTimer) reconcileTimer = setTimeout(reconcile, 100); });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-label"] });
  const listeners: Array<[string, EventListener]> = [["pointerover", onOver], ["mouseover", onOver], ["pointermove", onMove], ["pointerout", onOut], ["mouseout", onOut], ["keydown", onKey as EventListener], ["focusin", onFocus], ["focusout", onBlur], ["pointerdown", onDown]];
  for (const [type, listener] of listeners) document.addEventListener(type, listener, true);
  const onResize = () => { view?.resize(); position(); };
  const onScroll = (event: Event) => { if (view && !event.composedPath().includes(view.host)) position(); };
  window.addEventListener("resize", onResize); document.addEventListener("scroll", onScroll, true);
  reconcile();
  const dispose = () => {
    if (disposed) return; disposed = true; close(true); observer.disconnect(); clearTimeout(reconcileTimer);
    for (const [type, listener] of listeners) document.removeEventListener(type, listener, true);
    window.removeEventListener("resize", onResize); document.removeEventListener("scroll", onScroll, true);
    for (const node of original.keys()) restore(node);
  };
  context.onDispose(dispose);
  return { dispose, status: () => ({ version: RUNTIME_VERSION, anchors: original.size, sessionResolved: Boolean(currentSession()), visible: Boolean(view), loading: Boolean(controller) }) };
}
