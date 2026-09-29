import {
  DEFAULT_BLUR_PX,
  DEFAULT_TINT_OPACITY,
} from "./constants.js";

export { DEFAULT_BLUR_PX, DEFAULT_TINT_OPACITY, RUNTIME_VERSION, PLUGIN_ID, STYLE_ID } from "./constants.js";

export interface BlurSettings {
  blurPx: number;
  tintOpacity: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function numberOption(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Resolve plugin config from Orbit loader entry; unknown keys are ignored. */
export function resolveBlurSettings(config: Record<string, unknown> = {}): BlurSettings {
  return {
    blurPx: clamp(numberOption(config.blurPx, DEFAULT_BLUR_PX), 0, 64),
    tintOpacity: clamp(numberOption(config.tintOpacity, DEFAULT_TINT_OPACITY), 0, 1),
  };
}

export function buildBlurStyles({ blurPx, tintOpacity }: BlurSettings): string {
  const tintPercent = Math.round(tintOpacity * 100);
  // Landmark/role selectors only — no private Codex DOM attributes (those stay in orbit-tags).
  // root transparency helps when the Electron host is already translucent; frosted chrome
  // still blurs in-app content underneath via backdrop-filter either way.
  return `
:root {
  --orbit-blur-px: ${blurPx}px;
  --orbit-blur-tint: color-mix(in srgb, Canvas ${tintPercent}%, transparent);
  --orbit-blur-shell: color-mix(in srgb, Canvas ${Math.max(12, Math.round(tintPercent * 0.55))}%, transparent);
}

html, body {
  background: transparent !important;
  background-color: transparent !important;
}

:root {
  --color-background: transparent;
  --color-background-primary: transparent;
  --color-bg: transparent;
  --color-bg-primary: transparent;
  --background: transparent;
  --color-token-background: transparent;
}

aside,
nav,
header,
[role="navigation"],
[role="banner"],
[role="complementary"] {
  background-color: var(--orbit-blur-tint) !important;
  backdrop-filter: blur(var(--orbit-blur-px)) saturate(1.15);
  -webkit-backdrop-filter: blur(var(--orbit-blur-px)) saturate(1.15);
}

#root,
#app,
body > div:first-of-type {
  background-color: var(--orbit-blur-shell) !important;
  backdrop-filter: blur(var(--orbit-blur-px));
  -webkit-backdrop-filter: blur(var(--orbit-blur-px));
}

[role="dialog"],
[aria-modal="true"] {
  backdrop-filter: blur(calc(var(--orbit-blur-px) * 0.65)) saturate(1.1);
  -webkit-backdrop-filter: blur(calc(var(--orbit-blur-px) * 0.65)) saturate(1.1);
}
`.trim();
}
