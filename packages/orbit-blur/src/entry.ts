import type { RendererContext, RendererPlugin } from "@c0sc0s/orbit/sdk";
import { PLUGIN_ID, RUNTIME_VERSION, STYLE_ID } from "./constants.js";
import { buildBlurStyles, resolveBlurSettings } from "./styles.js";

function ensureStyleElement(): HTMLStyleElement {
  const existing = document.getElementById(STYLE_ID);
  if (existing instanceof HTMLStyleElement) return existing;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  (document.head ?? document.documentElement).appendChild(style);
  return style;
}

export async function activate(context: RendererContext): Promise<RendererPlugin> {
  const settings = resolveBlurSettings(context.config);
  const style = ensureStyleElement();
  style.textContent = buildBlurStyles(settings);
  context.onDispose(() => {
    document.getElementById(STYLE_ID)?.remove();
  });
  return {
    isActive: () => Boolean(document.getElementById(STYLE_ID)),
    status: () => ({
      plugin: PLUGIN_ID,
      runtimeVersion: RUNTIME_VERSION,
      active: Boolean(document.getElementById(STYLE_ID)),
      blurPx: settings.blurPx,
      tintOpacity: settings.tintOpacity,
    }),
  };
}
