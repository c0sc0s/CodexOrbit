import type { RendererContext, RendererPlugin, ServiceContext, PluginEntry } from "../src/plugin-loader/index.mjs";
export const entry: PluginEntry = { id: "example", entry: "renderer.js", service: "service.mjs", version: "1" };
export async function activate(context: RendererContext): Promise<RendererPlugin> {
  const value = await context.rpc.call<string>("read", null, { signal: context.signal });
  context.events.subscribe("updated", () => {});
  context.onDispose(() => {});
  // @ts-expect-error Business code has no CDP transport.
  context.evaluate("window");
  return { status: () => value };
}
export function service(context: ServiceContext) {
  context.rpc.handle("read", (_payload, request) => request.clientId);
  context.clients.onConnect((id) => context.events.publish("updated", {}, id));
  // @ts-expect-error Services cannot build renderer expressions.
  context.renderer();
}
