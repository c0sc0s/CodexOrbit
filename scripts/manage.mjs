#!/usr/bin/env node
import { createInstallationManager } from "@c0sc0s/orbit/installation";

if (process.argv[2] === "install") {
  const platform = createInstallationManager();
  const installation = await platform.install();
  if (installation.status === "already-installed") await platform.update();
}
await import("../packages/orbit-tags/scripts/manage.mjs");
