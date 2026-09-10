import { existsSync, lstatSync, realpathSync } from "node:fs";
import { execFile } from "node:child_process";
import { cp, lstat, mkdir, readFile, readdir, realpath, rm } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { withRegistryPackage } from "../plugins/registry.js";
import { retireLegacyTags } from "./legacy.js";
import { createCodexExtensionManager } from "../plugins/codex-extension.js";
import { createLauncher } from "../platform/launcher.js";
import { daemonPaths, daemonStatus } from "../host/daemon.js";
import { assertCompatible, readPluginManifest } from "../plugins/manifest.js";
import { atomicJson, exists, inside, snapshotPackage } from "./files.js";
import { withInstallationLock } from "./lock.js";
import { planUninstall, removeEmptyDirectory, removePlannedFiles } from "./uninstall.js";
import type { UninstallOptions } from "./uninstall.js";
import type { PluginManifest } from "../plugins/manifest.js";
import type { PluginEntry } from "../sdk/contracts.js";
import type { ExecFileOptions } from "node:child_process";

export interface InstalledPlugin {
  manifest: PluginManifest;
  path: string;
  packageName: string;
  dataDirectory: string;
  externalData: boolean;
}
interface RuntimeVersion {
  version: string;
  path: string;
}
export interface PlatformConfig {
  apiVersion: 1;
  plugins: PluginEntry[];
  orbit: {
    schemaVersion: 1;
    runtime: RuntimeVersion;
    previousRuntime?: RuntimeVersion;
    packages: Record<string, InstalledPlugin>;
  };
}
export interface InstallationOptions {
  codexBinary?: string;
  manageExtensions?: boolean;
  home?: string;
  root?: string;
  packageRoot?: string;
  applicationsRoot?: string;
  platform?: string;
  port?: number;
  getDaemonStatus?: typeof daemonStatus;
  run?: (
    file: string,
    args: string[],
    options: ExecFileOptions,
  ) => Promise<{ stdout: string; stderr: string }>;
}

const execute = promisify(execFile);
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
export function resolvePluginId(config: PlatformConfig, id: string): string {
  if (Object.hasOwn(config.orbit.packages, id)) return id;
  const matches = Object.values(config.orbit.packages).filter(plugin => plugin.manifest.legacyIds?.includes(id));
  if (matches.length > 1) throw new Error(`Ambiguous plugin alias ${id}`);
  return matches[0]?.manifest.id ?? id;
}
function canonicalPath(path: string): string {
  path = resolve(path);
  if (existsSync(path)) return lstatSync(path).isSymbolicLink() ? path : realpathSync(path);
  return join(canonicalPath(dirname(path)), basename(path));
}

