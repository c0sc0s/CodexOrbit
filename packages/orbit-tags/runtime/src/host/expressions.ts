import { TAGS_PLUGIN_ID } from "../shared/plugin.js";
export { RUNTIME_VERSION } from "../shared/plugin.js";

export function buildRemovalExpression() {
  return `window.__codexPluginLoader?.unload(${JSON.stringify(TAGS_PLUGIN_ID)}) ?? false`;
}
