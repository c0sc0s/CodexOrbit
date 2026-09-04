#!/usr/bin/env node
import { execFile } from "node:child_process";
import { access, chmod, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeSource = join(pluginRoot, "runtime", "src");
const installRoot = process.env.CODEX_TAGS_INSTALL_DIR
  ?? join(homedir(), "Library", "Application Support", "Codex Sidebar Tags");
const applicationsRoot = process.env.CODEX_TAGS_APPLICATIONS_DIR ?? join(homedir(), "Applications");
const launcherPath = join(applicationsRoot, "Codex Tags.app");
const installedController = join(installRoot, "app.mjs");
const runtimeFiles = new Map([
  ["controller.mjs", "app.mjs"],
  ["controller-state.mjs", "controller-state.mjs"],
  ["content-index.mjs", "content-index.mjs"],
  ["inject-expression.mjs", "inject-expression.mjs"],
  ["title-format.mjs", "title-format.mjs"],
]);

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function copyFileAtomically(source, destination) {
  const temporaryPath = `${destination}.next-${process.pid}`;
  await copyFile(source, temporaryPath);
  await chmod(temporaryPath, 0o644);
  await rename(temporaryPath, destination);
}

async function readPluginVersion() {
  const manifest = JSON.parse(await readFile(join(pluginRoot, ".codex-plugin", "plugin.json"), "utf8"));
  return manifest.version;
}

async function createLauncher() {
  if (process.platform !== "darwin") return null;
  await mkdir(applicationsRoot, { recursive: true });
  const sourcePath = join(installRoot, `.launcher-${process.pid}.applescript`);
  const nextLauncherPath = join(applicationsRoot, `.Codex Tags-${process.pid}.app`);
  const logPath = join(installRoot, "launcher.log");
  const quoteAppleScript = (value) => value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const script = [
    "on run",
    `  set nodePath to "${quoteAppleScript(process.execPath)}"`,
    `  set toolPath to "${quoteAppleScript(installedController)}"`,
    `  set logPath to "${quoteAppleScript(logPath)}"`,
    '  do shell script "nohup " & quoted form of nodePath & " " & quoted form of toolPath & " start >> " & quoted form of logPath & " 2>&1 </dev/null &"',
    "end run",
    "",
  ].join("\n");
  await writeFile(sourcePath, script, { encoding: "utf8", mode: 0o600 });
  try {
    await rm(nextLauncherPath, { recursive: true, force: true });
    await run("/usr/bin/osacompile", ["-o", nextLauncherPath, sourcePath]);
    await rm(launcherPath, { recursive: true, force: true });
    await rename(nextLauncherPath, launcherPath);
  } finally {
    await rm(sourcePath, { force: true });
    await rm(nextLauncherPath, { recursive: true, force: true });
  }
  return launcherPath;
}

async function install() {
  await mkdir(installRoot, { recursive: true });
  for (const [sourceName, destinationName] of runtimeFiles) {
    await copyFileAtomically(join(runtimeSource, sourceName), join(installRoot, destinationName));
  }
  const pluginVersion = await readPluginVersion();
  const installation = {
    schemaVersion: 1,
    pluginVersion,
    installedAt: new Date().toISOString(),
    pluginRoot,
    runtimeFiles: [...runtimeFiles.values()],
  };
  await writeFile(join(installRoot, "install.json"), `${JSON.stringify(installation, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  const launcher = await createLauncher();
  return { status: "installed", pluginVersion, installRoot, launcher };
}

async function runController(command) {
  if (!(await pathExists(installedController))) throw new Error("Codex Tags is not installed. Run the install command first.");
  const { stdout, stderr } = await run(process.execPath, [installedController, command], { maxBuffer: 20 * 1024 * 1024 });
  if (stderr.trim()) process.stderr.write(stderr);
  if (stdout.trim()) process.stdout.write(stdout);
}

async function status() {
  const installed = await pathExists(installedController);
  if (!installed) {
    console.log(JSON.stringify({ installed: false, pluginRoot, installRoot }, null, 2));
    return;
  }
  await runController("status");
}

async function uninstall() {
  if (await pathExists(installedController)) {
    try {
      await runController("restore");
    } catch (error) {
      console.error(`Restore warning: ${error.message}`);
    }
  }
  for (const destinationName of runtimeFiles.values()) await rm(join(installRoot, destinationName), { force: true });
  await rm(join(installRoot, "install.json"), { force: true });
  await rm(launcherPath, { recursive: true, force: true });
  console.log(JSON.stringify({ status: "uninstalled", installRoot, launcherPath }, null, 2));
}

const command = process.argv[2] ?? "status";
if (command === "install") console.log(JSON.stringify(await install(), null, 2));
else if (command === "status") await status();
else if (command === "enable") { await install(); await runController("start"); }
else if (command === "apply") await runController("apply");
else if (command === "restore") await runController("restore");
else if (command === "uninstall") await uninstall();
else throw new Error(`Unknown command: ${basename(command)}`);
