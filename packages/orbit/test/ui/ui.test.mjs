import assert from "node:assert/strict";
import test from "node:test";
import { Window } from "happy-dom";
import { createSidebarButton, mountTooltip } from "@c0sc0s/orbit/ui";

function setup(t) {
  const window = new Window();
  const document = window.document;
  t.after(() => window.happyDOM.close());
  const trigger = document.createElement("button");
  document.body.append(trigger);
  return { window, document, trigger };
}

const rect = (x, y, width, height) => ({ x, y, left: x, top: y, right: x + width, bottom: y + height, width, height, toJSON() {} });

test("tooltip waits for hover, preserves existing descriptions and dismisses on leave", async (t) => {
  const { window, document, trigger } = setup(t);
  trigger.setAttribute("aria-describedby", "help");
  const dispose = mountTooltip(trigger, { label: "Tags" });
  t.after(dispose);
  trigger.dispatchEvent(new window.PointerEvent("pointerenter", { pointerType: "mouse" }));
  assert.equal(document.querySelector('[role="tooltip"]'), null);
  await window.happyDOM.whenAsyncComplete();
  const tooltip = document.querySelector('[role="tooltip"]');
  assert.equal(tooltip.textContent, "Tags");
  assert.equal(trigger.getAttribute("aria-describedby"), `help ${tooltip.id}`);
  trigger.dispatchEvent(new window.PointerEvent("pointerleave"));
  assert.equal(tooltip.isConnected, false);
  assert.equal(trigger.getAttribute("aria-describedby"), "help");
});

test("touch, brief hovers and expanded popups do not leave hints behind", async (t) => {
  const { window, document, trigger } = setup(t);
  const dispose = mountTooltip(trigger, { label: "Tags" });
  t.after(dispose);
  trigger.dispatchEvent(new window.PointerEvent("pointerenter", { pointerType: "touch" }));
  await window.happyDOM.whenAsyncComplete();
  assert.equal(document.querySelector('[role="tooltip"]'), null);
  trigger.dispatchEvent(new window.PointerEvent("pointerenter", { pointerType: "mouse" }));
  trigger.dispatchEvent(new window.PointerEvent("pointerleave"));
  await window.happyDOM.whenAsyncComplete();
  assert.equal(document.querySelector('[role="tooltip"]'), null);
  trigger.setAttribute("aria-expanded", "true");
  trigger.dispatchEvent(new window.FocusEvent("focus"));
  assert.equal(document.querySelector('[role="tooltip"]'), null);
});

test("keyboard focus shows hints and subsequent interactions dismiss them", (t) => {
  const { window, document, trigger } = setup(t);
  const dispose = mountTooltip(trigger, { label: "Tags" });
  t.after(dispose);
  for (const dismiss of [
    () => trigger.dispatchEvent(new window.FocusEvent("blur")),
    () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" })),
    () => document.dispatchEvent(new window.PointerEvent("pointerdown")),
    () => document.dispatchEvent(new window.Event("scroll")),
    () => window.dispatchEvent(new window.Event("resize")),
    () => window.dispatchEvent(new window.Event("blur")),
    () => trigger.click(),
  ]) {
    trigger.dispatchEvent(new window.FocusEvent("focus"));
    assert.ok(document.querySelector('[role="tooltip"]'));
    dismiss();
    assert.equal(document.querySelector('[role="tooltip"]'), null);
  }
});

test("unrelated auto-scroll preserves a pending hint while anchor scrolling dismisses it", async (t) => {
  const { window, document, trigger } = setup(t);
  const sidebar = document.createElement("div");
  const conversation = document.createElement("div");
  document.body.append(sidebar, conversation);
  sidebar.append(trigger);
  const dispose = mountTooltip(trigger, { label: "Tags" });
  t.after(dispose);
  trigger.dispatchEvent(new window.PointerEvent("pointerenter", { pointerType: "mouse" }));
  conversation.dispatchEvent(new window.Event("scroll"));
  await window.happyDOM.whenAsyncComplete();
  const tooltip = document.querySelector('[role="tooltip"]');
  assert.ok(tooltip);
  conversation.dispatchEvent(new window.Event("scroll"));
  assert.ok(tooltip.isConnected);
  sidebar.dispatchEvent(new window.Event("scroll"));
  assert.equal(tooltip.isConnected, false);
});

