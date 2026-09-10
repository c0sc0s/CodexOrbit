import { readFile } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
process.env.ORBIT_HOME = root;
const portIndex = process.argv.indexOf("--port");
if (portIndex >= 0) process.env.ORBIT_CDP_PORT = process.argv[portIndex + 1];
const config = JSON.parse(await readFile(resolve(root, "loader.json"), "utf8"));
const cli = resolve(root, config.orbit.runtime.path, "dist/cli.js");
if (relative(root, cli).startsWith("..")) throw new Error("Invalid active runtime path");
await import(pathToFileURL(cli).href);
