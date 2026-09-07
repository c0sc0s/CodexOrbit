import { readFile, realpath, open, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { buildPluginExpression } from "./expressions.mjs";

/** Reads identities without touching executable entries, so status/removal survives a missing bundle. */
export async function readManifest(configPath) {
  const path = await realpath(configPath);
  const manifest = JSON.parse(await readFile(path, "utf8"));
  if (manifest?.apiVersion !== 1 || !Array.isArray(manifest.plugins)) throw new Error("Expected loader config apiVersion 1 and plugins array");
  const ids = new Set();
  for (const plugin of manifest.plugins) {
    if (!plugin || typeof plugin.id !== "string" || !/^[a-z][a-z0-9.-]{0,63}$/.test(plugin.id) || ids.has(plugin.id)) throw new Error("Invalid or duplicate plugin ID");
    const entry = plugin.entry;
    if (typeof entry !== "string" || !entry || isAbsolute(entry) || plugin.host !== undefined) throw new Error("Specify a local renderer entry");
    if ((typeof plugin.version !== "string" || !plugin.version)) throw new Error("Renderer version is required");
    if (plugin.service !== undefined && (typeof plugin.service !== "string" || !plugin.service || isAbsolute(plugin.service))) throw new Error("Invalid local service entry");
    if (plugin.config !== undefined && (!plugin.config || typeof plugin.config !== "object" || Array.isArray(plugin.config))) throw new Error("config must be an object");
    if (plugin.apiVersion !== undefined && plugin.apiVersion !== 1) throw new Error("Unsupported plugin apiVersion");
    if (plugin.enabled !== undefined && typeof plugin.enabled !== "boolean") throw new Error("enabled must be a boolean");
    ids.add(plugin.id);
  }
  return { path, root: dirname(path), plugins: manifest.plugins };
}

export async function resolvePluginEntry(root, entry) {
  const path = await realpath(resolve(root, entry));
  const local = relative(root, path);
  if (local === ".." || local.startsWith("../") || isAbsolute(local)) throw new Error("Plugin entry must stay inside the config directory");
  return path;
}

export async function readPlugins(configPath, owner = null) {
  const manifest = await readManifest(configPath);
  return Promise.all(manifest.plugins.filter((plugin) => plugin.enabled !== false).map(async (plugin) => {
    if (plugin.service) throw new Error("Service modules require start/watch; apply only supports renderer bundles");
    const source = await readFile(await resolvePluginEntry(manifest.root, plugin.entry), "utf8");
    return { id: plugin.id, version: plugin.version, expression: buildPluginExpression({ ...plugin, source, owner }) };
  }));
}

/** Changes only the selected module, serializing writers and preserving other configuration. */
export async function setPluginEnabled(configPath, id, enabled) {
  const path = await realpath(configPath);
  const lockPath = `${path}.lock`;
  const lock = await open(lockPath, "wx", 0o600);
  const next = `${path}.next-${process.pid}`;
  try {
    await readManifest(path);
    const config = JSON.parse(await readFile(path, "utf8"));
    const plugin = config.plugins.find((entry) => entry.id === id);
    if (!plugin) throw new Error(`Unknown module ${id}`);
    plugin.enabled = enabled;
    await writeFile(next, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
    await rename(next, path);
  } finally { await lock.close(); await rm(lockPath, { force: true }); await rm(next, { force: true }); }
}
