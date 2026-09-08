import { execFile } from "node:child_process";
import { access, chmod, copyFile, cp, lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { activationHealth, runtimeHealthChecks } from "./health.mjs";
import { findCodexApp } from "../runtime/src/codex-process.mjs";
import { RUNTIME_VERSION } from "../runtime/src/tags-plugin.mjs";
import { daemonPaths } from "../runtime/src/plugin-loader/daemon.mjs";
import { createLauncher as createLoaderLauncher } from "../runtime/src/plugin-loader/launcher.mjs";

const execFileAsync = promisify(execFile);
const DEFAULT_MARKETPLACE = "codex-tags-cli";
const PLUGIN_NAME = "codex-tags";
const packageRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const loaderDirectory = join(packageRoot, "runtime", "src", "plugin-loader");
const loaderFiles = (await readdir(loaderDirectory)).filter((file) => file.endsWith(".mjs") || file.endsWith(".d.mts") || file === "package.json");
const runtimeFiles = new Map([
  ["controller.mjs", "app.mjs"],
  ...loaderFiles.map((file) => [`plugin-loader/${file}`, `plugin-loader/${file}`]),
  ["tags-plugin.mjs", "tags-plugin.mjs"],
  ["tags-service.mjs", "tags-service.mjs"],
  ["update-service.mjs", "update-service.mjs"],
  ["update-worker.mjs", "update-worker.mjs"],
  ["codex-process.mjs", "codex-process.mjs"],
  ["controller-router.mjs", "controller-router.mjs"],
  ["cdp-client.mjs", "cdp-client.mjs"],
  ["controller-state.mjs", "controller-state.mjs"],
  ["content-index.mjs", "content-index.mjs"],
  ["inject-expression.mjs", "inject-expression.mjs"],
  ["search-index.mjs", "search-index.mjs"],
  ["session-catalog.mjs", "session-catalog.mjs"],
  ["sidebar-membership.mjs", "sidebar-membership.mjs"],
  ["protocol.mjs", "protocol.mjs"],
  ["settings-repository.mjs", "settings-repository.mjs"],
  ["runtime-target-registry.mjs", "runtime-target-registry.mjs"],
  ["title-format.mjs", "title-format.mjs"],
  ["tag-settings.mjs", "tag-settings.mjs"],
  ["../dist/injected.js", "dist/injected.js"],
]);

const pluginSourceEntries = [
  ".codex-plugin",
  "hooks",
  "skills",
  "runtime/dist",
  ...[...runtimeFiles.keys()]
    .filter((source) => source !== "../dist/injected.js")
    .map((source) => `runtime/src/${source}`),
  "scripts/manage.mjs",
  "scripts/manager-core.mjs",
  "scripts/health.mjs",
  "package.json",
  "README.md",
  "README.zh-CN.md",
  "assets",
  "docs",
  "CHANGELOG.md",
  "LICENSE",
];

export function createManager(options = {}) {
  const home = options.home ?? homedir();
  const root = options.packageRoot ?? packageRoot;
  const defaultInstallRoot = join(home, "Library", "Application Support", "Codex Sidebar Tags");
  const installRoot = options.installRoot
    ?? process.env.CODEX_TAGS_INSTALL_DIR
    ?? defaultInstallRoot;
  const applicationsRoot = options.applicationsRoot
    ?? process.env.CODEX_TAGS_APPLICATIONS_DIR
    ?? join(home, "Applications");
  const marketplaceName = options.marketplaceName ?? DEFAULT_MARKETPLACE;
  const launcherPath = join(applicationsRoot, "Codex Tags.app");
  const launchAgentLabel = "io.github.c0sc0s.codex-tags.supervisor";
  const launchAgentsRoot = options.launchAgentsRoot ?? join(home, "Library", "LaunchAgents");
  const launchAgentPath = join(launchAgentsRoot, `${launchAgentLabel}.plist`);
  const installedController = join(installRoot, "app.mjs");
  const installedSupervisor = join(installRoot, "launch-supervisor.mjs");
  // npm/npx may hoist dependencies beside the scoped package, not inside it.
  const requireFromPackage = createRequire(join(root, "package.json"));
  const sqlitePackageSource = dirname(requireFromPackage.resolve("better-sqlite3/package.json"));
  const sqlitePackageDestination = join(installRoot, "node_modules", "better-sqlite3");
  const marketplaceRoot = join(installRoot, "plugin-marketplace");
  const marketplacePluginRoot = join(marketplaceRoot, "plugins", PLUGIN_NAME);
  const codexHome = process.env.CODEX_HOME ?? join(home, ".codex");
  const searchDatabaseFiles = ["search.sqlite", "search.sqlite-wal", "search.sqlite-shm"];
  const platform = options.platform ?? process.platform;
  const arch = options.arch ?? process.arch;
  const nodePath = options.nodePath ?? process.execPath;
  const execute = options.run ?? execFileAsync;
  const run = (file, args, settings = {}) => execute(file, args, { timeout: 90_000, ...settings });
  const userId = options.userId ?? process.getuid?.();
  const resolvedInstallRoot = resolve(installRoot);
  for (const protectedPath of [resolve(home), resolve(root), resolve(codexHome)]) {
    if (protectedPath === resolvedInstallRoot || protectedPath.startsWith(`${resolvedInstallRoot}${sep}`) || resolvedInstallRoot === sep) {
      throw new Error("Installation directory must not be a home, source, Codex data directory, or their ancestor.");
    }
  }

  async function checkOwnedDirectory() {
    try {
      if ((await lstat(installRoot)).isSymbolicLink()) throw new Error("Installation directory must not be a symbolic link.");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  async function pathExists(path) {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  }

  async function copyFileAtomically(source, destination) {
    await mkdir(dirname(destination), { recursive: true });
    const temporaryPath = `${destination}.next-${process.pid}`;
    await copyFile(source, temporaryPath);
    await chmod(temporaryPath, 0o644);
    await rename(temporaryPath, destination);
  }

  async function readPluginVersion() {
    const manifest = JSON.parse(await readFile(join(root, ".codex-plugin", "plugin.json"), "utf8"));
    return manifest.version;
  }

  async function checkLauncherOwnership() {
    if (await pathExists(launcherPath)) {
      const plist = await readFile(join(launcherPath, "Contents", "Info.plist"), "utf8");
      if (!plist.includes("<string>io.github.c0sc0s.codex-tags</string>")) throw new Error("Another application owns the Codex Tags.app path; it was not replaced.");
    }
  }

  async function createLauncher() {
    if (platform !== "darwin") return null;
    return createLoaderLauncher({
      launcherPath, nodePath, cliPath: join(installRoot, "plugin-loader", "cli.mjs"),
      configPath: join(installRoot, "loader.json"), port: Number(process.env.CODEX_TAGS_CDP_PORT ?? 9341),
      logPath: join(installRoot, "launcher.log"), iconPath: join(root, "assets", "icon.icns"),
      bundleId: "io.github.c0sc0s.codex-tags",
    });
  }

  async function supervisorStatus() {
    const installed = await pathExists(launchAgentPath);
    if (platform !== "darwin" || !Number.isInteger(userId)) {
      return { supported: platform === "darwin", installed, loaded: false, launchAgentPath };
    }
    try {
      const { stdout } = await run("/bin/launchctl", ["print", `gui/${userId}/${launchAgentLabel}`]);
      const pid = Number(stdout.match(/\bpid\s*=\s*(\d+)/u)?.[1]);
      return { supported: true, installed, loaded: true, pid: Number.isSafeInteger(pid) ? pid : null, launchAgentPath };
    } catch {
      return { supported: true, installed, loaded: false, launchAgentPath };
    }
  }

  async function waitForLaunchSupervisorToUnload(timeoutMs = 3_000) {
    if (!Number.isInteger(userId)) return;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        await run("/bin/launchctl", ["print", `gui/${userId}/${launchAgentLabel}`]);
      } catch {
        return;
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, 50));
    }
    throw new Error("The previous Codex Tags launch supervisor did not stop in time.");
  }

  async function removeLaunchSupervisor() {
    await checkOwnedDirectory();
    if (platform !== "darwin") return { supported: false, installed: false, loaded: false, launchAgentPath };
    if (Number.isInteger(userId)) {
      try {
        await run("/bin/launchctl", ["bootout", `gui/${userId}/${launchAgentLabel}`]);
      } catch {}
      await waitForLaunchSupervisorToUnload();
    }
    await rm(launchAgentPath, { force: true });
    await rm(installedSupervisor, { force: true });
    return { supported: true, installed: false, loaded: false, launchAgentPath };
  }

  async function copyRuntimeDependency() {
    if (!(await pathExists(join(sqlitePackageSource, "package.json")))) {
      throw new Error("Runtime dependency better-sqlite3 is missing. Reinstall the Codex Tags npm package.");
    }
    const nextPackage = `${sqlitePackageDestination}.next-${process.pid}`;
    const prebuildName = `${platform}-${arch}.node`;
    await mkdir(dirname(nextPackage), { recursive: true });
    await rm(nextPackage, { recursive: true, force: true });
    await cp(sqlitePackageSource, nextPackage, {
      recursive: true,
      filter: (source) => {
        const relative = source.slice(sqlitePackageSource.length).replace(/^\//, "");
        return !relative
          || relative === "package.json"
          || relative === "LICENSE"
          || relative === "lib"
          || relative.startsWith("lib/")
          || relative === "prebuilds"
          || relative === `prebuilds/${prebuildName}`;
      },
    });
    await rm(sqlitePackageDestination, { recursive: true, force: true });
    await rename(nextPackage, sqlitePackageDestination);
  }

  async function copyPluginSource() {
    const nextRoot = `${marketplacePluginRoot}.next-${process.pid}`;
    await rm(nextRoot, { recursive: true, force: true });
    await mkdir(nextRoot, { recursive: true });
    for (const entry of pluginSourceEntries) {
      const source = join(root, entry);
      if (!(await pathExists(source))) continue;
      const destination = join(nextRoot, entry);
      await mkdir(dirname(destination), { recursive: true });
      await cp(source, destination, { recursive: true });
    }
    await mkdir(join(nextRoot, "node_modules"), { recursive: true });
    await cp(sqlitePackageSource, join(nextRoot, "node_modules", "better-sqlite3"), { recursive: true });
    await rm(marketplacePluginRoot, { recursive: true, force: true });
    await mkdir(dirname(marketplacePluginRoot), { recursive: true });
    await rename(nextRoot, marketplacePluginRoot);
    const marketplace = {
      name: marketplaceName,
      interface: { displayName: "Codex Tags" },
      plugins: [{
        name: PLUGIN_NAME,
        source: { source: "local", path: `./plugins/${PLUGIN_NAME}` },
        policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
        category: "Productivity",
      }],
    };
    const manifestPath = join(marketplaceRoot, ".agents", "plugins", "marketplace.json");
    await mkdir(dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(marketplace, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  }

  async function installRuntime() {
    await checkOwnedDirectory();
    await removeLaunchSupervisor();
    if (await pathExists(installedController)) await runController("restore");
    if (await pathExists(join(installRoot, "plugin-loader", "daemon.mjs"))) {
      await run(nodePath, [join(installRoot, "plugin-loader", "cli.mjs"), "stop", "--config", join(installRoot, "loader.json"), "--port", String(process.env.CODEX_TAGS_CDP_PORT ?? 9341)]);
    }
    await mkdir(installRoot, { recursive: true });
    await chmod(installRoot, 0o700);
    for (const [sourceName, destinationName] of runtimeFiles) {
      await copyFileAtomically(join(root, "runtime", "src", sourceName), join(installRoot, destinationName));
    }
    const loaderConfigPath = join(installRoot, "loader.json");
    let loaderConfig = { apiVersion: 1, plugins: [] };
    if (await pathExists(loaderConfigPath)) {
      loaderConfig = JSON.parse(await readFile(loaderConfigPath, "utf8"));
      if (loaderConfig.apiVersion !== 1 || !Array.isArray(loaderConfig.plugins)) throw new Error("Invalid existing Loader configuration");
    }
    const tagsEntry = { id: "codex-tags", entry: "dist/injected.js", service: "tags-service.mjs", version: RUNTIME_VERSION, config: { dataDirectory: installRoot } };
    const existingTags = loaderConfig.plugins.find(({ id }) => id === tagsEntry.id);
    if (existingTags) {
      if (existingTags.host !== "tags-plugin.mjs" && existingTags.entry !== tagsEntry.entry) throw new Error("The codex-tags module ID is owned by another entry");
      delete existingTags.host;
      Object.assign(existingTags, { entry: tagsEntry.entry, service: tagsEntry.service, version: tagsEntry.version });
      existingTags.enabled = true;
      existingTags.config = { dataDirectory: installRoot, ...existingTags.config };
    } else loaderConfig.plugins.push(tagsEntry);
    await writeFile(loaderConfigPath, `${JSON.stringify(loaderConfig, null, 2)}\n`, { mode: 0o600 });
    await copyRuntimeDependency();
    await copyPluginSource();
    const pluginVersion = await readPluginVersion();
    const installation = {
      schemaVersion: 2,
      packageVersion: JSON.parse(await readFile(join(root, "package.json"), "utf8")).version,
      pluginVersion,
      installedAt: new Date().toISOString(),
      packageRoot: root,
      runtimeFiles: [...runtimeFiles.values()],
      runtimeDependencies: ["better-sqlite3"],
      marketplaceName,
    };
    await writeFile(join(installRoot, "install.json"), `${JSON.stringify(installation, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    const launcher = await createLauncher();
    return { status: "installed", pluginVersion, installRoot, launcher, marketplaceRoot };
  }

  async function runController(command) {
    if (!(await pathExists(installedController))) throw new Error("Codex Tags is not installed. Run `codex-tags install` first.");
    const { stdout, stderr } = await run(nodePath, [installedController, command], { maxBuffer: 20 * 1024 * 1024 });
    return { stdout: stdout.trim(), stderr: stderr.trim() };
  }

  async function runtimeStatus() {
    if (!(await pathExists(installedController))) return { installed: false, installRoot };
    try {
      const { stdout, stderr } = await runController("status");
      return { installed: true, ...JSON.parse(stdout), ...(stderr ? { warning: stderr } : {}) };
    } catch (error) {
      return { installed: true, installRoot, error: error.message };
    }
  }

  async function findCodexBinary() {
    const explicit = options.codexBinary ?? process.env.CODEX_TAGS_CODEX_BIN;
    const app = findCodexApp();
    const candidates = [explicit, app ? join(app.appPath, "Contents", "Resources", "codex") : null].filter(Boolean);
    for (const candidate of candidates) if (await pathExists(candidate)) return candidate;
    try {
      const { stdout } = await run("/usr/bin/which", ["codex"]);
      if (stdout.trim()) return stdout.trim();
    } catch {}
    return null;
  }

  async function runCodex(args) {
    const binary = await findCodexBinary();
    if (!binary) throw new Error("Codex CLI was not found. Install or update the official Codex app first.");
    return run(binary, args, { maxBuffer: 20 * 1024 * 1024 });
  }

  async function readCodexPlugins() {
    const binary = await findCodexBinary();
    if (!binary) return { available: false, installed: false, binary: null };
    try {
      const { stdout } = await run(binary, ["plugin", "list", "--json"], { maxBuffer: 20 * 1024 * 1024 });
      const result = JSON.parse(stdout);
      const plugin = result.installed?.find((item) => item.pluginId === `${PLUGIN_NAME}@${marketplaceName}`);
      const legacyPlugins = result.installed?.filter((item) => item.pluginId === `${PLUGIN_NAME}@personal`) ?? [];
      const payloadRoot = plugin?.source?.path;
      const payloadPresent = typeof payloadRoot === "string" && await pathExists(join(payloadRoot, ".codex-plugin", "plugin.json"));
      return { available: true, installed: Boolean(plugin), enabled: plugin?.enabled ?? false, payloadPresent, binary, plugin: plugin ?? null, legacyPlugins };
    } catch (error) {
      return { available: true, installed: false, binary, error: error.message };
    }
  }

  async function installCodexPlugin() {
    const pluginState = await readCodexPlugins();
    if (!pluginState.available) throw new Error("The official Codex CLI with plugin support is required.");
    if (pluginState.error) throw new Error(`Codex plugin management is unavailable: ${pluginState.error}`);
    const { stdout } = await runCodex(["plugin", "marketplace", "list", "--json"]);
    const marketplaces = JSON.parse(stdout).marketplaces ?? [];
    const registered = marketplaces.find((item) => item.name === marketplaceName);
    if (registered && registered.root !== marketplaceRoot) throw new Error(`Marketplace ${marketplaceName} is registered elsewhere. Resolve that conflict in Codex Plugins before installing.`);
    if (!registered || registered.root !== marketplaceRoot) await runCodex(["plugin", "marketplace", "add", marketplaceRoot, "--json"]);
    // Codex documents plugin add as the idempotent cache repair/update operation.
    await runCodex(["plugin", "add", `${PLUGIN_NAME}@${marketplaceName}`, "--json"]);
    return readCodexPlugins();
  }

  async function removeCodexPlugin({ removeMarketplace = false } = {}) {
    const state = await readCodexPlugins();
    if (state.error) throw new Error(`Cannot safely remove the plugin: ${state.error}`);
    if (state.available && state.installed) await runCodex(["plugin", "remove", `${PLUGIN_NAME}@${marketplaceName}`, "--json"]);
    if (removeMarketplace && state.available) {
      try {
        await runCodex(["plugin", "marketplace", "remove", marketplaceName, "--json"]);
      } catch {}
    }
    return { installed: false, marketplaceRemoved: removeMarketplace };
  }

  async function enable() {
    await checkOwnedDirectory();
    if (platform !== "darwin") throw new Error("Codex Tags currently supports macOS only.");
    if (Number(process.versions.node.split(".")[0]) < 22) throw new Error("Node.js 22 or newer is required.");
    if (!(options.findApp ?? findCodexApp)()) throw new Error("Install the official Codex desktop app before installing Tags.");
    const pluginState = await readCodexPlugins();
    if (!pluginState.available || pluginState.error) throw new Error("Install or update the official Codex app with plugin support before running install.");
    await access(join(root, "runtime", "dist", "injected.js"));
    const Database = requireFromPackage("better-sqlite3");
    const probe = new Database(":memory:");
    probe.exec("CREATE VIRTUAL TABLE check_fts USING fts5(content, tokenize='trigram')");
    probe.close();
    for (const source of runtimeFiles.keys()) await access(join(root, "runtime", "src", source));
    const installation = await installRuntime();
    const plugin = await installCodexPlugin();
    const controller = await runController("start");
    const verification = await waitForHealthyStatus();
    const health = activationHealth(verification);
    return { status: health.ok ? "enabled" : "incomplete", installation, plugin, controller, verification, health };
  }

  async function disable({ purge = false } = {}) {
    await checkOwnedDirectory();
    const supervisor = await removeLaunchSupervisor();
    let controller = null;
    if (await pathExists(installedController)) controller = await runController(purge ? "purge" : "restore");
    const plugin = await removeCodexPlugin();
    return { status: "disabled", controller, plugin, supervisor, settingsPreserved: true };
  }

  async function uninstall({ purge = false } = {}) {
    await checkOwnedDirectory();
    await checkLauncherOwnership();
    const loaderConfigPath = join(installRoot, "loader.json");
    if (await pathExists(loaderConfigPath)) {
      const config = JSON.parse(await readFile(loaderConfigPath, "utf8"));
      if (config.plugins?.some(({ id }) => id !== "codex-tags")) throw new Error("Other modules use this Loader installation. Disable Tags instead of uninstalling the shared infrastructure.");
    }
    const disabled = await disable({ purge });
    if (await pathExists(join(installRoot, "plugin-loader", "cli.mjs"))) await run(nodePath, [join(installRoot, "plugin-loader", "cli.mjs"), "stop", "--config", loaderConfigPath, "--port", String(process.env.CODEX_TAGS_CDP_PORT ?? 9341)]);
    await removeCodexPlugin({ removeMarketplace: true });
    for (const destinationName of runtimeFiles.values()) await rm(join(installRoot, destinationName), { force: true });
    await rm(sqlitePackageDestination, { recursive: true, force: true });
    for (const databaseFile of searchDatabaseFiles) await rm(join(installRoot, databaseFile), { force: true });
    await rm(join(installRoot, "install.json"), { force: true });
    await rm(daemonPaths(join(installRoot, "loader.json"), Number(process.env.CODEX_TAGS_CDP_PORT ?? 9341)).root, { recursive: true, force: true });
    await rm(join(installRoot, "loader.json"), { force: true });
    await rm(marketplaceRoot, { recursive: true, force: true });
    await rm(launcherPath, { recursive: true, force: true });
    await rm(join(installRoot, "controller.pid"), { force: true });
    await rm(join(installRoot, "controller.log"), { force: true });
    await rm(join(installRoot, "launcher.log"), { force: true });
    await rm(join(installRoot, "supervisor.log"), { force: true });
    await rm(join(installRoot, "supervisor-launchd.log"), { force: true });
    await rm(join(installRoot, "previews"), { recursive: true, force: true });
    if (purge) {
      await rm(join(codexHome, "plugins", "data", "codex-tags-cli"), { recursive: true, force: true });
      if (resolve(installRoot) === resolve(defaultInstallRoot)) await rm(installRoot, { recursive: true, force: true });
      else await rm(join(installRoot, "settings.json"), { force: true });
    }
    return { status: "uninstalled", installRoot, launcherPath, settingsPreserved: !purge, disabled };
  }

  async function status() {
    const [runtime, plugin, supervisor] = await Promise.all([runtimeStatus(), readCodexPlugins(), supervisorStatus()]);
    return { runtime, plugin, supervisor, marketplaceName };
  }

  async function waitForHealthyStatus(timeoutMs = options.healthTimeoutMs ?? 15_000) {
    const deadline = Date.now() + timeoutMs;
    let currentStatus = await status();
    while (Date.now() < deadline) {
      if (activationHealth(currentStatus).ok) return currentStatus;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
      currentStatus = await status();
    }
    return currentStatus;
  }

  async function doctor() {
    const checks = [];
    checks.push({ id: "platform", ok: platform === "darwin", value: platform, message: platform === "darwin" ? "macOS supported" : "Only macOS is currently supported" });
    checks.push({ id: "node", ok: Number(process.versions.node.split(".")[0]) >= 22, value: process.versions.node, message: "Node.js 22 or newer is required" });
    checks.push({ id: "bundle", ok: await pathExists(join(root, "runtime", "dist", "injected.js")), message: "Injected runtime bundle" });
    checks.push({ id: "sqlite", ok: await pathExists(join(sqlitePackageSource, "package.json")), message: "SQLite runtime dependency" });
    const codexBinary = await findCodexBinary();
    checks.push({ id: "codex-cli", ok: Boolean(codexBinary), value: codexBinary, message: "Official Codex CLI with plugin support" });
    const currentStatus = await status();
    checks.push({ id: "codex-plugin-api", ok: currentStatus.plugin.available && !currentStatus.plugin.error, message: "Codex plugin management API available" });
    checks.push(...runtimeHealthChecks(currentStatus));
    return { ok: checks.every((check) => check.ok), checks, status: currentStatus };
  }

  return { paths: { installRoot, launcherPath, launchAgentPath, marketplaceRoot, marketplacePluginRoot }, installRuntime, removeLaunchSupervisor, installCodexPlugin, removeCodexPlugin, runController, enable, disable, uninstall, status, doctor };
}
