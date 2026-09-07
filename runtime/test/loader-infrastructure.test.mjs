import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CdpClient } from "../src/plugin-loader/cdp-client.mjs";
import { createResourceScope } from "../src/plugin-loader/lifecycle.mjs";
import { acquireOwner, daemonPaths, readOwner, releaseOwner } from "../src/plugin-loader/daemon.mjs";
import { createLauncher } from "../src/plugin-loader/launcher.mjs";
import { readManifest } from "../src/plugin-loader/manifest.mjs";

class Socket extends EventTarget {
  readyState = 1;
  sent = [];
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { this.readyState = 3; this.dispatchEvent(new Event("close")); }
  message(data) { this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(data) })); }
}

test("CDP handles synchronous binding failures without uncaught errors and drains commands on close", async () => {
  const socket = new Socket(); const client = new CdpClient({ id: "a" }, socket);
  client.bindingHandlers.set("__example", () => { throw new Error("handler failure"); });
  socket.message({ method: "Runtime.bindingCalled", params: { name: "__example" } });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const pending = client.command("Runtime.evaluate");
  client.close(); await assert.rejects(pending, /closed/);
  assert.equal(client.pendingCommands.size, 0);
});

test("CDP cleans pending state when send throws and rejects a socket closed during connection", async () => {
  const socket = new Socket(); const client = new CdpClient({ id: "a" }, socket);
  socket.send = () => { throw new Error("send failure"); };
  await assert.rejects(client.command("test"), /send failure/);
  assert.equal(client.pendingCommands.size, 0);
  const connecting = new Socket(); connecting.readyState = 0;
  const connection = CdpClient.connect({ id: "a", webSocketDebuggerUrl: "ws://127.0.0.1" }, { createSocket: () => connecting });
  connecting.close(); await assert.rejects(connection, /closed before opening/);
});

test("resource deadlines bound stalled cleanup, run remaining disposers and clean late resources", async () => {
  const scope = createResourceScope(15); const events = [];
  scope.onDispose(() => events.push("remaining"));
  scope.onDispose(() => new Promise(() => {}));
  await assert.rejects(scope.close(), /cleanup failed/);
  scope.onDispose(() => events.push("late"));
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(events, ["remaining", "late"]);
  assert.equal(scope.signal.aborted, true);
});

test("daemon ownership rejects concurrent starts and token mismatches cannot release another owner", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "loader-owner-")); t.after(() => rm(root, { recursive: true, force: true }));
  const paths = daemonPaths(join(root, "loader.json"), 9341);
  const results = await Promise.allSettled([acquireOwner(paths), acquireOwner(paths)]);
  assert.equal(results.filter((item) => item.status === "fulfilled").length, 1);
  const token = results.find((item) => item.status === "fulfilled").value;
  await releaseOwner(paths, "wrong-token"); assert.equal((await readOwner(paths)).token, token);
  await releaseOwner(paths, token); assert.equal(await readOwner(paths), null);
});

test("standalone launcher invokes Loader with shell-safe paths and no product entry", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "loader-launcher-")); t.after(() => rm(root, { recursive: true, force: true }));
  const launcherPath = join(root, "Loader.app");
  const options = { launcherPath, nodePath: "/a path/node", cliPath: "/a path/cli.mjs", configPath: "/configs/a'b.json", logPath: join(root, "log") };
  await createLauncher(options); await createLauncher(options);
  const source = await readFile(join(launcherPath, "Contents/MacOS/codex-plugin-loader"), "utf8");
  assert.match(source, /'\/a path\/cli\.mjs' 'start' '--config' '\/configs\/a'"'"'b\.json'/);
  assert.doesNotMatch(source, /app\.mjs|tags|controller/);
  await assert.rejects(createLauncher({ ...options, bundleId: "unrelated" }), /owns/);
});

test("diagnostics can read module IDs when their executable files are missing", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "loader-manifest-")); t.after(() => rm(root, { recursive: true, force: true }));
  const path = join(root, "loader.json");
  await writeFile(path, JSON.stringify({ apiVersion: 1, plugins: [{ id: "missing", entry: "absent.js", version: "1" }] }));
  assert.equal((await readManifest(path)).plugins[0].id, "missing");
});

test("CDP confines evaluation and bindings to the main frame world and recreates it after destruction", async () => {
  const socket = new Socket(); const client = new CdpClient({ id: "a" }, socket);
  let contextId = 17;
  socket.send = (encoded) => {
    const message = JSON.parse(encoded); socket.sent.push(message);
    const result = message.method === "Page.getFrameTree" ? { frameTree: { frame: { id: "main" } } }
      : message.method === "Page.createIsolatedWorld" ? { executionContextId: contextId }
        : message.method === "Runtime.evaluate" ? { result: { value: true } } : {};
    queueMicrotask(() => socket.message({ id: message.id, result }));
  };
  await Promise.all([client.useIsolatedWorld(), client.useIsolatedWorld()]);
  await client.addBinding("__test", () => {});
  await client.evaluate("true");
  assert.deepEqual(socket.sent.find(item => item.method === "Page.createIsolatedWorld").params, {
    frameId: "main", worldName: "codex-plugin-loader", grantUniveralAccess: false,
  });
  assert.equal(socket.sent.filter(item => item.method === "Page.createIsolatedWorld").length, 1);
  assert.equal(socket.sent.find(item => item.method === "Runtime.addBinding").params.executionContextName, "codex-plugin-loader");
  assert.equal(socket.sent.find(item => item.method === "Runtime.evaluate").params.contextId, 17);
  socket.message({ method: "Runtime.executionContextDestroyed", params: { executionContextId: 17 } });
  contextId = 19;
  await client.useIsolatedWorld(); await client.evaluate("true");
  assert.equal(client.generation, 1);
  assert.equal(socket.sent.at(-1).params.contextId, 19);
  client.close();
});
