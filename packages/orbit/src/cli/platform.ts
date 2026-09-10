import { createInstallationManager, resolvePluginId } from "../installation/manager.js";
import { createPresentation } from "./presentation.js";

export async function runPlatformCli(argv: string[]) {
  if (argv.includes("--config")) return false;
  const presentation = createPresentation(argv);
  argv = argv.filter(arg => !["--json", "--plain"].includes(arg));
  const [command = "--help", subcommand, argument, ...rest] = argv;
  if (["--help", "-h"].includes(command)) {
    presentation.help();
    return true;
  }
  if (
    !["install", "start", "status", "doctor", "update", "rollback", "migrate", "plugin", "uninstall"].includes(
      command,
    )
  )
    return false;
  const manager = createInstallationManager();
  let result: unknown;
  const operation = command === "plugin" ? `plugin ${subcommand ?? ""}` : command;
  const labels: Record<string, string> = {
    install: "Setting up the Orbit platform", start: "Starting Orbit", doctor: "Checking your installation",
    status: "Reading platform status", update: "Updating Orbit", rollback: "Restoring runtime",
    uninstall: argv.includes("--dry-run") ? "Planning removal (no files deleted)" : "Uninstalling Orbit",
    "plugin install": "Downloading and registering plugin", "plugin add": "Registering local plugin",
  };
  presentation.begin(labels[operation] ?? `Running ${operation}`);
  try {
    if (command === "uninstall") {
      const flags = argv.slice(1);
      if (new Set(flags).size !== flags.length || flags.some(flag => !["--purge", "--dry-run", "--yes"].includes(flag)) || (flags.includes("--dry-run") && flags.includes("--yes")))
        throw new Error("Usage: orbit uninstall [--purge] [--dry-run | --yes]");
      if (!flags.includes("--dry-run") && !flags.includes("--yes")) throw new Error("Preview with orbit uninstall --dry-run; confirm removal with --yes");
      result = await manager.uninstall({ purge: flags.includes("--purge"), dryRun: flags.includes("--dry-run") });
    } else if (command === "migrate") {
      if (!subcommand || argument || rest.length)
        throw new Error("Usage: orbit migrate <legacy-directory>");
      result = await manager.migrateLegacy(subcommand);
    } else if (command !== "plugin") {
      if (argv.length > 1)
        throw new Error(
          "Unexpected platform command arguments; use ORBIT_HOME to select an installation",
        );
      if (command === "install") result = await manager.install();
      else if (command === "start") result = await manager.start();
      else if (command === "update") result = await manager.updatePackage();
      else if (command === "rollback") result = await manager.rollback();
      else result = command === "doctor" ? await manager.doctor() : await manager.status();
    } else {
      if (
        !subcommand ||
        !["add", "install", "list", "enable", "disable", "uninstall", "update"].includes(subcommand)
      )
        throw new Error("Unknown plugin command");
      if (subcommand === "list") {
        if (argument || rest.length) throw new Error("Unexpected plugin list arguments");
        result = (await manager.status()).plugins ?? [];
      } else {
        if (
          !argument ||
          argument.startsWith("--") ||
          (rest.length && !(subcommand === "uninstall" && rest.length === 1 && rest[0] === "--purge"))
        )
          throw new Error("Invalid plugin arguments");
        if (subcommand === "add") result = await manager.addPlugin(argument);
        else if (subcommand === "install") result = await manager.installPackage(argument);
        else if (subcommand === "enable" || subcommand === "disable")
          result = await manager.setEnabled(argument, subcommand === "enable");
        else if (subcommand === "uninstall")
          result = await manager.uninstallPlugin(argument, rest.includes("--purge"));
        else {
          const config = await manager.read();
          const id = resolvePluginId(config, argument);
          const plugin = config.orbit.packages[id];
          if (!plugin) throw new Error(`Unknown plugin ${argument}`);
          result = await manager.installPackage(`${plugin.packageName}@latest`, id);
        }
      }
    }
    presentation.result(operation, result);
    return true;
  } finally {
    presentation.stop();
  }
}
