import { access, readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

process.chdir(dirname(dirname(fileURLToPath(import.meta.url))));

const run = promisify(execFile);
for (const directory of ["packages/orbit/src", "packages/orbit-tags/runtime/src", "packages/orbit-tags/hooks", "scripts", "packages/orbit-tags/scripts", "packages/orbit-tags/bin", "packages/orbit-blur/scripts"]) {
  for (const file of await readdir(directory, { recursive: true })) {
    if (file.endsWith(".mjs")) await run(process.execPath, ["--check", join(directory, file)]);
  }
}

for (const workspace of ["orbit", "orbit-tags", "orbit-blur"]) {
  const root = resolve("packages", workspace);
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (workspace === "orbit" && Object.keys(manifest.dependencies ?? {}).some(name => !["figlet", "ora", "picocolors"].includes(name))) {
    throw new Error("Orbit must remain independent of business and storage dependencies");
  }
  for (const file of await readdir(root, { recursive: true })) {
    if (file.split(/[\\/]/u).includes("node_modules") || !/\.(?:mjs|ts|tsx)$/u.test(file) || file.includes("test/") || file.includes("dist/")) continue;
    const source = await readFile(join(root, file), "utf8");
    for (const match of source.matchAll(/(?:from\s*|import\s*\(\s*)["']([^"']+)["']/gu)) {
      const specifier = match[1];
      if (workspace === "orbit" && ["figlet", "ora", "picocolors"].includes(specifier.split("/")[0]) && !file.startsWith("src/cli/")) {
        throw new Error(`Terminal dependencies belong in Orbit's CLI layer: ${file}`);
      }
      if (specifier.startsWith(".") && !resolve(dirname(join(root, file)), specifier).startsWith(`${root}/`)) {
        throw new Error(`Cross-workspace source import in ${workspace}/${file}: ${specifier}`);
      }
      if (workspace === "orbit" && specifier.startsWith("@c0sc0s/orbit-tags")) throw new Error("Orbit must not import Tags");
      if (workspace === "orbit" && specifier.startsWith("@c0sc0s/orbit-blur")) throw new Error("Orbit must not import business plugins");
      if (workspace === "orbit-blur" && specifier.startsWith("@c0sc0s/orbit") && specifier !== "@c0sc0s/orbit/sdk") {
        throw new Error(`Blur plugin must use the SDK contract: ${file}`);
      }
      if (workspace === "orbit-blur" && specifier === "@c0sc0s/orbit/sdk") {
        const typeOnly = /import\s+type\s+[^;]*from\s+["']@c0sc0s\/orbit\/sdk["']/u.test(source)
          && !/import\s+(?!type\b)[^;]*from\s+["']@c0sc0s\/orbit\/sdk["']/u.test(source);
        if (!typeOnly) throw new Error(`Blur plugin must import @c0sc0s/orbit/sdk as types only: ${file}`);
      }
    }
  }
}

const documentation = ["README.md", "README.zh-CN.md", "CONTRIBUTING.md", "AGENTS.md", "CHANGELOG.md", "packages/orbit/README.md", "packages/orbit-tags/README.md", "packages/orbit-tags/README.zh-CN.md", "packages/orbit-tags/CHANGELOG.md", "packages/orbit-blur/README.md"];
for (const directory of ["docs", "packages/orbit/assets", "packages/orbit-tags/assets", "packages/orbit-tags/skills"]) {
  for (const file of await readdir(directory, { recursive: true })) {
    if (file.endsWith(".md")) documentation.push(join(directory, file));
  }
}
for (const file of documentation) {
  const content = await readFile(file, "utf8");
  const targets = [
    ...Array.from(content.matchAll(/\]\(([^\s)]+)\)/gu), (match) => match[1]),
    ...Array.from(content.matchAll(/(?:href|src)="([^"]+)"/gu), (match) => match[1]),
  ];
  for (const target of targets) {
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/iu.test(target)) continue;
    const path = decodeURIComponent(target.split("#")[0]);
    try { await access(resolve(dirname(file), path)); }
    catch { throw new Error(`Broken documentation link in ${file}: ${target}`); }
  }
}
