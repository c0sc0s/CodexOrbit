export const helpSections = [
  { title: "GET STARTED", commands: [
    ["install", "Set up Orbit and its launcher"],
    ["plugin install <package>", "Add a capability from npm"],
    ["start", "Launch Codex through Orbit"],
  ] },
  { title: "PLATFORM", commands: [
    ["status", "View installation and runtime"],
    ["doctor", "Check installation health"],
    ["update", "Install the latest runtime"],
    ["rollback", "Restore the previous runtime"],
    ["uninstall --dry-run", "Preview removal without changes"],
    ["uninstall --yes [--purge]", "Remove Orbit; optionally delete data"],
    ["migrate <directory>", "Register a legacy installation"],
  ] },
  { title: "PLUGINS", commands: [
    ["plugin list", "List installed capabilities"],
    ["plugin add <directory>", "Install a built local plugin"],
    ["plugin enable <id>", "Enable a plugin"],
    ["plugin disable <id>", "Disable without deleting data"],
    ["plugin update <id>", "Update a plugin"],
    ["plugin uninstall <id>", "Remove a plugin; keep its data"],
    ["  --purge", "Also delete owned plugin data"],
  ] },
  { title: "OUTPUT", commands: [
    ["--json", "Structured output for scripts"],
    ["--plain", "No color or animation"],
  ] },
] as const;
