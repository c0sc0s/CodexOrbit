import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInstallationManager } from "@c0sc0s/orbit/installation";
import { activationHealth } from "./health.js";
import type { InstallationOptions } from "@c0sc0s/orbit/installation";
import type { HealthStatus } from "./health.js";

interface ManagerOptions {
  home?: string;
  packageRoot?: string;
  installRoot?: string;
  platformRoot?: string;
  applicationsRoot?: string;
  platform?: string;
  codexBinary?: string;
  healthTimeoutMs?: number;
  manageExtensions?: boolean;
  run?: InstallationOptions["run"];
}
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export function createManager(options: ManagerOptions = {}) {
  const home = options.home ?? homedir();
  const source = options.packageRoot ?? packageRoot;
  const installRoot =
    options.installRoot ??
    process.env.CODEX_TAGS_INSTALL_DIR ??
    join(home, "Library/Application Support/Codex Sidebar Tags");
  const platform = createInstallationManager({
    home,
    root: options.platformRoot,
    applicationsRoot: options.applicationsRoot,
    platform: options.platform,
    codexBinary: options.codexBinary,
    run: options.run,
    manageExtensions: options.manageExtensions,
  });
  const marketplaceRoot = join(platform.paths.root, "marketplaces/orbit-tags");
  const paths = {
    installRoot,
    platformRoot: platform.paths.root,
    launcherPath: platform.paths.launcherPath,
    marketplaceRoot,
    marketplacePluginRoot: join(marketplaceRoot, "plugins/codex-tags"),
  };

  async function installRuntime() {
    await platform.install();
    await platform.migrateLegacy(installRoot);
    const registration = await platform.addPlugin(source, { dataDirectory: installRoot });
    const manifest = JSON.parse(await readFile(join(source, ".codex-plugin/plugin.json"), "utf8"));
    return {
      status: "installed",
      pluginVersion: manifest.version as string,
      installRoot,
      platformRoot: platform.paths.root,
      registration,
    };
  }
  async function runController(command: string) {
    if (command === "apply" || command === "start") return platform.start(command === "apply");
    if (command === "restore") return platform.setEnabled("orbit-tags", false);
    if (command !== "status") throw new Error("Unsupported compatibility command");
    const config = await platform.read();
    const record = config.orbit.packages["orbit-tags"];
    if (!record) throw new Error("Tags is not registered with Orbit");
    const controller = join(platform.paths.root, record.path, "dist/runtime/src/controller.js");
    return platform.run(process.execPath, [controller, "status"], {
      env: {
        ...process.env,
        CODEX_TAGS_STATE_DIR: record.dataDirectory,
        ORBIT_HOME: platform.paths.root,
      },
    });
  }
  async function status(): Promise<HealthStatus> {
    const state = await platform.status();
    const registered = state.packages?.["orbit-tags"];
    let runtime: HealthStatus["runtime"] = { installed: Boolean(registered) };
    if (registered) {
      try {
        const result = await runController("status");
        if ("stdout" in result) runtime = { installed: true, ...JSON.parse(result.stdout) };
      } catch (error) {
        runtime = {
          installed: true,
          error: error instanceof Error ? error.message : "Tags diagnostics failed",
        };
      }
    }
    return {
      runtime,
      plugin: registered
        ? await platform.extensionStatus("orbit-tags")
        : { installed: false, enabled: false, payloadPresent: false },
      supervisor: { loaded: false },
    };
  }
  async function enable() {
    const installation = await installRuntime();
    await platform.setEnabled("orbit-tags", true);
    await platform.start();
    const deadline = Date.now() + (options.healthTimeoutMs ?? 15_000);
    let verification = await status();
    while (!activationHealth(verification).ok && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      verification = await status();
    }
    const health = activationHealth(verification);
    return { status: health.ok ? "enabled" : "incomplete", installation, verification, health };
  }
  async function disable() {
    const state = await platform.status();
    if (state.packages?.["orbit-tags"]) await platform.setEnabled("orbit-tags", false);
    return { status: "disabled", settingsPreserved: true };
  }
  async function uninstall({ purge = false } = {}) {
    return platform.uninstallPlugin("orbit-tags", purge);
  }
  async function doctor() {
    const current = await status();
    return { ...activationHealth(current), status: current };
  }
  return { paths, installRuntime, runController, enable, disable, uninstall, status, doctor };
}
