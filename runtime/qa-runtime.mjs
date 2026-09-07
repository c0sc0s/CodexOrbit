import assert from "node:assert/strict";
import { CdpClient } from "./src/cdp-client.mjs";
import { CodexProcess } from "./src/codex-process.mjs";
import { RUNTIME_VERSION } from "./src/inject-expression.mjs";
import { RuntimeTargetRegistry } from "./src/runtime-target-registry.mjs";

const processOwner = new CodexProcess();
assert.ok(await processOwner.ownsCdpEndpoint(), "The owned Codex endpoint is required; QA never starts or restarts Codex.");
const registry = new RuntimeTargetRegistry({ port: 9341, ownsEndpoint: () => processOwner.ownsCdpEndpoint() });
let client;
for (const target of await registry.discover()) {
  const candidate = await registry.client(target);
  if (await candidate.evaluate("Boolean(document.querySelector('.codex-sidebar-dashboard-launcher'))")) { client = candidate; break; }
  candidate.close();
}
assert.ok(client, "Tags sidebar entry is missing");
const results = [];
async function scenario(name, expression) {
  const result = await client.evaluate(expression);
  assert.equal(result, true, `${name} failed`);
  results.push({ name, passed: true });
}

try {
  assert.equal(await client.evaluate("window.__codexSidebarTags.version"), RUNTIME_VERSION);
  await scenario("navigation and dialog", `(() => {
    document.querySelector('.codex-sidebar-dashboard-launcher').click();
    return document.querySelector('.codex-sidebar-dashboard-dialog')?.getAttribute('role') === 'dialog';
  })()`);
  await scenario("Chinese input composition", `(() => {
    const input = document.querySelector('.codex-sidebar-search-input');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '中文测试';
    input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
    const retained = input.isConnected;
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    return retained && document.querySelector('.codex-sidebar-search-input').value === '中文测试';
  })()`);
  await scenario("search response and readable sort menu", `(async () => {
    for (let attempt = 0; window.__codexSidebarTags.status().searchLoading && attempt < 100; attempt++) await new Promise(resolve => setTimeout(resolve, 100));
    const status = window.__codexSidebarTags.status();
    if (status.searchLoading || status.lastError) return false;
    document.querySelector('.codex-sidebar-sort-trigger').click();
    const menu = document.querySelector('.codex-sidebar-sort-menu');
    if (!menu || menu.querySelectorAll('button').length !== 4) return false;
    const style = getComputedStyle(menu);
    const distinct = style.color !== style.backgroundColor;
    await new Promise(resolve => setTimeout(resolve, 5500));
    const retained = menu.isConnected;
    document.querySelector('.codex-sidebar-sort-option[data-value="time"]').click();
    return distinct && retained;
  })()`);
  await scenario("tag editing without saving user data", `(async () => {
    document.querySelectorAll('.codex-sidebar-dashboard-tab')[1].click();
    const button = document.querySelector('.codex-sidebar-tag-config-name');
    if (!button) return true;
    button.click();
    const input = document.querySelector('.codex-sidebar-tag-description');
    input.value = 'Unsaved QA draft';
    await new Promise(resolve => setTimeout(resolve, 5500));
    const retained = input.isConnected && input.value === 'Unsaved QA draft';
    document.querySelectorAll('.codex-sidebar-dashboard-tab')[0].click();
    return retained;
  })()`);
  await scenario("title highlighting", `(() => {
    const input = document.querySelector('.codex-sidebar-search-input');
    input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
    const title = document.querySelector('.codex-sidebar-result-title')?.textContent;
    if (!title) return true;
    const current = document.querySelector('.codex-sidebar-search-input');
    current.value = title.slice(0, 4); current.dispatchEvent(new Event('input', { bubbles: true }));
    return Boolean(document.querySelector('.codex-sidebar-search-mark'));
  })()`);
  console.log(JSON.stringify({ runtimeVersion: RUNTIME_VERSION, results, scope: "Live UI and local bridge; no hook authorization, session mutation or cold restart" }, null, 2));
} finally {
  await client.evaluate(`(async () => {
    const input = document.querySelector('.codex-sidebar-search-input');
    if (input) { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); }
    document.querySelector('.codex-sidebar-dashboard-close')?.click();
    await new Promise(resolve => setTimeout(resolve, 400));
  })()`).catch(() => {});
  client.close();
}
