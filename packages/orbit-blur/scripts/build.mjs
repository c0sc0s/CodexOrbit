import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outputDirectory = join(projectRoot, "runtime", "dist");
const testOutputDirectory = join(projectRoot, "dist");
await mkdir(outputDirectory, { recursive: true });
await mkdir(testOutputDirectory, { recursive: true });

await build({
  entryPoints: [join(projectRoot, "src", "entry.ts")],
  outfile: join(outputDirectory, "injected.js"),
  bundle: true,
  format: "iife",
  globalName: "CodexPlugin",
  platform: "browser",
  target: "chrome120",
  minify: false,
  sourcemap: false,
  legalComments: "none",
});

// ESM helpers for Node tests (gitignored under packages/*/dist/).
await build({
  entryPoints: [join(projectRoot, "src", "styles.ts")],
  outfile: join(testOutputDirectory, "styles.mjs"),
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  minify: false,
  sourcemap: false,
  legalComments: "none",
});