test("native two-pixel spacing stays constant at different window zoom levels", (t) => {
  const { window, document, trigger } = setup(t);
  const nativeRect = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return this === trigger ? rect(10, 100, 40, 40) : rect(0, 0, 80, 30);
  };
  t.after(() => { window.HTMLElement.prototype.getBoundingClientRect = nativeRect; });
  const dispose = mountTooltip(trigger, { label: "Tags" });
  t.after(dispose);
  for (const zoom of [1, 1.1, 1.25]) {
    document.documentElement.style.setProperty("--codex-window-zoom", String(zoom));
    trigger.dispatchEvent(new window.FocusEvent("focus"));
    const tooltip = document.querySelector('[role="tooltip"]');
    assert.ok(Math.abs(Number.parseFloat(tooltip.style.left) * zoom - 52) < .001);
    assert.ok(Math.abs(Number.parseFloat(tooltip.style.top) * zoom - 105) < .001);
  }
});

test("tooltip flips at the viewport edge and supports vertical placement", (t) => {
  const { window, document, trigger } = setup(t);
  const nativeRect = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    return this === trigger ? rect(window.innerWidth - 40, 100, 40, 40) : rect(0, 0, 80, 30);
  };
  t.after(() => { window.HTMLElement.prototype.getBoundingClientRect = nativeRect; });
  const dispose = mountTooltip(trigger, { label: "Tags" });
  trigger.dispatchEvent(new window.FocusEvent("focus"));
  const tooltip = document.querySelector('[role="tooltip"]');
  assert.equal(tooltip.dataset.side, "left");
  assert.equal(Number.parseFloat(tooltip.style.left), window.innerWidth - 122);
  dispose();
  const disposeTop = mountTooltip(trigger, { label: "Tags", side: "top" });
  t.after(disposeTop);
  trigger.dispatchEvent(new window.FocusEvent("focus"));
  assert.equal(document.querySelector('[role="tooltip"]').style.top, "68px");
});

test("independent plugin controls retain native presentation without sharing identities or cleanup", (t) => {
  const { window, document, trigger: native } = setup(t);
  native.className = "native-navigation";
  native.setAttribute("data-size", "xl");
  native.setAttribute("data-selected", "");
  native.setAttribute("data-sidebar-destination", "builtin:customize");
  native.setAttribute("data-slate-sidebar-peek-area", "customize");
  native.setAttribute("aria-describedby", "native-tooltip");
  native.title = "Plugins";
  native.innerHTML = '<span><svg class="native-icon" width="20" height="20" viewBox="0 0 20 20"></svg><span class="sr-only">Plugins</span></span>';
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 16 16");
  icon.innerHTML = "<title>Example glyph</title><text>+</text>";
  let clicks = 0;
  const first = createSidebarButton({ id: "first-plugin", label: "Tags", icon, template: native, onClick: () => { clicks++; } });
  const second = createSidebarButton({ id: "second-plugin", label: "Other", icon, template: native });
  t.after(() => { first.dispose(); second.dispose(); });
  document.body.append(first.element, second.element);
  assert.equal(first.element.className, native.className);
  assert.equal(first.element.getAttribute("data-size"), "xl");
  assert.equal(first.element.querySelector(".sr-only").textContent, "Tags");
  assert.equal(first.element.querySelector("svg").textContent, "Example glyph+");
  assert.equal(first.element.querySelector("svg").getAttribute("viewBox"), "0 0 16 16");
  assert.equal(first.element.querySelector("svg").getAttribute("class"), "native-icon");
  for (const name of ["data-selected", "data-sidebar-destination", "data-slate-sidebar-peek-area", "aria-describedby", "title"]) {
    assert.equal(first.element.hasAttribute(name), false);
  }
  first.element.click();
  assert.equal(clicks, 1);
  first.element.dispatchEvent(new window.FocusEvent("focus"));
  second.element.dispatchEvent(new window.FocusEvent("focus"));
  const otherHint = document.getElementById(second.element.getAttribute("aria-describedby"));
  first.dispose();
  assert.ok(otherHint.isConnected);
  assert.ok(second.element.isConnected);
  first.element.click();
  assert.equal(clicks, 1);
  assert.equal(native.textContent, "Plugins");
  assert.equal(native.getAttribute("aria-describedby"), "native-tooltip");
});

test("disposing cancels pending hints and removes only that plugin's fallback styles", async (t) => {
  const { window, document } = setup(t);
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const first = createSidebarButton({ id: "fallback-a", label: "A", icon });
  const second = createSidebarButton({ id: "fallback-b", label: "B", icon });
  t.after(second.dispose);
  document.body.append(first.element, second.element);
  first.element.dispatchEvent(new window.PointerEvent("pointerenter", { pointerType: "mouse" }));
  first.dispose();
  await window.happyDOM.whenAsyncComplete();
  assert.equal(document.querySelector('[role="tooltip"]'), null);
  assert.equal(document.getElementById("fallback-a-style"), null);
  assert.ok(document.getElementById("fallback-b-style"));
  assert.equal(second.element.textContent, "B");
});
