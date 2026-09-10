import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { exists } from "./files.js";
import { createLauncher } from "../platform/launcher.js";
import { createCodexExtensionManager } from "../plugins/codex-extension.js";
import type { InstallationOptions } from "./manager.js";

export async function retireLegacyTags(options: {
  directory: string;
  platformRoot: string;
  home: string;
  applicationsRoot?: string;
  port: number;
  run: NonNullable<InstallationOptions["run"]>;
  codexBinary?: string;
  manageExtensions?: boolean;
  platform: string;
}) {
  const { directory, platformRoot, run, port } = options;
  if (!(await exists(join(directory, "install.json")))) return { migrated: false };
  if (resolve(directory) === resolve(platformRoot))
    throw new Error("Legacy data and Orbit platform directories must be distinct");
  const metadata = JSON.parse(await readFile(join(directory, "install.json"), "utf8"));
  if (metadata.platformRoot === platformRoot) return { migrated: true };
  if (!Array.isArray(metadata.runtimeFiles) || !metadata.pluginVersion)
    throw new Error("Unrecognized legacy installation");
  const configPath = join(directory, "loader.json");
  const config = JSON.parse(await readFile(configPath, "utf8"));
  if (config.plugins?.some((plugin: { id: string }) => plugin.id !== "codex-tags"))
    throw new Error(
      "Legacy installation contains other modules; migrate their ownership explicitly before proceeding",
    );
  const candidates = [
    "node_modules/@c0sc0s/orbit/dist/cli.js",
    "node_modules/@c0sc0s/orbit/src/cli.mjs",
    "plugin-loader/cli.mjs",
  ];
  for (const candidate of candidates)
    if (await exists(join(directory, candidate))) {
      await run(
        process.execPath,
        [join(directory, candidate), "stop", "--config", configPath, "--port", String(port)],
        { timeout: 90_000 },
      );
      break;
    }
  if (options.manageExtensions !== false) {
    const extensions = createCodexExtensionManager(platformRoot, run, options.codexBinary);
    const state = JSON.parse(
      (await extensions.command(["plugin", "marketplace", "list", "--json"])).stdout,
    );
    const old = state.marketplaces?.find(
      (entry: { name: string }) => entry.name === "codex-tags-cli",
    );
    if (old && resolve(old.root) === resolve(directory, "plugin-marketplace"))
      await extensions.remove("codex-tags", "codex-tags-cli", true, old.root);
  }
  const launcherPath = join(
    options.applicationsRoot ?? join(options.home, "Applications"),
    "Codex Tags.app",
  );
  if (options.platform === "darwin" && (await exists(launcherPath)))
    await createLauncher({
      launcherPath,
      nodePath: process.execPath,
      cliPath: join(platformRoot, "orbit.mjs"),
      configPath: join(platformRoot, "loader.json"),
      port,
      logPath: join(platformRoot, "launcher.log"),
      bundleId: "io.github.c0sc0s.codex-tags",
      iconPath: join(options.applicationsRoot ?? join(options.home, "Applications"), "Orbit.app/Contents/Resources/icon.icns"),
    });
  return { migrated: true, dataPreserved: directory };
}
