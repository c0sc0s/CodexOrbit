import { rm, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const workspace = await realpath(process.cwd());
const allowed = ["orbit", "orbit-tags"].map(name => resolve(root, "packages", name));
if (!allowed.includes(workspace)) throw new Error("Build cleanup requires an Orbit workspace");
await rm(resolve(workspace, "dist"), { recursive: true, force: true });
