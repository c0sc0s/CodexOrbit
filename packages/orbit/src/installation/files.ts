import {
  cp,
  lstat,
  mkdir,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { lstatSync } from "node:fs";

export async function exists(path: string) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
export function inside(root: string, path: string) {
  const result = resolve(root, path),
    local = relative(root, result);
  if (!local || local.startsWith("..") || isAbsolute(local))
    throw new Error("Path must stay within its owned directory");
  for (let current = result; ; current = dirname(current)) {
    try {
      if (lstatSync(current).isSymbolicLink())
        throw new Error("Owned package paths must not traverse symlinks");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (current === resolve(root)) break;
  }
  return result;
}
export async function atomicJson(path: string, value: unknown) {
  const next = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(next, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
    await rename(next, path);
  } finally {
    await rm(next, { force: true });
  }
}
export async function snapshotPackage(
  source: string,
  destination: string,
  ancestry = new Set<string>(),
  installedDependency = false,
) {
  source = await realpath(source);
  if (ancestry.has(source)) throw new Error("Circular package dependency cannot be snapshotted");
  const manifest = JSON.parse(await readFile(join(source, "package.json"), "utf8"));
  const declared: unknown = manifest.files;
  const concrete =
    Array.isArray(declared) &&
    declared.length > 0 &&
    declared.every((file) => typeof file === "string" && !/[*?]/u.test(file));
  if (!concrete && !installedDependency)
    throw new Error("Local packages need an explicit files allowlist without globs");
  const contents = await readdir(source);
  const files: string[] = concrete
    ? (declared as string[])
    : contents.filter((file) => !["node_modules", ".git"].includes(file));
  await mkdir(destination, { recursive: true, mode: 0o700 });
  const legalFiles = contents.filter((file) => /^licen[cs]e(?:\..*)?$/iu.test(file));
  for (const file of new Set(["package.json", "README.md", ...legalFiles, ...files])) {
    const entry = inside(source, file);
    if (!(await exists(entry))) continue;
    await cp(entry, inside(destination, file), {
      recursive: true,
      filter: (path) => {
        const local = relative(source, path);
        if (local.split(/[\\/]/u).some((part) => ["node_modules", ".git"].includes(part)))
          return false;
        if (lstatSync(path).isSymbolicLink())
          throw new Error("Package snapshots cannot contain symlinks");
        return true;
      },
    });
  }
  const resolver = createRequire(join(source, "package.json"));
  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    let dependencyRoot: string;
    try {
      dependencyRoot = dirname(resolver.resolve(`${dependency}/package.json`));
    } catch {
      dependencyRoot = dirname(resolver.resolve(dependency));
      while (true) {
        if (await exists(join(dependencyRoot, "package.json"))) {
          const candidate = JSON.parse(
            await readFile(join(dependencyRoot, "package.json"), "utf8"),
          );
          if (candidate.name === dependency) break;
        }
        const parent = dirname(dependencyRoot);
        if (parent === dependencyRoot) throw new Error(`Missing dependency ${dependency}`);
        dependencyRoot = parent;
      }
    }
    await snapshotPackage(
      dependencyRoot,
      inside(destination, `node_modules/${dependency}`),
      new Set([...ancestry, source]),
      true,
    );
  }
}
