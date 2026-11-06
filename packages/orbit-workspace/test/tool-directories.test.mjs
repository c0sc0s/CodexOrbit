import assert from "node:assert/strict";
import test from "node:test";
import { declaredToolDirectories } from "../dist/service/tool-directories.js";

const wrapped = input => declaredToolDirectories({ type: "custom_tool_call", name: "exec", input });
test("direct and orchestrated shell calls expose only statically declared absolute workdirs", () => {
  assert.deepEqual(declaredToolDirectories({ type: "function_call", name: "functions.exec_command", arguments: JSON.stringify({ workdir: "/repo/feature", cmd: "PRIVATE COMMAND" }) }), { directories: ["/repo/feature"], tool: "exec_command" });
  assert.deepEqual(wrapped('const workdir = "/repo/feature"; const result = await tools.exec_command({cmd: "PRIVATE COMMAND", workdir}); text(result);'), { directories: ["/repo/feature"], tool: "exec_command" });
  assert.deepEqual(wrapped('const base="/repo"; await tools.exec_command({workdir: `${base}/one`}); await tools.exec_command({workdir: base+"/two"});'), { directories: ["/repo/one", "/repo/two"], tool: "exec_command" });
  assert.deepEqual(wrapped('await Promise.all([tools.exec_command({workdir:"/one"}), tools.exec_command({workdir:"/two"})]);'), { directories: ["/one", "/two"], tool: "exec_command" });
  assert.deepEqual(wrapped('const paths=["/repo", "/repo/workspaces/anchor-report-tools"]; const results=await Promise.allSettled(paths.map(async workdir => { return await tools.exec_command({workdir,cmd:"PRIVATE COMMAND"}); }));'), { directories: ["/repo", "/repo/workspaces/anchor-report-tools"], tool: "exec_command" });
  assert.deepEqual(wrapped('const paths=[undefined, "/repo/workspaces/anchor-report-tools"]; const results=await Promise.allSettled(paths.map(workdir => tools.exec_command({workdir,cmd:"PRIVATE COMMAND"})));'), { directories: ["/repo/workspaces/anchor-report-tools"], tool: "exec_command" });
});

test("dynamic values, lexical shadowing and overridden properties do not become guessed directories", () => {
  for (const input of [
    'let workdir="/repo"; await tools.exec_command({workdir});',
    'const workdir=load("cwd"); await tools.exec_command({workdir});',
    'await tools.exec_command({workdir:process.cwd()});',
    'await tools.exec_command({workdir:"/repo", ...options});',
    'await tools.exec_command({workdir:"/repo", [key]:"/other"});',
    'await tools.exec_command({workdir:"/repo", workdir: unknown});',
    'const workdir="/outer"; { await tools.exec_command({workdir}); let workdir="/inner"; }',
    'const workdir="/outer"; { const workdir=unknown; await tools.exec_command({workdir}); }',
    'await tools.exec_command({workdir:"relative"});',

  ]) assert.deepEqual(wrapped(input), { directories: [], tool: "exec_command", unresolved: true }, input);
  assert.equal(wrapped('async function later() { await tools.exec_command({workdir:"/not-invoked"}); }'), null);
  assert.equal(wrapped('await unrelated.exec_command({workdir:"/repo"});'), null);
  assert.deepEqual(wrapped('await tools.exec_command({cmd:"pwd"});'), { directories: [], tool: "exec_command" });
  assert.deepEqual(wrapped('await tools.exec_command({workdir:undefined,cmd:"pwd"});'), { directories: [], tool: "exec_command" });
  assert.deepEqual(wrapped('const workdir="/outer"; { const workdir="/inner"; await tools.exec_command({workdir}); } await tools.exec_command({workdir});'), { directories: ["/inner", "/outer"], tool: "exec_command" });
});

test("inspection is bounded and never executes code or extracts command text", () => {
  globalThis.orbitWorkspaceParserExecuted = false;
  assert.deepEqual(wrapped('globalThis.orbitWorkspaceParserExecuted = true; await tools.exec_command({workdir:"/repo",cmd:"PRIVATE COMMAND"});'), { directories: ["/repo"], tool: "exec_command" });
  assert.equal(globalThis.orbitWorkspaceParserExecuted, false); delete globalThis.orbitWorkspaceParserExecuted;
  assert.equal(wrapped("x".repeat(128 * 1024 + 1)), null);
  assert.equal(wrapped('await tools.exec_command({workdir:' + JSON.stringify("/" + "x".repeat(8192)) + '});').unresolved, true);
  assert.equal(wrapped("const = invalid"), null);
  assert.equal(wrapped([1, 2, 3, 4, 5].map(i => `await tools.exec_command({workdir:"/repo/${i}"});`).join("\n")).directories.length, 4);
});
