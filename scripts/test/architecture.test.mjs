import assert from "node:assert/strict";
import test from "node:test";
import { dependencies, assertAcyclic, assertLayerDependency, checkArchitecture } from "../check-architecture.mjs";

test("dependency scanner distinguishes type contracts from runtime imports", () => {
  assert.deepEqual(dependencies(`
    import type { Context } from './sdk.js';
    import { type Shape } from './shape.js';
    export { value } from './value.js';
    const worker = import('./worker.js');
    // import fs from 'node:fs';
  `, "test.ts"), [
    { specifier: "./sdk.js", typeOnly: true },
    { specifier: "./shape.js", typeOnly: true },
    { specifier: "./value.js", typeOnly: false },
    { specifier: "./worker.js", typeOnly: false },
  ]);
});

test("runtime cycles are rejected while a shared dependency is valid", () => {
  assert.throws(() => assertAcyclic(new Map([["a", ["b"]], ["b", ["a"]]])), /Runtime import cycle/);
  assert.doesNotThrow(() => assertAcyclic(new Map([["a", ["b", "c"]], ["b", ["c"]], ["c", []]])));
});

test("production modules obey the architecture boundaries", checkArchitecture);

test("execution environments and shared models cannot depend on composition layers", () => {
  for (const [workspace, source, target] of [
    ["orbit", "renderer/loader.ts", "host/plugin-host.ts"],
    ["orbit", "sdk/contracts.ts", "cdp/client.ts"],
    ["orbit", "service/module.ts", "host/plugin-host.ts"],
    ["orbit-tags", "shared/protocol.ts", "service/router.ts"],
    ["orbit-tags", "injected/entry.ts", "service/activate.ts"],
    ["orbit-tags", "service/router.ts", "host/cdp-client.ts"],
  ]) assert.throws(() => assertLayerDependency(workspace, source, target), /Forbidden layer dependency/);
  assert.doesNotThrow(() => assertLayerDependency("orbit-tags", "service/router.ts", "shared/protocol.ts"));
});
