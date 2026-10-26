import { build } from "esbuild";

await build({ entryPoints: ["src/injected/entry.ts"], outfile: "runtime/injected.js", bundle: true,
  format: "iife", globalName: "CodexPlugin", platform: "browser", target: "chrome120", legalComments: "none" });
