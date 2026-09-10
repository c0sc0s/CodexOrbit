import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, join, relative } from "node:path";
import { inside } from "../installation/files.js";

export interface PluginManifest {
  schemaVersion: 1;
  id: string;
  legacyIds?: string[];
  version: string;
  runtimeVersion: string;
  orbit: { min: string; maxExclusive: string };
  renderer: string;
  service?: string;
  codex?: { name: string; marketplace: string };
}
const version = (value: string) => {
  if (!/^\d+\.\d+\.\d+$/u.test(value))
    throw new Error("Versions must be stable major.minor.patch values");
  return value.split(".").map(Number);
};
function compare(a: string, b: string) {
  const left = version(a),
    right = version(b);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}
export function assertCompatible(plugin: PluginManifest, runtime: string) {
  if (compare(runtime, plugin.orbit.min) < 0 || compare(runtime, plugin.orbit.maxExclusive) >= 0)
    throw new Error(
      `Plugin ${plugin.id} requires Orbit >=${plugin.orbit.min} <${plugin.orbit.maxExclusive}; installed ${runtime}`,
    );
}
export async function readPluginManifest(root: string): Promise<PluginManifest> {
  root = await realpath(root);
  const value = JSON.parse(
    await readFile(join(root, "orbit-plugin.json"), "utf8"),
  ) as PluginManifest;
  if (
    value.schemaVersion !== 1 ||
    typeof value.id !== "string" ||
    !/^[a-z][a-z0-9.-]{0,63}$/u.test(value.id)
  )
    throw new Error("Invalid Orbit plugin identity");
  version(value.version);
  if (value.legacyIds !== undefined && (!Array.isArray(value.legacyIds) ||
    value.legacyIds.some(id => typeof id !== "string" || !/^[a-z][a-z0-9.-]{0,63}$/u.test(id) || id === value.id) ||
    new Set(value.legacyIds).size !== value.legacyIds.length))
    throw new Error("Invalid legacy plugin identities");
  version(value.runtimeVersion);
  if (!value.orbit || compare(value.orbit.min, value.orbit.maxExclusive) >= 0)
    throw new Error("Invalid Orbit compatibility interval");
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (packageJson.version !== value.version) throw new Error("Plugin/package version mismatch");
  for (const file of [value.renderer, value.service].filter(
    (file): file is string => file !== undefined,
  )) {
    if (typeof file !== "string" || isAbsolute(file)) throw new Error("Invalid plugin entry");
    const actual = await realpath(inside(root, file));
    inside(root, relative(root, actual));
  }
  if (!value.renderer) throw new Error("Renderer entry is required");
  if (
    value.codex &&
    [value.codex.name, value.codex.marketplace].some(
      (name) => typeof name !== "string" || !/^[a-z][a-z0-9-]{0,63}$/u.test(name),
    )
  )
    throw new Error("Invalid official Codex extension identity");
  return value;
}
