import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { Window } from "happy-dom";

const source = await readFile(new URL("../runtime/injected.js", import.meta.url), "utf8"), id = "12345678-1234-1234-1234-123456789abc", other = "aaaaaaaa-1234-1234-1234-123456789abc";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const ready = () => ({ status: "ready", snapshot: { sessionId: id, directory: "/work/tree/packages/app", displayDirectory: "/work/tree/packages/app", source: "turn", registeredDirectory: "/work/original", lastExecution: { cwd: "/work/tree/packages/app", turnId: "turn-1", recordedAt: "2026-11-05T08:00:00Z" }, appliedDirectory: null, pendingDirectory: null, disagreement: false, git: { status: "ready", root: "/work/tree", branch: "feat/workspace", commit: "a".repeat(40), worktree: true }, checkedAt: Date.now() } });
function setup(t, options = {}) {
  const window = new Window({ url: options.url ?? "app://-/index.html" }), document = window.document;
  document.body.innerHTML = `<div data-app-action-sidebar-thread-selected="true" data-app-action-sidebar-thread-id="${options.selected ?? `local:${id}`}"></div><main><header>Session title</header><div data-codex-composer-root data-composer-placement="thread"><div data-codex-composer contenteditable="true">Unsaved draft</div><div class="native-controls"><button data-composer-navigation-target="add-context" class="native-icon" type="button" aria-label="Add files and more"><svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg></button><button data-composer-navigation-target="permissions">Approve for me</button><button class="native-worktree">Native worktree</button></div></div></main>`;
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { x: 100, y: 500, left: 100, top: 500, width: 360, height: 28, right: 460, bottom: 528 }; };
  const scope = vm.createContext({ window, document, navigator: window.navigator, HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node, MutationObserver: window.MutationObserver, AbortController, setTimeout, clearTimeout, setInterval, clearInterval, URL });
  vm.runInContext(source, scope); const disposers = [], calls = [];
  scope.CodexPlugin.activate({ id: "better-work-tree", config: {}, signal: new AbortController().signal, onDispose: fn => disposers.push(fn), rpc: { async call(method, payload, request) { calls.push({ method, payload, request }); return options.read ? options.read(payload) : ready(); } } });
  const dispose = () => disposers.splice(0).reverse().forEach(fn => fn()); t.after(async () => { dispose(); await window.happyDOM.close(); });
  const trigger = () => document.getElementById("better-work-tree-trigger"), root = () => document.getElementById("better-work-tree-panel")?.shadowRoot;
  const pointer = (node, type) => node.dispatchEvent(new window.PointerEvent(type, { pointerType: "mouse" }));
  const open = async () => { pointer(trigger(), "pointerenter"); await sleep(220); };
  const refresh = async () => { window.dispatchEvent(new window.Event("focus")); await sleep(150); };
  return { window, document, calls, dispose, trigger, root, pointer, open, refresh };
}
test("an icon follows native composer controls and hover shows complete metadata without changing drafts", async t => {
  const f = setup(t); await sleep(20);
  assert.ok(f.trigger().classList.contains("native-icon")); assert.equal(f.trigger().textContent, ""); assert.equal(f.root(), undefined);
  const host = f.document.getElementById("better-work-tree-indicator");
  assert.equal(host.parentElement.className, "native-controls"); assert.equal(host.previousElementSibling.className, "native-worktree");
  assert.equal(f.document.querySelector("header").textContent, "Session title"); assert.equal(f.trigger().hasAttribute("data-composer-navigation-target"), false);
  await f.open(); const root = f.root();
  assert.equal(root.querySelector(".directory").textContent, "/work/tree/packages/app"); assert.equal(root.querySelector(".branch").textContent, "feat/workspace");
  assert.equal(root.querySelector(".mode").textContent, "Worktree"); assert.equal(root.querySelector(".panel").dataset.worktree, "true");
  assert.equal(f.trigger().getAttribute("aria-expanded"), "true"); assert.equal(f.document.getElementById("better-work-tree-panel").dataset.sessionId, id);
  let copied; f.window.navigator.clipboard.writeText = async value => { copied = value; };
  root.querySelector(".directory").click(); await sleep(10); assert.equal(copied, "/work/tree/packages/app");
  f.dispose(); assert.equal(f.root(), undefined); assert.equal(f.trigger(), null); assert.equal(f.document.querySelector("[contenteditable]").textContent, "Unsaved draft");
});
test("explicit tool workdir takes precedence and omitted workdir returns to the session default", async t => {
  let value = ready(); value.snapshot.git.branch = "master"; value.snapshot.git.worktree = false; value.snapshot.toolActivity = {
    recordedAt: "2026-11-05T08:22:53.505Z", tool: "exec_command", directories: [
      { directory: "/work/anchor-report-tools", git: { status: "ready", root: "/work/anchor-report-tools", branch: "feat/core-http-agent", commit: "a".repeat(40), worktree: true } }
    ]
  };
  const f = setup(t, { read: () => structuredClone(value) }); await f.open(); const root = f.root();
  assert.equal(root.querySelector(".directory").textContent, "/work/anchor-report-tools"); assert.equal(root.querySelector(".branch").textContent, "feat/core-http-agent");
  value.snapshot.toolActivity.directories = []; await f.refresh();
  assert.equal(root.querySelector(".directory").textContent, "/work/tree/packages/app"); assert.equal(root.querySelector(".branch").textContent, "master");
  assert.equal(root.querySelector(".mode").textContent, "主工作副本");
  value.snapshot.toolActivity.unresolved = true; await f.refresh();
  assert.equal(root.querySelector(".directory").textContent, "目录未知"); assert.equal(root.querySelector(".branch").textContent, "—");
});
test("keyboard access, hover travel, outside dismissal and disposal leave no orphan panel", async t => {
  const f = setup(t); await sleep(20); f.trigger().focus(); assert.ok(f.root());
  f.trigger().dispatchEvent(new f.window.KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
  assert.equal(f.root().activeElement, f.root().querySelector(".directory"));
  f.document.dispatchEvent(new f.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  assert.equal(f.root(), undefined); assert.equal(f.document.activeElement, f.trigger());
  f.trigger().blur(); await f.open(); f.pointer(f.trigger(), "pointerleave"); f.pointer(f.document.getElementById("better-work-tree-panel"), "pointerenter");
  await sleep(220); assert.ok(f.root()); f.pointer(f.document.getElementById("better-work-tree-panel"), "pointerleave"); await sleep(220); assert.equal(f.root(), undefined);
  f.trigger().click(); assert.ok(f.root()); f.document.body.dispatchEvent(new f.window.PointerEvent("pointerdown", { bubbles: true })); assert.equal(f.root(), undefined);
  f.pointer(f.trigger(), "pointerenter"); f.dispose(); await sleep(220); assert.equal(f.root(), undefined);
});
test("read failures clear stale assertions and unrelated conversation scroll preserves the panel", async t => {
  let value = ready(); const f = setup(t, { read: () => structuredClone(value) }); await f.open();
  const timeline = f.document.createElement("div"); f.document.body.append(timeline); timeline.dispatchEvent(new f.window.Event("scroll")); assert.ok(f.root());
  value = { status: "unavailable" }; await f.refresh();
  assert.equal(f.root().querySelector(".directory").textContent, "目录未知"); assert.equal(f.root().querySelector(".directory").disabled, true); assert.equal(f.root().querySelector(".branch").textContent, "—");
  f.window.dispatchEvent(new f.window.Event("resize")); assert.equal(f.root(), undefined);
});
test("switching sessions closes the panel, cancels old reads and rejects late results", async t => {
  let release; const f = setup(t, { read: payload => payload.sessionId === id ? new Promise(resolve => { release = resolve; }) : { status: "missing" } });
  await f.open(); assert.ok(f.root()); f.document.querySelector("[data-app-action-sidebar-thread-selected]").setAttribute("data-app-action-sidebar-thread-id", `local:${other}`);
  await sleep(140); assert.equal(f.calls[0].request.signal.aborted, true); assert.equal(f.root(), undefined); release(ready()); await f.open();
  assert.equal(f.root().querySelector(".directory").textContent, "目录未知"); assert.equal(f.document.getElementById("better-work-tree-panel").dataset.sessionId, other);
});
test("remote identities and ambiguous or incomplete composer controls receive no guessed icon", async t => {
  const remote = setup(t, { selected: `remote:host:${id}`, url: `app://-/chat/${id}` }); await sleep(20); assert.equal(remote.trigger(), null); assert.equal(remote.calls.length, 0);
  const f = setup(t); await sleep(20); const permissions = f.document.querySelector('[data-composer-navigation-target="permissions"]'); permissions.remove(); await sleep(140); assert.equal(f.trigger(), null);
  f.document.querySelector(".native-controls").append(permissions); await sleep(140); assert.ok(f.trigger());
  const composer = f.document.querySelector("[data-codex-composer-root]"), duplicate = composer.cloneNode(true); duplicate.querySelector("#better-work-tree-indicator")?.remove();
  f.document.querySelector("main").append(duplicate); await sleep(140); assert.equal(f.trigger(), null);
});

test("new local conversations retain the icon with pending metadata and never query a guessed session", async t => {
  const f = setup(t, { selected: `local:client-new-thread:${id}` }); await f.open();
  assert.equal(f.calls.length, 0); assert.equal(f.root().querySelector(".mode").textContent, "新会话");
  assert.equal(f.root().querySelector(".directory").textContent, "发送消息后显示工作目录"); assert.equal(f.root().querySelector(".directory").disabled, true);
  f.document.querySelector("[data-app-action-sidebar-thread-selected]").setAttribute("data-app-action-sidebar-thread-id", `local:${id}`);
  await sleep(140); assert.equal(f.root(), undefined); await f.open();
  assert.equal(f.root().querySelector(".branch").textContent, "feat/workspace"); assert.equal(f.calls[0].payload.sessionId, id);
});
