import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";
import { treemap } from "../dist/injected/treemap.js";

const source = await readFile(new URL("../runtime/injected.js", import.meta.url), "utf8"), id = "12345678-1234-1234-1234-123456789abc";
const result = { status: "ready", snapshot: { sessionId: id, model: "test-model", window: 10000, usage: { input: 1500, cached: 1200, output: 100, total: 1600 }, measuredAt: "2026-10-26T04:00:00Z", entries: [{ id: "system:test", category: "system", label: "Agent 提示词", tokens: 600, records: 1 }, { id: "results:exec", category: "results", label: "exec", tokens: 1000, records: 2 }], estimatedTokens: 1600, scaled: false, compactions: 0, partial: false, pendingRecords: 0 } };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function setup(t, options = {}) {
  const window = new Window({ url: options.url ?? `https://host.test/chat/${id}` }), document = window.document;
  document.body.innerHTML = '<span role="img" aria-label="Context usage: 16%"><svg><circle /></svg></span><button id="other">Other</button>';
  if (options.selectedId) {
    const row = document.createElement("div"); row.setAttribute("data-app-action-sidebar-thread-selected", "true");
    row.setAttribute("data-app-action-sidebar-thread-id", options.selectedId); document.body.append(row);
  }
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { x: 600, y: 650, left: 600, top: 650, width: this.id === "orbit-context-panel" ? 860 : 20, height: this.id === "orbit-context-panel" ? 450 : 20, right: 620, bottom: 670 }; };
  const scope = vm.createContext({ window, document, HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node, MutationObserver: window.MutationObserver, AbortController, setTimeout, clearTimeout, setInterval, clearInterval, URL });
  vm.runInContext(source, scope); const disposers = [], calls = [];
  const instance = scope.CodexPlugin.activate({ id: "orbit-context", config: {}, signal: new AbortController().signal, onDispose: fn => disposers.push(fn), rpc: { async call(method, payload, request) { calls.push({ method, payload, request }); return options.read ? options.read() : structuredClone(result); } } });
  const trigger = document.querySelector('[role="img"]');
  const over = () => trigger.querySelector("circle").dispatchEvent(new window.PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }));
  const out = () => trigger.dispatchEvent(new window.PointerEvent("pointerout", { bubbles: true, relatedTarget: document.body }));
  t.after(async () => { disposers.splice(0).reverse().forEach(fn => fn()); await window.happyDOM.close(); });
  return { window, document, trigger, over, out, calls, instance, dispose: () => disposers.splice(0).reverse().forEach(fn => fn()), panel: () => document.getElementById("orbit-context-panel"), root: () => document.getElementById("orbit-context-panel")?.shadowRoot };
}

test("treemap area is proportional with no overlap", () => {
  const tiles = treemap([{ id: "tools", tokens: 1600 }, { id: "results", tokens: 8400 }], 800, 250);
  for (const tile of tiles) assert.ok(Math.abs(tile.width * tile.height / 200000 - tile.item.tokens / 10000) < 1e-10);
  const [a, b] = tiles; assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y);
  assert.deepEqual(treemap([{ id: "zero", tokens: 0 }], 100, 100), []);
});
test("hovering the native indicator opens one panel, suppresses the native tooltip and retains hover into the panel", async t => {
  const host = setup(t); let nativeHover = 0; host.trigger.addEventListener("pointerover", () => nativeHover++);
  host.over(); await sleep(160); assert.ok(host.panel()); assert.equal(nativeHover, 0); assert.equal(host.calls.length, 1);
  assert.match(host.root().querySelector(".cache").textContent, /80%/); assert.equal(host.root().querySelector(".panel").dataset.measured, "true");
  assert.equal(host.root().querySelectorAll(".category-row").length, 2); assert.equal(host.root().querySelectorAll(".tile").length, 0);
  assert.equal(host.root().querySelector(".usage-value").textContent, "1.6K"); assert.equal(host.root().querySelector(".occupancy").textContent, "16% 已用");
  assert.equal(host.root().querySelector(".capacity").getAttribute("aria-valuenow"), "1600");
  host.out(); host.panel().dispatchEvent(new host.window.PointerEvent("pointerenter")); await sleep(280); assert.ok(host.panel());
  host.root().querySelector(".category-row").click(); assert.ok(host.root().querySelector(".source-list"));
  host.panel().dispatchEvent(new host.window.PointerEvent("pointerleave")); await sleep(280); assert.equal(host.panel(), null);
});

