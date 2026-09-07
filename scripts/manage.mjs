#!/usr/bin/env node
import { basename } from "node:path";

import { createManager } from "./manager-core.mjs";

const manager = createManager();
const command = process.argv[2] ?? "status";
let result;

if (command === "install") result = await manager.installRuntime();
else if (command === "status") result = await manager.status();
else if (command === "enable" || command === "on" || command === "update") result = await manager.enable();
else if (command === "apply") result = await manager.runController("apply");
else if (command === "restore" || command === "disable" || command === "off") result = await manager.disable();
else if (command === "doctor") result = await manager.doctor();
else if (command === "uninstall") result = await manager.uninstall({ purge: process.argv.includes("--purge") });
else throw new Error(`Unknown command: ${basename(command)}`);

console.log(JSON.stringify(result, null, 2));