export function createInstallationManager(options: InstallationOptions = {}) {
  const home = options.home ?? homedir();
  const root = canonicalPath(
    options.root ?? process.env.ORBIT_HOME ?? join(home, "Library/Application Support/Orbit"),
  );
  const source = canonicalPath(options.packageRoot ?? packageRoot);
  const configPath = join(root, "loader.json");
  const launcherPath = join(options.applicationsRoot ?? join(home, "Applications"), "Orbit.app");
  const port = options.port ?? Number(process.env.ORBIT_CDP_PORT ?? 9341);
  const run = (file: string, args: string[], settings: ExecFileOptions = {}) =>
    (options.run ?? execute)(file, args, {
      timeout: 90_000,
      maxBuffer: 8 * 1024 * 1024,
      ...settings,
    });
  for (const protectedPath of [
    home,
    ...(["runtime", "plugins", "marketplaces"].some((folder) =>
      source.startsWith(`${root}/${folder}/`),
    )
      ? []
      : [source]),
    process.env.CODEX_HOME ?? join(home, ".codex"),
  ].map((path) => canonicalPath(path))) {
    if (protectedPath === root || protectedPath.startsWith(`${root}/`) || root === "/")
      throw new Error("Unsafe Orbit installation directory");
  }
  const extensions = createCodexExtensionManager(root, run, options.codexBinary);
  async function prepare() {
    await mkdir(root, { recursive: true, mode: 0o700 });
    if ((await lstat(root)).isSymbolicLink())
      throw new Error("Orbit root must not traverse a symlink");
  }
  async function read(): Promise<PlatformConfig> {
    if (!(await exists(configPath)))
      throw new Error("Orbit is not installed; run orbit install first");
    const config = JSON.parse(await readFile(configPath, "utf8")) as PlatformConfig;
    if (
      config.apiVersion !== 1 ||
      config.orbit?.schemaVersion !== 1 ||
      !Array.isArray(config.plugins) ||
      !config.orbit.packages
    )
      throw new Error("Not an Orbit-owned installation");
    inside(root, config.orbit.runtime.path);
    return config;
  }
  async function runtimeCommand(config: PlatformConfig, command: string, attach = false) {
    const cli = join(inside(root, config.orbit.runtime.path), "dist/cli.js");
    return run(
      process.execPath,
      [
        cli,
        command,
        "--config",
        configPath,
        "--port",
        String(port),
        ...(attach ? ["--attach"] : []),
      ],
      { env: { ...process.env, ORBIT_HOME: root, ORBIT_CDP_PORT: String(port) } },
    );
  }
  async function daemon(config: PlatformConfig) {
    return (options.getDaemonStatus ?? daemonStatus)(
      daemonPaths(configPath, port),
      join(inside(root, config.orbit.runtime.path), "dist/cli.js"),
    );
  }
  async function isRunning() {
    const state = await daemon(await read());
    if (state.conflict)
      throw new Error(
        "Orbit daemon ownership conflicts with another process; no files were changed",
      );
    return state.running;
  }
  async function mutate<T>(
    operation: (config: PlatformConfig) => Promise<T>,
    finalize?: () => Promise<void>,
  ): Promise<T> {
    await prepare();
    return withInstallationLock(configPath, async () => {
      const previous = await read();
      const config = structuredClone(previous);
      const result = await operation(config);
      const running = await isRunning();
      if (running) await runtimeCommand(previous, "stop");
      try {
        await atomicJson(configPath, config);
        if (config.orbit.runtime.path !== previous.orbit.runtime.path) await repairEntry(config);
        if (options.manageExtensions !== false) await extensions.reconcile(previous, config);
        if (running) await runtimeCommand(config, "start", true);
      } catch (error) {
        // Never leave a failed candidate running against restored metadata.
        try {
          if (await isRunning()) await runtimeCommand(config, "stop");
        } catch {
          throw new Error("Candidate cleanup failed; installation recovery requires inspection", {
            cause: error,
          });
        }
        await atomicJson(configPath, previous);
        const recoveryErrors: unknown[] = [];
        try {
          if (config.orbit.runtime.path !== previous.orbit.runtime.path) await repairEntry(previous);
          if (options.manageExtensions !== false) await extensions.reconcile(config, previous);
        } catch (recoveryError) { recoveryErrors.push(recoveryError); }
        try {
          if (running) await runtimeCommand(previous, "start", true);
        } catch (recoveryError) { recoveryErrors.push(recoveryError); }
        if (recoveryErrors.length)
          throw new AggregateError([error, ...recoveryErrors], `Installation failed: ${error instanceof Error ? error.message : String(error)}; configuration restored but recovery needs attention`, { cause: error });
        throw error;
      }
      await finalize?.();
      return result;
    });
  }
  async function stageRuntime(candidate: string): Promise<RuntimeVersion> {
    const manifest = JSON.parse(await readFile(join(candidate, "package.json"), "utf8"));
    if (manifest.name !== "@c0sc0s/orbit" || !/^\d+\.\d+\.\d+$/u.test(manifest.version))
      throw new Error("Expected a built Orbit package");
    const path = `runtime/${manifest.version}-${randomUUID()}`;
    const destination = inside(root, path);
    try {
      await snapshotPackage(candidate, destination);
      await run(process.execPath, [join(destination, "dist/cli.js"), "--help"]);
      return { version: manifest.version, path };
    } catch (error) {
      await rm(destination, { recursive: true, force: true });
      throw error;
    }
  }
  async function repairEntry(config: PlatformConfig) {
    const runtimeIcon = join(inside(root, config.orbit.runtime.path), "assets/icon.icns");
    await cp(
      join(inside(root, config.orbit.runtime.path), "dist/installation/entry.js"),
      join(root, "orbit.mjs"),
    );
    if ((options.platform ?? process.platform) === "darwin")
      await createLauncher({
        launcherPath,
        nodePath: process.execPath,
        cliPath: join(root, "orbit.mjs"),
        configPath,
        port,
        logPath: join(root, "launcher.log"),
        bundleId: "io.github.c0sc0s.orbit",
        iconPath: await exists(runtimeIcon) ? runtimeIcon : join(source, "assets/icon.icns"),
      });
  }
  async function install() {
    await prepare();
    return withInstallationLock(configPath, async () => {
      const receipt = join(root, "uninstall.json");
      if (await exists(receipt) && !JSON.parse(await readFile(receipt, "utf8")).uninstallComplete)
        throw new Error("Finish the pending uninstall before installing Orbit again");
      if (await exists(configPath)) {
        const current = await read();
        await repairEntry(current);
        return { status: "already-installed", root, launcherPath };
      }
      const runtime = await stageRuntime(source);
      const config: PlatformConfig = {
        apiVersion: 1,
        plugins: [],
        orbit: { schemaVersion: 1, runtime, packages: {} },
      };
      await atomicJson(configPath, config);
      await repairEntry(config);
      await rm(receipt, { force: true });
      return { status: "installed", root, launcherPath, version: runtime.version };
    });
  }
  async function update(candidate = source) {
    return mutate(async (config) => {
      const runtime = await stageRuntime(candidate);
      for (const plugin of Object.values(config.orbit.packages))
        assertCompatible(plugin.manifest, runtime.version);
      config.orbit.previousRuntime = config.orbit.runtime;
      config.orbit.runtime = runtime;
      return { status: "updated", version: runtime.version };
    });
  }
  async function rollback() {
    return mutate(async (config) => {
      const previous = config.orbit.previousRuntime;
      if (!previous) throw new Error("No previous Orbit runtime is available");
      for (const plugin of Object.values(config.orbit.packages))
        assertCompatible(plugin.manifest, previous.version);
      config.orbit.previousRuntime = config.orbit.runtime;
      config.orbit.runtime = previous;
      return { status: "rolled-back", version: previous.version };
    });
  }
  async function addPlugin(candidate: string, settings: { dataDirectory?: string } = {}) {
    candidate = await realpath(candidate);
    const manifest = await readPluginManifest(candidate);
    let installedRecord: InstalledPlugin | undefined;
    return mutate(
      async (config) => {
        assertCompatible(manifest, config.orbit.runtime.version);
        const packageName = JSON.parse(
          await readFile(join(candidate, "package.json"), "utf8"),
        ).name;
        const legacyIds = manifest.legacyIds ?? [];
        const matches = [manifest.id, ...legacyIds].filter(id => Object.hasOwn(config.orbit.packages, id));
        if (matches.length > 1) throw new Error("Conflicting current and legacy plugin registrations");
        const previousId = matches[0] ?? manifest.id;
        const existing = Object.hasOwn(config.orbit.packages, previousId)
          ? config.orbit.packages[previousId]
          : undefined;
        const previousEntry = config.plugins.find(plugin => plugin.id === previousId);
        if (Object.entries(config.orbit.packages).some(([id, plugin]) =>
          id !== previousId && (plugin.manifest.legacyIds ?? []).some(alias => [manifest.id, ...legacyIds].includes(alias))))
          throw new Error("Plugin alias belongs to another package");
        if (existing && JSON.stringify(existing.manifest.codex) !== JSON.stringify(manifest.codex))
          throw new Error("Official extension identity cannot change during a plugin update");
        if (
          manifest.codex &&
          Object.entries(config.orbit.packages).some(
            ([id, plugin]) =>
              id !== previousId &&
              plugin.manifest.codex?.marketplace === manifest.codex?.marketplace,
          )
        )
          throw new Error("Official marketplace identity belongs to another plugin");
        if (existing && existing.packageName !== packageName)
          throw new Error("Plugin ID belongs to another package");
        if ((!existing && previousEntry) || config.plugins.some((plugin) => [manifest.id, ...legacyIds].includes(plugin.id) && plugin.id !== previousEntry?.id))
          throw new Error("Plugin ID belongs to an unmanaged module");
        const path = `plugins/${manifest.id}/${manifest.version}-${randomUUID()}`;
        const destination = inside(root, path);
        await snapshotPackage(candidate, destination);
        await readPluginManifest(destination);
        const dataDirectory =
          existing?.dataDirectory ?? settings.dataDirectory ?? join(root, "data", manifest.id);
        for (const protectedPath of [
          home,
          root,
          source,
          process.env.CODEX_HOME ?? join(home, ".codex"),
        ]) {
          if (
            resolve(dataDirectory) === resolve(protectedPath) ||
            resolve(protectedPath).startsWith(`${resolve(dataDirectory)}/`)
          )
            throw new Error("Unsafe plugin data directory");
        }
        await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
        const record: InstalledPlugin = {
          manifest,
          path,
          packageName,
          dataDirectory,
          externalData: (existing && previousId !== manifest.id) ? true : existing?.externalData ?? Boolean(settings.dataDirectory),
        };
        installedRecord = record;
        delete config.orbit.packages[previousId];
        config.orbit.packages[manifest.id] = record;
        await atomicJson(join(destination, "orbit-installation.json"), {
          platformRoot: root,
          dataDirectory,
        });
        const entry: PluginEntry = {
          id: manifest.id,
          version: manifest.runtimeVersion,
          entry: `${path}/${manifest.renderer}`,
          ...(manifest.service ? { service: `${path}/${manifest.service}` } : {}),
          enabled: previousEntry?.enabled ?? true,
          config: {
            ...previousEntry?.config,
            dataDirectory,
            packageVersion: manifest.version,
            platformRoot: root,
          },
        };
        config.plugins = [...config.plugins.filter((plugin) => plugin.id !== previousId), entry];
        return {
          status: "registered",
          id: manifest.id,
          version: manifest.version,
          path: destination,
        };
      },
      async () => {
        if (installedRecord)
          await atomicJson(join(installedRecord.dataDirectory, "install.json"), {
            packageVersion: manifest.version,
            pluginVersion: manifest.version,
            platformRoot: root,
          });
      },
    );
  }
  async function setEnabled(id: string, enabled: boolean) {
    return mutate(async (config) => {
      id = resolvePluginId(config, id);
      if (!Object.hasOwn(config.orbit.packages, id)) throw new Error(`Unknown plugin ${id}`);
      const plugin = config.plugins.find((plugin) => plugin.id === id)!;
      plugin.enabled = enabled;
      return { status: enabled ? "enabled" : "disabled", id };
    });
  }
  async function uninstallPlugin(id: string, purge = false) {
    let retired: InstalledPlugin | undefined;
    const result = await mutate(
      async (config) => {
        id = resolvePluginId(config, id);
        retired = Object.hasOwn(config.orbit.packages, id) ? config.orbit.packages[id] : undefined;
        if (!retired) throw new Error(`Unknown plugin ${id}`);
        if (
          purge &&
          (retired.externalData || resolve(retired.dataDirectory) !== join(root, "data", id))
        )
          throw new Error(
            "Migrated external data must be removed explicitly; Orbit will not recursively delete it",
          );
        delete config.orbit.packages[id];
        config.plugins = config.plugins.filter((plugin) => plugin.id !== id);
        return { status: "uninstalled", id, settingsPreserved: !purge };
      },
      async () => {
        await rm(inside(root, `plugins/${id}`), { recursive: true, force: true });
        await rm(inside(root, `marketplaces/${id}`), { recursive: true, force: true });
        if (purge && retired)
          await rm(inside(root, relative(root, retired.dataDirectory)), {
            recursive: true,
            force: true,
          });
      },
    );
    return result;
  }
  async function uninstall(settings: UninstallOptions = {}) {
    const receipt = inside(root, "uninstall.json");
    if (!(await exists(root))) return { status: "not-installed", root };
    const result = await withInstallationLock(configPath, async () => {
      inside(root, "loader.json");
      const installed = await exists(configPath);
      if (!installed && !(await exists(receipt))) throw new Error("No Orbit ownership metadata; refusing cleanup");
      const config: PlatformConfig = installed ? await read() : JSON.parse(await readFile(receipt, "utf8"));
      const plan = await planUninstall(root, launcherPath, port, config, settings.purge === true);
      if (installed) {
        const state = await daemon(config);
        if (state.conflict) throw new Error("Orbit daemon ownership conflicts; no files were changed");
      }
      if (settings.dryRun) return { status: "planned", ...plan, cliPreserved: true };
      if (installed) {
        // Stop also unloads renderer-only modules when the daemon is already absent.
        await runtimeCommand(config, "stop");
        const state = await daemon(config);
        if (state.running || state.conflict) throw new Error("Orbit has not stopped; installation files were preserved");
        if ((options.platform ?? process.platform) === "darwin") {
          const processes = (await run("/bin/ps", ["-axo", "pid=,command="])).stdout;
          const residual = processes.split("\n").filter(line =>
            line.includes(`${root}/runtime/`) && line.includes("/dist/cli.js watch ") && line.includes(`--config ${configPath}`));
          if (residual.length) throw new Error("Residual Orbit runtime processes remain; stop them before retrying uninstall. Installation files were preserved");
        }
        const empty = structuredClone(config);
        empty.plugins = [];
        empty.orbit.packages = {};
        if (options.manageExtensions !== false) await extensions.reconcile(config, empty);
        // Keep a retry receipt before deleting the active runtime or configuration.
        await atomicJson(receipt, config);
        await rm(configPath);
      }
      await removePlannedFiles(plan);
      if (settings.purge || (!(await exists(join(root, "data"))) && !(await exists(join(root, "module-data"))))) await rm(receipt, { force: true });
      else await atomicJson(receipt, { ...config, uninstallComplete: true });
      return { status: "uninstalled", ...plan, cliPreserved: true };
    });
    if (!settings.dryRun) await removeEmptyDirectory(root);
    return { ...result, remaining: await exists(root) ? (await readdir(root)).map(name => join(root, name)) : [] };
  }
  async function installPackage(spec: string, expectedId?: string) {
    return withRegistryPackage(spec, run, async (candidate) => {
      const manifest = await readPluginManifest(candidate);
      if (expectedId && manifest.id !== expectedId && !manifest.legacyIds?.includes(expectedId))
        throw new Error("Plugin update changed identity");
      return addPlugin(candidate);
    });
  }
  async function updatePackage() {
    return withRegistryPackage("@c0sc0s/orbit@latest", run, (candidate) => update(candidate));
  }
  async function migrateLegacy(directory: string) {
    await prepare();
    return withInstallationLock(configPath, async () => {
      await read();
      return retireLegacyTags({
        directory,
        platformRoot: root,
        home,
        applicationsRoot: options.applicationsRoot,
        port,
        run,
        codexBinary: options.codexBinary,
        manageExtensions: options.manageExtensions,
        platform: options.platform ?? process.platform,
      });
    });
  }
  async function start(attach = false) {
    return withInstallationLock(configPath, async () => runtimeCommand(await read(), "start", attach));
  }
  async function status() {
    if (!(await exists(configPath))) return { installed: false, root };
    const config = await read();
    return {
      installed: true,
      root,
      runtime: config.orbit.runtime,
      daemon: await daemon(config),
      plugins: config.plugins,
      packages: config.orbit.packages,
    };
  }
  async function extensionStatus(id: string) {
    const config = await read();
    const record = config.orbit.packages[resolvePluginId(config, id)];
    const extension = record?.manifest.codex;
    if (!extension) return { installed: false, enabled: false, payloadPresent: false };
    try {
      const state = JSON.parse((await extensions.command(["plugin", "list", "--json"])).stdout);
      const plugin = state.installed?.find(
        (value: { pluginId: string }) =>
          value.pluginId === `${extension.name}@${extension.marketplace}`,
      );
      const payload = plugin?.source?.path;
      return {
        installed: Boolean(plugin),
        enabled: plugin?.enabled === true,
        payloadPresent:
          typeof payload === "string" && (await exists(join(payload, ".codex-plugin/plugin.json"))),
      };
    } catch (error) {
      return {
        installed: false,
        enabled: false,
        payloadPresent: false,
        error: error instanceof Error ? error.message : "Official extension status unavailable",
      };
    }
  }
  async function doctor() {
    const checks = [{ id: "node", ok: Number(process.versions.node.split(".")[0]) >= 22 }];
    const state = await status();
    checks.push({ id: "installed", ok: state.installed });
    if (state.installed && state.runtime) {
      checks.push({
        id: "runtime",
        ok: await exists(join(root, state.runtime.path, "dist/cli.js")),
      });
      checks.push({
        id: "launcher",
        ok: (options.platform ?? process.platform) !== "darwin" || (await exists(launcherPath)),
      });
      if ((options.platform ?? process.platform) === "darwin") {
        let ok = false;
        try {
          const icon = await readFile(join(launcherPath, "Contents/Resources/icon.icns"));
          const plist = await readFile(join(launcherPath, "Contents/Info.plist"), "utf8");
          ok = icon.length >= 8 && icon.subarray(0, 4).toString() === "icns" &&
            icon.readUInt32BE(4) === icon.length &&
            /<key>CFBundleIconFile<\/key>\s*<string>icon.icns<\/string>/u.test(plist);
        } catch { /* A missing or invalid icon is reported as a failed diagnostic. */ }
        checks.push({ id: "launcher-icon", ok });
      }
      checks.push({ id: "owner", ok: !state.daemon?.conflict });
      for (const record of Object.values(state.packages ?? {})) {
        let ok = true;
        try {
          assertCompatible(
            await readPluginManifest(join(root, record.path)),
            state.runtime.version,
          );
        } catch {
          ok = false;
        }
        checks.push({ id: `plugin:${record.manifest.id}`, ok });
      }
    }
    return { ok: checks.every((check) => check.ok), checks, status: state };
  }
  return {
    paths: { root, configPath, launcherPath },
    install,
    update,
    updatePackage,
    rollback,
    migrateLegacy,
    addPlugin,
    setEnabled,
    uninstallPlugin,
    uninstall,
    installPackage,
    start,
    status,
    doctor,
    extensionStatus,
    read,
    run,
  };
}
