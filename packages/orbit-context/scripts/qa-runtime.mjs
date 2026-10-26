import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { isAbsolute } from "node:path";
import { CodexProcess, PluginTargetRegistry } from "@c0sc0s/orbit";
import { contextUsageTrigger, contextUsageTriggers } from "@c0sc0s/orbit-tags/host-adapter";
import { RUNTIME_VERSION } from "../dist/shared/model.js";

const screenshot = process.argv[2] === "--screenshot" ? process.argv[3] : null;
assert.ok(!screenshot || isAbsolute(screenshot), "Screenshot destination must be absolute");
const owner = new CodexProcess(), registry = new PluginTargetRegistry({ ownsEndpoint: () => owner.ownsCdpEndpoint() });
const adapter = `const contextUsageTrigger = ${contextUsageTrigger.toString()}; const contextUsageTriggers = ${contextUsageTriggers.toString()};`;
let client, openedByQa = false;
try {
  for (const target of await registry.discover()) {
    const candidate = await registry.client(target);
    if (await candidate.evaluate(`(() => { ${adapter} return contextUsageTriggers(document).some(node => node.getBoundingClientRect().width > 0); })()`)) { client = candidate; break; }
  }
  assert.ok(client, "No visible native context ring; open a local conversation with token usage first");
  const status = await client.evaluate("window.__codexPluginLoader?.inspect('orbit-context')");
  assert.equal(status?.version, RUNTIME_VERSION, "Install the current Context runtime before live QA");
  assert.equal(status.sessionResolved, true, "The native window's local session must resolve");
  assert.equal(status.visible, false, "Close the Context panel before running live QA");
  openedByQa = true;
  const result = await client.evaluate(`(async () => {
    ${adapter}
    const trigger = contextUsageTriggers(document).find(node => node.getBoundingClientRect().width > 0);
    const label = trigger.getAttribute('aria-label');
    trigger.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }));
    for (let attempt = 0; attempt < 150; attempt++) {
      const root = document.getElementById('orbit-context-panel')?.shadowRoot;
      const panel = root?.querySelector('.panel'), measured = panel?.dataset.measured === 'true';
      if (measured && root.querySelector('.category-row')) {
        const bounds = panel.getBoundingClientRect(), zoom = Number.parseFloat(getComputedStyle(document.getElementById('orbit-context-panel')).zoom) || 1;
        return { measured: true, nativeLabelPreserved: trigger.getAttribute('aria-label') === label, categories: root.querySelectorAll('.category-row').length, width: bounds.width / zoom, height: bounds.height / zoom };
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return { measured: false };
  })()`);
  assert.equal(result.measured, true, "Native hover must display a measured local snapshot");
  assert.equal(result.nativeLabelPreserved, true);
  assert.ok(result.width <= 360 && result.height <= 340, `Hover card must stay compact: ${result.width} × ${result.height}`);
  if (screenshot) {
    const clip = await client.evaluate(`(() => {
      const bounds = document.getElementById('orbit-context-panel').getBoundingClientRect();
      return { x: Math.max(0, bounds.left), y: Math.max(0, bounds.top), width: Math.min(bounds.width, innerWidth - bounds.left), height: Math.min(bounds.height, innerHeight - bounds.top), scale: 1 };
    })()`);
    const image = await client.command("Page.captureScreenshot", { format: "png", clip });
    await writeFile(screenshot, Buffer.from(image.data, "base64"));
  }
  assert.equal(await client.evaluate(`(() => {
    const host = document.getElementById('orbit-context-panel'), root = host.shadowRoot;
    host.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }));
    root.querySelector('.category-row').click();
    const sources = Boolean(root.querySelector('.source-row'));
    root.querySelector('.back').click();
    root.querySelector('button[aria-label="矩形图"]').click();
    return sources && root.querySelectorAll('.tile').length > 0 && root.querySelectorAll('.tile').length <= 6 && !root.querySelector('.free');
  })()`), true, "Categories must drill into sources and the treemap must omit unused capacity");
  assert.equal(await client.evaluate(`(async () => {
    document.getElementById('orbit-context-panel').dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
    await new Promise(resolve => setTimeout(resolve, 350));
    return window.__codexPluginLoader.inspect('orbit-context').visible;
  })()`), false, "Leaving the hover card must dismiss it after interacting with its views");
  console.log(JSON.stringify({ runtimeVersion: RUNTIME_VERSION, nativeHover: true, measuredSnapshot: true, sourceDrilldown: true, categoryTreemap: true, pointerDismissal: true, categories: result.categories, size: { width: result.width, height: result.height }, scope: "Visible native ring and local RPC; conversation unchanged" }, null, 2));
} finally {
  if (client && openedByQa) await client.evaluate(`document.getElementById('orbit-context-panel')?.shadowRoot?.querySelector('button[aria-label="关闭上下文窗口"]')?.click(); true`).catch(() => {});
  registry.close();
}
