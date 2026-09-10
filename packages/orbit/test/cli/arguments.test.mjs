import assert from "node:assert/strict";
import test from "node:test";
import { parseArguments } from "../../dist/cli/arguments.js";

test("CLI parses commands without starting processes", () => {
  assert.equal(parseArguments([]).command, "--help");
  assert.deepEqual(parseArguments(["start", "--config", "loader.json", "--attach"]).options, { "--config": "loader.json", "--attach": "true" });
});

test("CLI rejects malformed and command-incompatible options", () => {
  for (const args of [
    ["unknown"], ["start"], ["start", "--config"],
    ["start", "--config", "a", "--config", "b"],
    ["status", "--config", "a", "--attach"],
    ["start", "--config", "a", "--token", "token"],
    ["start", "--config", "a", "--plugin", "tags"],
    ...["0", "65536", "1.5", "NaN"].map(port => ["start", "--config", "a", "--port", port]),
  ]) assert.throws(() => parseArguments(args));
});
