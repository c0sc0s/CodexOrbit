import { TAGS_PLUGIN_ID } from "./tags-plugin.mjs";
export { RUNTIME_VERSION } from "./tags-plugin.mjs";

export function buildRemovalExpression() {
  return `window.__codexPluginLoader?.unload(${JSON.stringify(TAGS_PLUGIN_ID)}) ?? false`;
}
