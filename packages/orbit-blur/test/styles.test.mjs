import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBlurStyles, resolveBlurSettings } from "../dist/styles.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

test("resolveBlurSettings applies defaults and clamps", () => {
  assert.deepEqual(resolveBlurSettings({}), {
    blurPx: 18,
    tintOpacity: 0.42,
  });
  assert.deepEqual(resolveBlurSettings({ blurPx: 99, tintOpacity: -1 }), {
    blurPx: 64,
    tintOpacity: 0,
  });
  assert.deepEqual(resolveBlurSettings({ blurPx: 12, tintOpacity: 0.5 }), {
    blurPx: 12,
    tintOpacity: 0.5,
  });
});

test("buildBlurStyles includes blur tokens and landmark chrome", () => {
  const css = buildBlurStyles({ blurPx: 20, tintOpacity: 0.4 });
  assert.match(css, /--orbit-blur-px:\s*20px/);
  assert.match(css, /backdrop-filter:\s*blur/);
  assert.match(css, /\[role="navigation"\]/);
  assert.match(css, /background:\s*transparent/);
});

test("orbit-plugin.json runtimeVersion matches injected bundle", async () => {
  const manifest = JSON.parse(await readFile(join(root, "orbit-plugin.json"), "utf8"));
  const injected = await readFile(join(root, "runtime", "dist", "injected.js"), "utf8");
  assert.equal(manifest.id, "orbit-blur");
  assert.equal(manifest.renderer, "runtime/dist/injected.js");
  assert.equal(manifest.service, undefined);
  assert.match(injected, /CodexPlugin/);
  assert.match(injected, new RegExp(String.raw`RUNTIME_VERSION\s*=\s*"${manifest.runtimeVersion}"`));
  assert.match(injected, /runtimeVersion:\s*RUNTIME_VERSION/);
  assert.match(injected, /backdrop-filter/);
});
