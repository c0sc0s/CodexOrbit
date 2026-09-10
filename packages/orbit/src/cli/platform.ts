import { createInstallationManager, resolvePluginId } from "../installation/manager.js";

export async function runPlatformCli(argv: string[]) {
  if (argv.includes("--config")) return false;
  const [command = "--help", subcommand, argument, ...rest] = argv;
  if (["--help", "-h"].includes(command)) {
    console.log(
      "Orbit platform\n  install | start | status | doctor | update | rollback\n  plugin add <built-directory> | install <package> | list\n  plugin enable <id> | disable <id> | uninstall <id> [--purge] | update <id>\nAdvanced Loader: start|apply|watch|status|remove|stop --config <local.json>",
    );
    return true;
  }
  if (
    !["install", "start", "status", "doctor", "update", "rollback", "migrate", "plugin"].includes(
      command,
    )
  )
    return false;
  const manager = createInstallationManager();
  let result: unknown;
  if (command === "migrate") {
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
  console.log(JSON.stringify(result, null, 2));
  return true;
}
