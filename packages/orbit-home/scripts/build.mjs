import { build } from "esbuild";
import { readFile } from "node:fs/promises";

const fontData = async name => JSON.stringify(`data:font/woff2;base64,${(await readFile(new URL(`../fonts/${name}`, import.meta.url))).toString("base64")}`);

await build({ entryPoints: ["src/injected/entry.ts"], outfile: "runtime/injected.js", bundle: true,
  format: "iife", globalName: "CodexPlugin", platform: "browser", target: "chrome120", legalComments: "none",
  define: {
    __ORBIT_HOME_DOTO_FONT__: await fontData("doto-latin-full-normal.woff2"),
    __ORBIT_HOME_CJK_FONT__: await fontData("chill-bitmap-8px-round.woff2"),
  } });
