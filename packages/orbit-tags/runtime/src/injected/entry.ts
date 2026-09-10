import { installRuntime } from "./runtime";
import type { RendererContext } from "@c0sc0s/orbit/sdk";

export { installRuntime };
export async function activate(context: RendererContext) {
  let tags: unknown = null;
  try { tags = JSON.parse(localStorage.getItem("codex-sidebar-tags-config-v1") ?? "null"); } catch {}
  const config = await context.rpc.call("bootstrap", { tags });
  let runtime: typeof window.__codexSidebarTags;
  context.onDispose(() => { runtime?.dispose?.(); });
  context.events.subscribe("message", (message) => { runtime?.handleMessage(message); });
  installRuntime(config, (message) => context.rpc.call("dispatch", message));
  runtime = window.__codexSidebarTags;
  return {
    isActive: () => window.__codexSidebarTags === runtime,
    status: () => runtime?.status(),
    handleMessage: (message: unknown) => runtime?.handleMessage(message),
  };
}
