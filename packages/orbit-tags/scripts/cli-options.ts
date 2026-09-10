const commands = new Set(["install", "enable", "on", "disable", "off", "restore", "status", "doctor", "update", "uninstall", "help", "version"]);
const flags = new Set(["--json", "--purge", "--help", "-h", "--version", "-v"]);

export function parseCliOptions(args: string[]) {
  for (const argument of args) {
    if (argument.startsWith("-") && !flags.has(argument)) throw new Error(`Unknown option: ${argument}`);
  }
  const positional = args.filter((argument) => !argument.startsWith("-"));
  if (positional.length > 1) throw new Error("Expected one command. Run orbit-tags --help for usage.");
  const command = args.some((argument) => ["--help", "-h"].includes(argument)) ? "help"
    : args.some((argument) => ["--version", "-v"].includes(argument)) ? "version"
      : positional[0] ?? "install";
  if (!commands.has(command)) throw new Error(`Unknown command: ${command}`);
  const purge = args.includes("--purge");
  if (purge && command !== "uninstall") throw new Error("--purge is only supported with uninstall.");
  return { command, purge, json: args.includes("--json") };
}
