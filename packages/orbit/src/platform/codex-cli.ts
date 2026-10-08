import { accessSync, constants, statSync } from "node:fs";
import { join } from "node:path";
import { findCodexApp } from "./codex-process.js";

export function findCodexCli(appPath = findCodexApp()?.appPath): string | null {
  if (!appPath) return null;
  for (const relativePath of [
    "Contents/Resources/codex-cli/CodexCLI.app/Contents/MacOS/codex",
    "Contents/Resources/codex",
  ]) {
    const executable = join(appPath, relativePath);
    try {
      if (!statSync(executable).isFile()) continue;
      accessSync(executable, constants.X_OK);
      return executable;
    } catch { /* Bundled CLI layouts differ across Codex versions. */ }
  }
  return null;
}
