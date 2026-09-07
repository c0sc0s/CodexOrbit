import { access, readFile, readdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, join, resolve } from "node:path";

const run = promisify(execFile);
for (const directory of ["runtime/src", "hooks", "scripts", "bin"]) {
  for (const file of await readdir(directory, { recursive: true })) {
    if (file.endsWith(".mjs")) await run(process.execPath, ["--check", join(directory, file)]);
  }
}

const documentation = ["README.md", "README.zh-CN.md", "CONTRIBUTING.md", "AGENTS.md", "CHANGELOG.md"];
for (const directory of ["docs", "assets"]) {
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
