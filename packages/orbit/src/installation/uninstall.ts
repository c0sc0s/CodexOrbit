import { readFile, readdir, rm, rmdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { exists, inside } from "./files.js";
import { daemonPaths } from "../host/daemon.js";
import type { PlatformConfig } from "./manager.js";

export interface UninstallOptions { purge?: boolean; dryRun?: boolean }

export async function planUninstall(root: string, launcherPath: string, port: number, config: PlatformConfig, purge: boolean) {
  if (config.apiVersion !== 1 || config.orbit?.schemaVersion !== 1 || !Array.isArray(config.plugins) || !config.orbit.packages)
    throw new Error("Not an Orbit-owned installation");
  if (!config.orbit.runtime.path.startsWith("runtime/")) throw new Error("Invalid runtime ownership");
  inside(root, config.orbit.runtime.path);
  if (config.plugins.some(plugin => !Object.hasOwn(config.orbit.packages, plugin.id)))
    throw new Error("Unmanaged modules must be removed explicitly before uninstalling Orbit");
  const remove: string[] = [];
  const preserved: string[] = [];
  const runtimeRoot = inside(root, "runtime");
  if (await exists(runtimeRoot)) {
    for (const name of await readdir(runtimeRoot)) {
      const path = inside(root, `runtime/${name}`);
      const manifest = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
      if (manifest.name !== "@c0sc0s/orbit") throw new Error(`Unowned runtime snapshot: ${path}`);
      remove.push(path);
    }
  }
  for (const [id, record] of Object.entries(config.orbit.packages)) {
    if (record.manifest.id !== id || !/^[a-z0-9][a-z0-9-]*$/u.test(id) || !record.path.startsWith(`plugins/${id}/`))
      throw new Error("Invalid plugin ownership");
    inside(root, record.path);
    remove.push(inside(root, `plugins/${id}`), inside(root, `marketplaces/${id}`));
    if (record.externalData || resolve(record.dataDirectory) !== join(root, "data", id)) preserved.push(record.dataDirectory);
  }
  for (const name of ["data", "module-data"]) {
    const data = inside(root, name);
    if (purge) remove.push(data);
    else if (await exists(data)) preserved.push(data);
  }
  if (await exists(launcherPath)) {
    const launcher = inside(resolve(launcherPath, ".."), "Orbit.app");
    const plist = await readFile(inside(launcher, "Contents/Info.plist"), "utf8");
    const script = await readFile(inside(launcher, "Contents/MacOS/codex-plugin-loader"), "utf8");
    const quotedConfig = `'${join(root, "loader.json").replaceAll("'", `'"'"'`)}'`;
    if (!/<key>CFBundleIdentifier<\/key>\s*<string>io.github.c0sc0s.orbit<\/string>/u.test(plist) || !script.includes(quotedConfig))
      throw new Error("Launcher belongs to another installation");
    remove.push(launcher);
  }
  remove.push(inside(root, "orbit.mjs"), inside(root, "launcher.log"), inside(root, daemonPaths(join(root, "loader.json"), port).root));
  return { root, purge, remove, preserved: [...new Set(preserved)] };
}

export async function removePlannedFiles(plan: Awaited<ReturnType<typeof planUninstall>>) {
  for (const path of plan.remove) {
    // Revalidate owned descendants immediately before deleting; never recurse on the installation root.
    if (path.startsWith(`${plan.root}/`)) inside(plan.root, path);
    await rm(path, { recursive: true, force: true });
  }
  for (const name of ["runtime", "plugins", "marketplaces"]) await removeEmptyDirectory(inside(plan.root, name));
}

export async function removeEmptyDirectory(path: string) {
  try { await rmdir(path); }
  catch (error) {
    if (!["ENOENT", "ENOTEMPTY", "EEXIST"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
  }
}
