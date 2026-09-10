import { performance } from "node:perf_hooks";
import ora, { type Ora } from "ora";
import pc from "picocolors";
import figlet from "figlet";
import { helpSections } from "./help.js";

export interface TerminalOutput extends NodeJS.WritableStream {
  isTTY?: boolean;
  columns?: number;
}

const clean = (value: unknown) => String(value).replace(/[\x00-\x1f\x7f-\x9f]/gu, " ");
const object = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" ? value as Record<string, unknown> : {};

export function createPresentation(
  flags: string[],
  output: TerminalOutput = process.stdout,
  progress: TerminalOutput = process.stderr,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (flags.includes("--json") && flags.includes("--plain")) throw new Error("Choose --json or --plain, not both");
  const json = flags.includes("--json") || (!output.isTTY && !flags.includes("--plain"));
  const color = !json && !flags.includes("--plain") && output.isTTY && !Object.hasOwn(env, "NO_COLOR") && env.TERM !== "dumb";
  const colors = pc.createColors(Boolean(color));
  const tint = colors.cyan;
  const line = (text = "") => output.write(`${text}\n`);
  let spinner: Ora | undefined;
  let started = 0;

  function stop() {
    spinner?.stop();
    spinner = undefined;
  }
  function banner() {
    if (json) return;
    line();
    const width = output.columns ?? 80;
    const font = width >= 42 && env.TERM !== "dumb" ? "ANSI Shadow" : "Small";
    const artwork = figlet.textSync("ORBIT", { font }).trimEnd().split("\n").map(row => row.trimEnd());
    if (Math.max(...artwork.map(row => row.length)) + 4 < width) {
      artwork.forEach((row, index) => line(`  ${index < 3 ? colors.bold(tint(row)) : colors.blue(row)}`));
    } else line(`  ${colors.bold(tint("ORBIT"))}`);
    line();
    line(`  ${colors.dim("Your Codex. Extended.")}`);
    line();
  }
  function help() {
    if (flags.includes("--json")) {
      line(JSON.stringify({ name: "Orbit", sections: helpSections }, null, 2));
      return;
    }
    banner();
    for (const section of helpSections) {
      line(`  ${colors.bold(section.title)}`);
      for (const [command, description] of section.commands) {
        if ((output.columns ?? 80) >= 76) line(`  ${tint(command.padEnd(29))}${colors.dim(description)}`);
        else {
          line(`  ${tint(command)}`);
          line(`    ${colors.dim(description)}`);
        }
      }
      line();
    }
    line(colors.dim("  Pipes default to JSON. NO_COLOR disables effects."));
    line(colors.dim("  Advanced loader: orbit --help --config <file>"));
    line();
  }
  function begin(label: string) {
    if (json) return;
    banner();
    started = performance.now();
    if (flags.includes("--plain") || !progress.isTTY || env.CI || env.TERM === "dumb" || Object.hasOwn(env, "NO_COLOR")) {
      line(`  > ${clean(label)}`);
      return;
    }
    spinner = ora({
      text: clean(label), stream: progress, indent: 2,
      color: color ? "cyan" : false, isEnabled: true,
      // Progress must not consume keystrokes or alter the caller's cursor visibility.
      discardStdin: false, hideCursor: false,
    }).start();
  }
  function result(command: string, value: unknown) {
    stop();
    if (json) { line(JSON.stringify(value, null, 2)); return; }
    const data = object(value);
    const duration = ((performance.now() - started) / 1000).toFixed(1);
    line(`  ${data.ok === false ? colors.yellow("! Needs attention") : colors.green("Done")} ${colors.dim(`· ${duration}s`)}`);
    line();
    if (command === "plugin list") {
      const plugins = Array.isArray(value) ? value : [];
      if (!plugins.length) line("  No plugins installed.");
      for (const item of plugins) {
        const plugin = object(item);
        line(`  ${plugin.enabled === false ? "[off]" : "[on] "} ${clean(plugin.id)}  ${clean(plugin.version ?? "")}`);
      }
    } else if (command === "doctor") {
      for (const item of Array.isArray(data.checks) ? data.checks : []) {
        const check = object(item);
        line(`  ${check.ok ? colors.green("[ok]") : colors.red("[!!]")} ${clean(check.id)}`);
      }
      if (data.ok === false) line("\n  Inspect full details: orbit doctor --json");
    } else if (command === "status") {
      line(`  Platform  ${data.installed ? "Installed" : "Not installed"}`);
      if (data.installed) {
        line(`  Runtime   ${clean(object(data.runtime).version ?? "unknown")}`);
        const daemon = object(data.daemon);
        line(`  Daemon    ${daemon.conflict ? "Ownership conflict" : daemon.running ? "Running" : "Stopped"}`);
        line(`  Plugins   ${Array.isArray(data.plugins) ? data.plugins.length : 0}`);
      }
      line(`  Location  ${clean(data.root ?? "")}`);
    } else {
      const labels: Record<string, string> = {
        status: "Result", id: "Plugin", version: "Version", root: "Location", launcherPath: "Launcher",
        settingsPreserved: "Settings retained", cliPreserved: "Global CLI retained",
      };
      for (const [key, label] of Object.entries(labels)) {
        if (data[key] !== undefined) line(`  ${label.padEnd(20)} ${clean(data[key])}`);
      }
      for (const key of ["remove", "preserved", "remaining"]) {
        if (Array.isArray(data[key]) && data[key].length) {
          line(`\n  ${key === "remove" ? "Removal targets" : key === "preserved" ? "Preserved (not deleted)" : "Remaining files"}`);
          for (const path of data[key]) line(`    ${clean(path)}`);
        }
      }
      if (command === "start") line("  Launch requested. Check readiness with orbit doctor.");
    }
    if (command === "install") {
      line("\n  Platform ready. Plugins are optional.");
      line("  Next: orbit plugin install <package>");
      line("        orbit start");
      line(`  Open ${clean(data.launcherPath ?? "Orbit.app")} for future launches.`);
    } else if (command === "plugin install" || command === "plugin add") {
      line("\n  Next: orbit start");
      line("  Review plugin trust and hooks in Codex settings.");
    } else if (command === "plugin list" && Array.isArray(value) && !value.length) {
      line("\n  Add a capability: orbit plugin install <package>");
    }
    line();
  }
  return { json, begin, stop, banner, help, result };
}
