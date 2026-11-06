import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { selectedThreadId, workspaceComposerControls, workspaceObserverAttributes } from "@c0sc0s/orbit-tags/host-adapter";
import { localSessionIdentity, PLUGIN_ID, RUNTIME_VERSION } from "../shared/model.js";
import type { WorkspaceResult } from "../shared/model.js";
import { createWorkspaceView } from "./view.js";

export function activate(context: RendererContext) {
  let view: ReturnType<typeof createWorkspaceView> | null = null, anchor: HTMLElement | null = null, template: HTMLButtonElement | null = null, sessionId: string | null = null, sessionKey: string | null = null;
  let controller: AbortController | null = null, disposed = false, lastRead = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let result: WorkspaceResult | null = null;
  const currentSession = () => localSessionIdentity(selectedThreadId(), window.location.href);
  const read = async () => {
    if (!view || !sessionId || disposed || document.hidden || controller) return;
    const target = view, id = sessionId, request = new AbortController(); controller = request; lastRead = Date.now();
    try {
      const next = await context.rpc.call<WorkspaceResult>("workspace.read", { sessionId: id }, { signal: request.signal, timeoutMs: 15_000 });
      if (disposed || view !== target || sessionId !== id || currentSession()?.id !== id || request.signal.aborted) return;
      result = next; target.update(next, id);
    } catch {
      if (view === target && sessionId === id && !request.signal.aborted) { result = { status: "unavailable" }; target.update(result, id); }
    } finally { if (controller === request) controller = null; }
  };
  const unmount = () => {
    controller?.abort(); controller = null; view?.dispose(); view = null; anchor = null; template = null; sessionId = null; sessionKey = null; result = null;
  };
  const reconcile = () => {
    timer = undefined;
    if (disposed) return;
    const controls = workspaceComposerControls(), identity = currentSession();
    if (document.hidden || !controls || !identity) { unmount(); return; }
    if (anchor !== controls.container || template !== controls.template || sessionKey !== identity.key || !view?.host.isConnected) {
      unmount(); anchor = controls.container; template = controls.template; sessionId = identity.id; sessionKey = identity.key;
      view = createWorkspaceView(template, () => void read()); anchor.append(view.host); view.update(null, sessionId); void read();
    } else if (Date.now() - lastRead >= 3000) void read();
  };
  const schedule = () => {
    if (sessionKey && currentSession()?.key !== sessionKey) unmount();
    if (!timer && !disposed) timer = setTimeout(reconcile, 100);
  };
  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: [...workspaceObserverAttributes] });
  const onFocus = () => { lastRead = 0; schedule(); }, interval = setInterval(reconcile, 1000);
  window.addEventListener("focus", onFocus); window.addEventListener("popstate", schedule); document.addEventListener("visibilitychange", onFocus);
  const dispose = () => {
    if (disposed) return; disposed = true; observer.disconnect(); clearInterval(interval); clearTimeout(timer); unmount();
    window.removeEventListener("focus", onFocus); window.removeEventListener("popstate", schedule); document.removeEventListener("visibilitychange", onFocus);
  };
  context.onDispose(dispose); reconcile();
  return { dispose, status: () => ({ id: PLUGIN_ID, name: "Better Work Tree", placement: "composer", version: RUNTIME_VERSION, mounted: Boolean(view), tooltipOpen: Boolean(view?.isOpen()), sessionResolved: Boolean(sessionId),
    status: result?.status ?? (sessionId ? "loading" : "not-started"), source: result?.status === "ready" ? result.snapshot.source : null,
    gitStatus: result?.status === "ready" ? result.snapshot.git.status : null }) };
}
