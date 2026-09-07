import assert from "node:assert/strict";
import test from "node:test";

import { CodexProcess } from "../src/codex-process.mjs";

test("detects only the configured Codex executable", async () => {
  const process = new CodexProcess({
    appPath: "/Applications/Test Codex.app",
    run: async () => ({ stdout: "/bin/other\n/Applications/Test Codex.app/Contents/MacOS/ChatGPT --flag\n" }),
  });
  assert.equal(await process.isRunning(), true);
});

test("verifies CDP ownership through the listener process ancestry", async () => {
  const process = new CodexProcess({
    appPath: "/Applications/Test Codex.app",
    run: async (command, args) => {
      if (command.endsWith("lsof")) return { stdout: "42\n" };
      if (args.includes("command=")) return { stdout: "/Applications/Test Codex.app/Contents/MacOS/ChatGPT --type=renderer\n" };
      if (args.includes("ppid=")) return { stdout: "1\n" };
      throw new Error("unexpected command");
    },
  });
  assert.equal(await process.ownsCdpEndpoint(), true);
});
