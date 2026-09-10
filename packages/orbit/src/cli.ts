#!/usr/bin/env node
import { runCli } from "./cli/run.js";
import { runPlatformCli } from "./cli/platform.js";

process.umask(0o077);
Promise.resolve().then(async () => {
  const args = process.argv.slice(2);
  if (!(await runPlatformCli(args))) await runCli(args);
}).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Orbit command failed";
  if (process.argv.includes("--json") && !process.argv.includes("--config")) {
    console.error(JSON.stringify({ error: message }));
  } else {
    console.error(`Orbit: ${message}`);
  }
  process.exitCode = 1;
});
