#!/usr/bin/env node
import { realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { main } from "../dist/hooks/session-naming.js";
export * from "../dist/hooks/session-naming.js";
if (process.argv[1] && pathToFileURL(await realpath(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    process.stderr.write(`Orbit Tags hook failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
