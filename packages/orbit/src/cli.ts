#!/usr/bin/env node
import { runCli } from "./cli/run.js";
import { runPlatformCli } from "./cli/platform.js";

process.umask(0o077);
Promise.resolve().then(async () => {
  const args = process.argv.slice(2);
  if (!(await runPlatformCli(args))) await runCli(args);
}).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Orbit command failed");
  process.exitCode = 1;
});
