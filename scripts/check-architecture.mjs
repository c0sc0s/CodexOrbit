import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { builtinModules } from "node:module";
import { parse } from "@babel/parser";

const repository = fileURLToPath(new URL("../", import.meta.url));
const rules = {
  orbit: {
    installation: ["sdk", "host", "platform", "plugins"], plugins: ["installation", "platform"],
    config: ["sdk", "protocol", "cdp"], sdk: [], protocol: ["sdk"], lifecycle: ["sdk"],
    renderer: ["sdk", "protocol", "lifecycle"], platform: ["sdk", "protocol"],
    cdp: ["sdk", "protocol", "renderer", "lifecycle"],
    service: ["sdk", "protocol", "lifecycle", "cdp", "config"],
    host: ["sdk", "protocol", "lifecycle", "cdp", "service", "config"],
    cli: ["sdk", "protocol", "platform", "host", "cdp", "config", "installation"],
  },
  "orbit-tags": {
    shared: [], injected: ["shared"], service: ["shared"], host: ["shared"],
  },
};

export function dependencies(source, filename) {
  const result = [];
  const file = parse(source, { sourceType: "module", sourceFilename: filename, plugins: ["typescript", ...(filename.endsWith(".tsx") ? ["jsx"] : [])] });
  function visit(node) {
    if (["ImportDeclaration", "ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type) && node.source) {
      const typeOnly = node.importKind === "type" || node.exportKind === "type" || (node.specifiers?.length > 0 && node.specifiers.every(item => item.importKind === "type" || item.exportKind === "type"));
      result.push({ specifier: node.source.value, typeOnly: Boolean(typeOnly) });
    }
    if (node.type === "CallExpression" && (node.callee.type === "Import" || node.callee.name === "require") && node.arguments[0]?.type === "StringLiteral") {
      result.push({ specifier: node.arguments[0].value, typeOnly: false });
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(item => { if (item?.type) visit(item); });
      else if (value && typeof value === "object" && value.type) visit(value);
    }
  }
  visit(file);
  return result;
}

export function assertAcyclic(graph) {
  const done = new Set(), active = [];
  function visit(file) {
    if (active.includes(file)) throw new Error(`Runtime import cycle: ${[...active, file].join(" → ")}`);
    if (done.has(file)) return;
    active.push(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency);
    active.pop(); done.add(file);
  }
  for (const file of graph.keys()) visit(file);
}

export function assertLayerDependency(workspace, file, target) {
  const layers = rules[workspace];
  const layer = file.split("/")[0], targetLayer = target.split("/")[0];
  if (layers[layer] && targetLayer !== layer && !layers[layer].includes(targetLayer)) throw new Error(`Forbidden layer dependency ${workspace}: ${file} → ${target}`);
}

export async function checkArchitecture() {
  for (const [workspace, layers] of Object.entries(rules)) {
    const root = resolve(repository, "packages", workspace, workspace === "orbit" ? "src" : "runtime/src");
    const files = (await readdir(root, { recursive: true })).filter(file => /\.(ts|tsx)$/.test(file));
    const sourceFiles = new Set(files);
    const graph = new Map();
    for (const file of files) {
      const layer = file.split("/")[0];
      const entries = workspace === "orbit" ? ["index.ts", "cli.ts"] : ["controller.ts"];
      if (!layers[layer] && !entries.includes(file)) throw new Error(`Module has no architectural owner: ${workspace}/${file}`);
      const browserSafe = ["sdk", "protocol", "lifecycle", "renderer", "shared", "injected"].includes(layer);
      const edges = [];
      for (const { specifier, typeOnly } of dependencies(await readFile(resolve(root, file), "utf8"), file)) {
        if (browserSafe && (specifier.startsWith("node:") || builtinModules.includes(specifier) || specifier === "better-sqlite3")) throw new Error(`Node dependency in browser-safe module ${workspace}/${file}: ${specifier}`);
        if (workspace === "orbit-tags" && ["service", "injected"].includes(layer) && specifier.startsWith("@c0sc0s/orbit") && (!typeOnly || specifier !== "@c0sc0s/orbit/sdk")) throw new Error(`Tags business modules must use the SDK contract: ${file}`);
        if (!specifier.startsWith(".")) continue;
        const base = relative(root, resolve(root, dirname(file), specifier));
        const target = [base, `${base}.ts`, `${base}.tsx`, base.replace(/\.js$/, ".ts"), base.replace(/\.js$/, ".tsx")].find(candidate => sourceFiles.has(candidate));
        if (!target) throw new Error(`Unresolved source dependency ${workspace}/${file}: ${specifier}`);
        assertLayerDependency(workspace, file, target);
        if (!typeOnly) edges.push(target);
      }
      graph.set(file, edges);
    }
    assertAcyclic(graph);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await checkArchitecture();
