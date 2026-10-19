"use strict";
var CodexPlugin = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/entry.ts
  var entry_exports = {};
  __export(entry_exports, {
    activate: () => activate
  });

  // src/constants.ts
  var RUNTIME_VERSION = "1.0.0";
  var PLUGIN_ID = "orbit-blur";
  var STYLE_ID = "orbit-blur-style";
  var DEFAULT_BLUR_PX = 18;
  var DEFAULT_TINT_OPACITY = 0.42;

  // src/styles.ts
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  function numberOption(value, fallback) {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
  }
  function resolveBlurSettings(config = {}) {
    return {
      blurPx: clamp(numberOption(config.blurPx, DEFAULT_BLUR_PX), 0, 64),
      tintOpacity: clamp(numberOption(config.tintOpacity, DEFAULT_TINT_OPACITY), 0, 1)
    };
  }
  function buildBlurStyles({ blurPx, tintOpacity }) {
    const tintPercent = Math.round(tintOpacity * 100);
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

  // src/entry.ts
  function ensureStyleElement() {
    const existing = document.getElementById(STYLE_ID);
    if (existing instanceof HTMLStyleElement) return existing;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    (document.head ?? document.documentElement).appendChild(style);
    return style;
  }
  async function activate(context) {
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
        tintOpacity: settings.tintOpacity
      })
    };
  }
  return __toCommonJS(entry_exports);
})();
