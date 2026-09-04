import { build } from "esbuild";
import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(projectRoot, "runtime", "dist");
await mkdir(outputDirectory, { recursive: true });
await rm(join(outputDirectory, "injected.js.map"), { force: true });

await build({
  entryPoints: [join(projectRoot, "runtime", "src", "injected", "entry.ts")],
  outfile: join(outputDirectory, "injected.js"),
  bundle: true,
  format: "iife",
  globalName: "CodexTagsInjected",
  platform: "browser",
  target: "chrome120",
  minify: false,
  sourcemap: false,
  legalComments: "none",
});
