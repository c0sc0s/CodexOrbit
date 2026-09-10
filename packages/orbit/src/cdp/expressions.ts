import type { PluginSource } from "../protocol/types.js";
import { createRendererTransport } from "../renderer/transport.js";
import { installLoader } from "../renderer/loader.js";
import { createResourceScope } from "../lifecycle/resource-scope.js";

export const LOADER_VERSION = "0.5.0";

/** Bootstrap only infrastructure; it never loads a product module. */
export function buildLoaderExpression() {
  return `(${installLoader.toString()})(${createResourceScope.toString()}, ${JSON.stringify(LOADER_VERSION)}, ${createRendererTransport.toString()})`;
}

export function buildPluginExpression({ id, version, apiVersion = 1, source, config = {}, owner = null, endpoint = undefined }: PluginSource) {
  if (apiVersion !== 1 || typeof id !== "string" || !/^[a-z][a-z0-9.-]{0,63}$/.test(id)
    || typeof version !== "string" || !version || typeof source !== "string") throw new Error("Invalid plugin descriptor");
  return `(async () => {
    const loader = ${buildLoaderExpression()};
    return loader.load(${JSON.stringify({ id, version, apiVersion, owner, endpoint, instanceId: endpoint?.token })}, async (context) => {
      ${source}\n;
      return CodexPlugin.activate(context);
    }, ${JSON.stringify(config)});
  })()`;
}

export function buildPluginRemovalExpression(id: string) {
  return `window.__codexPluginLoader?.unload(${JSON.stringify(id)}) ?? false`;
}

export function buildPluginMessageExpression(id: string, message: unknown) {
  return `window.__codexPluginLoader?.dispatch(${JSON.stringify(id)}, ${JSON.stringify(message)}) ?? false`;
}