test("the compact overview ranks categories, drills into sources and keeps measurement notes on demand", async t => {
  const host = setup(t); host.over(); await sleep(160);
  const root = host.root(); assert.equal(root.querySelector(".category-row .row-name").textContent, "工具结果");
  assert.equal(root.querySelector(".category-row .row-share").textContent, "62.5%"); assert.equal(root.querySelector(".explanation"), null);
  root.querySelector(".category-row").click(); assert.equal(root.querySelector(".source-name").textContent, "exec");
  root.querySelector(".info-button").click(); assert.ok(root.querySelector(".explanation"));
  root.querySelector(".back").click(); assert.equal(root.querySelector(".source-name").textContent, "exec");
  root.querySelector(".back").click(); assert.equal(root.querySelectorAll(".category-row").length, 2);
  root.querySelector('button[aria-label="矩形图"]').click(); assert.equal(root.querySelectorAll(".tile").length, 2);
  assert.equal(root.querySelector(".free"), null); root.querySelector(".tile").click(); assert.ok(root.querySelector(".source-list"));
  root.querySelector(".back").click(); assert.equal(root.querySelectorAll(".tile").length, 2);
});

test("mouse interaction does not keep the hover card stuck open when leaving a focused control", async t => {
  const host = setup(t); host.over(); await sleep(160); const row = host.root().querySelector(".category-row");
  row.dispatchEvent(new host.window.PointerEvent("pointerdown", { bubbles: true, composed: true })); row.focus(); row.click();
  assert.ok(host.root().activeElement); host.panel().dispatchEvent(new host.window.PointerEvent("pointerleave"));
  await sleep(280); assert.equal(host.panel(), null);
});
test("keyboard activation, Escape, native attributes and unload are reversible", async t => {
  const host = setup(t); host.trigger.focus(); host.trigger.dispatchEvent(new host.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true })); await sleep(10);
  assert.ok(host.root().activeElement); host.document.dispatchEvent(new host.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(host.panel(), null); assert.equal(host.document.activeElement, host.trigger);
  host.dispose(); assert.equal(host.trigger.hasAttribute("tabindex"), false); assert.equal(host.trigger.getAttribute("aria-label"), "Context usage: 16%");
  assert.equal(host.trigger.hasAttribute("aria-haspopup"), false); host.over(); await sleep(150); assert.equal(host.panel(), null);
});
test("late RPC replies and navigation cannot reopen or contaminate a closed session", async t => {
  let release; const host = setup(t, { read: () => new Promise(resolve => { release = resolve; }) });
  host.over(); await sleep(150); host.window.history.pushState({}, "", `/chat/aaaaaaaa-1234-1234-1234-123456789abc`); await sleep(330);
  assert.equal(host.panel(), null); assert.equal(host.calls[0].request.signal.aborted, true); release(result); await sleep(10); assert.equal(host.panel(), null);
});
test("unsupported labels and routes preserve native hover; Chinese labels and replaced anchors work", async t => {
  const host = setup(t); host.window.history.pushState({}, "", "/home"); let native = 0;
  host.trigger.addEventListener("pointerover", () => native++); host.over(); await sleep(150); assert.equal(host.panel(), null); assert.equal(native, 1);
  host.window.history.pushState({}, "", `/chat/${id}`); host.trigger.setAttribute("aria-label", "上下文用量：16%"); host.over(); await sleep(150); assert.ok(host.panel());
  host.trigger.remove(); await sleep(350); assert.equal(host.panel(), null);
});

test("desktop memory routing resolves the local-prefixed selected session and closes on selection changes", async t => {
  const host = setup(t, { url: "app://-/index.html", selectedId: `local:${id}` });
  host.over(); await sleep(160); assert.ok(host.panel()); assert.equal(host.calls[0].payload.sessionId, id);
  host.document.querySelector("[data-app-action-sidebar-thread-selected]").setAttribute("data-app-action-sidebar-thread-id", "local:aaaaaaaa-1234-1234-1234-123456789abc");
  await sleep(330); assert.equal(host.panel(), null);
});

test("remote identities are never interpreted as a local session with the same UUID", async t => {
  const host = setup(t, { url: "app://-/index.html", selectedId: `remote:host:${id}` });
  let native = 0; host.trigger.addEventListener("pointerover", () => native++);
  host.over(); await sleep(160); assert.equal(host.panel(), null); assert.equal(host.calls.length, 0); assert.equal(native, 1);
});
