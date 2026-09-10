const commands = ["start", "apply", "watch", "status", "remove", "stop"] as const;
type Command = typeof commands[number] | "--help";

export function parseArguments(argv: string[]) {
  const [command = "--help", ...args] = argv;
  const options: Record<string, string | undefined> = {};
  if (command === "--help") return { command, options } as const;
  if (!commands.some(value => value === command)) throw new Error("Unknown loader command");
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (!["--config", "--port", "--token", "--attach", "--plugin"].includes(key) || options[key] !== undefined) throw new Error("Invalid loader options");
    if (key === "--attach") options[key] = "true";
    else {
      if (!args[i + 1] || args[i + 1].startsWith("--")) throw new Error(`Missing ${key} value`);
      options[key] = args[++i];
    }
  }
  if (!options["--config"] || (options["--token"] && command !== "watch") || (options["--attach"] && command !== "start") || (options["--plugin"] && command !== "remove")) throw new Error("Invalid options for Loader command; --config is required");
  const port = Number(options["--port"] ?? 9341);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Port must be an integer between 1 and 65535");
  const validated: Record<string, string | undefined> & { "--config": string } = { ...options, "--config": options["--config"] };
  return { command: command as Exclude<Command, "--help">, options: validated };
}
