import { createRendererTransport } from "./renderer-transport.mjs";
import { installLoader } from "./renderer.mjs";
import { createResourceScope } from "./lifecycle.mjs";

export const LOADER_VERSION = "0.3.1";

/** Bootstrap only infrastructure; it never loads a product module. */
export function buildLoaderExpression() {
  return `(${installLoader.toString()})(${createResourceScope.toString()}, ${JSON.stringify(LOADER_VERSION)}, ${createRendererTransport.toString()})`;
}

export function buildPluginExpression({ id, version, apiVersion = 1, source, config = {}, owner = null, endpoint = null }) {
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

export function buildPluginRemovalExpression(id) {
  return `window.__codexPluginLoader?.unload(${JSON.stringify(id)}) ?? false`;
}

export function buildPluginMessageExpression(id, message) {
  return `window.__codexPluginLoader?.dispatch(${JSON.stringify(id)}, ${JSON.stringify(message)}) ?? false`;
}
