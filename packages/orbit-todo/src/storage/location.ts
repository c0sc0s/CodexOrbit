import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export async function dataDirectory(override?: string): Promise<string> {
  if (override || process.env.ORBIT_TODO_DATA_DIR) return resolve(override ?? process.env.ORBIT_TODO_DATA_DIR!);
  try {
    const installation = JSON.parse(await readFile(new URL("../../orbit-installation.json", import.meta.url), "utf8"));
    if (typeof installation.dataDirectory !== "string") throw new Error("Invalid Todo installation metadata");
    return installation.dataDirectory;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  return join(process.env.ORBIT_HOME ?? join(homedir(), "Library/Application Support/Orbit"), "data/orbit-todo");
}
