import assert from "node:assert/strict";
import test from "node:test";
import { createPresentation } from "../../dist/cli/presentation.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Writable } from "node:stream";

function terminal(isTTY = true, columns = 80) {
  let text = "";
  return Object.assign(new Writable({ write(chunk, _encoding, callback) { text += chunk.toString(); callback(); } }), {
    isTTY, columns, read: () => text,
    cursorTo() {}, moveCursor() {}, clearLine() { text += "<clear>"; },
  });
}

test("pipes preserve JSON without banners or progress", () => {
  const out = terminal(false), err = terminal(false);
  const ui = createPresentation([], out, err, {});
  ui.begin("Install"); ui.result("install", { status: "installed" });
  assert.deepEqual(JSON.parse(out.read()), { status: "installed" });
  assert.equal(err.read(), "");
});

test("explicit JSON works on a terminal", () => {
  const out = terminal(), err = terminal();
  const ui = createPresentation(["--json"], out, err, {});
  ui.begin("Check"); ui.result("doctor", { ok: false });
  assert.deepEqual(JSON.parse(out.read()), { ok: false });
  assert.equal(err.read(), "");
});

test("plain mode has onboarding guidance without escape sequences", () => {
  const out = terminal(false), err = terminal();
  const ui = createPresentation(["--plain"], out, err, {});
  ui.begin("Install"); ui.result("install", { status: "installed" });
  assert.match(out.read(), /██████/);
  assert.match(out.read(), /Plugins are optional/);
  assert.match(out.read(), /orbit plugin install <package>/);
  assert.doesNotMatch(out.read() + err.read(), /\x1b/);
});

test("animated progress is cleared and its timer is stopped", async () => {
  const out = terminal(), err = terminal();
  const ui = createPresentation([], out, err, {});
  ui.begin("Install");
  await new Promise(resolve => setTimeout(resolve, 120));
  ui.stop();
  const stopped = err.read();
  await new Promise(resolve => setTimeout(resolve, 120));
  assert.equal(err.read(), stopped);
  assert.ok(stopped.endsWith("<clear>"));
  assert.match(stopped, /Install/);
});

test("NO_COLOR, dumb terminals and plain output suppress animation", () => {
  for (const env of [{ NO_COLOR: "" }, { TERM: "dumb" }]) {
    const out = terminal(), err = terminal();
    const ui = createPresentation([], out, err, env);
    ui.begin("Check"); ui.result("doctor", { ok: false, checks: [{ id: "runtime", ok: false }] });
    assert.doesNotMatch(out.read() + err.read(), /\x1b/);
    assert.match(out.read(), /Needs attention/);
    assert.match(out.read(), /\[!!\] runtime/);
  }
});

test("narrow terminals use compact branding and plugin text cannot inject controls", () => {
  const out = terminal(true, 30), err = terminal(false);
  const ui = createPresentation(["--plain"], out, err, {});
  ui.begin("List"); ui.result("plugin list", [{ id: "bad\x1b[2Jname", enabled: false, version: "1.0" }]);
  assert.match(out.read(), /ORBIT/);
  assert.doesNotMatch(out.read(), /\( O \)/);
  assert.match(out.read(), /\[off\]/);
  assert.doesNotMatch(out.read(), /\x1b/);
});

test("help uses distinct text styles and respects normal and narrow terminal widths", () => {
  for (const columns of [60, 80]) {
    const out = terminal(true, columns);
    createPresentation([], out, terminal(false), {}).help();
    const text = out.read();
    for (const code of ["\x1b[1m", "\x1b[2m", "\x1b[36m", "\x1b[34m"]) assert.ok(text.includes(code));
    const plain = text.replace(/\x1b\[[0-9;]*m/g, "");
    assert.ok(plain.split("\n").every(row => row.length < columns));
    assert.match(plain, /GET STARTED/);
    assert.match(plain, /plugin disable <id>/);
  }
});

test("explicit JSON help has no decoration", () => {
  const out = terminal();
  createPresentation(["--json"], out, terminal(), {}).help();
  assert.equal(JSON.parse(out.read()).name, "Orbit");
});

test("uninstall reports retained paths and incompatible output flags are rejected", () => {
  const out = terminal(false);
  const ui = createPresentation(["--plain"], out, terminal(false), {});
  ui.begin("Remove"); ui.result("uninstall", { preserved: ["/external/data"], remaining: ["/root/notes"] });
  assert.match(out.read(), /Preserved \(not deleted\)/);
  assert.match(out.read(), /\/external\/data/);
  assert.match(out.read(), /Remaining files/);
  assert.throws(() => createPresentation(["--plain", "--json"]), /Choose/);
});

test("CLI entry keeps JSON parseable and errors nonzero in an isolated environment", async t => {
  const root = await mkdtemp(join(tmpdir(), "orbit-output-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL("../../dist/cli.js", import.meta.url));
  const run = args => promisify(execFile)(process.execPath, [cli, ...args], { env: { ...process.env, ORBIT_HOME: join(root, "platform") } });
  for (const args of [["status"], ["status", "--json"]]) {
    const result = await run(args);
    assert.equal(JSON.parse(result.stdout).installed, false);
    assert.equal(result.stderr, "");
  }
  const plain = await run(["status", "--plain"]);
  assert.match(plain.stdout, /Not installed/);
  await assert.rejects(run(["uninstall", "--json"]), error => {
    assert.equal(error.code, 1);
    assert.equal(error.stdout, "");
    assert.match(JSON.parse(error.stderr).error, /confirm removal/);
    return true;
  });
});
