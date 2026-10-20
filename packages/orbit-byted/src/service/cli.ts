import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, isAbsolute, join, delimiter } from "node:path";
import { homedir } from "node:os";
import { promisify } from "node:util";
import { record } from "../shared/feed.js";
import type { FailureCode } from "../shared/feed.js";

export class FeedFailure extends Error {
  constructor(readonly code: FailureCode) { super(code); }
}
export type CliQuery = (args: readonly string[], signal: AbortSignal) => Promise<unknown>;
const run = promisify(execFile);

async function executable(config: Record<string, unknown>): Promise<string> {
  if (config.cliPath !== undefined && (typeof config.cliPath !== "string" || !isAbsolute(config.cliPath))) throw new FeedFailure("cli-missing");
  const paths = typeof config.cliPath === "string" ? [config.cliPath] :
    [...new Set([dirname(process.execPath), ...(process.env.PATH ?? "").split(delimiter).filter(isAbsolute), "/opt/homebrew/bin", "/usr/local/bin", join(homedir(), ".local/bin")])].map(path => join(path, "bytedcli"));
  for (const path of paths) {
    try { await access(path, constants.X_OK); return path; } catch { /* A GUI launch may have a smaller PATH than the terminal. */ }
  }
  throw new FeedFailure("cli-missing");
}
export function classifyCliError(error: unknown): FeedFailure {
  let description = "";
  try { description = JSON.stringify(error).slice(0, 20000); } catch { /* Unstructured failures become a connection error. */ }
  if (/unauth|not.?auth|not.?logged|no local token|login.required|token.*expir|未登录|登录.*过期|AUTH_REQUIRED/iu.test(description)) return new FeedFailure("auth");
  if (/forbidden|permission|access.denied|权限|403/iu.test(description)) return new FeedFailure("permission");
  return new FeedFailure("network");
}
export function parseCliOutput(output: string): unknown {
  let envelope: Record<string, unknown>;
  try { envelope = record(JSON.parse(output)); } catch { throw new FeedFailure("data"); }
  if (envelope.error || envelope.status !== undefined && envelope.status !== "success") throw classifyCliError(envelope.error ?? envelope);
  if (!("data" in envelope) || envelope.data === null) throw new FeedFailure("data");
  return envelope.data;
}
export function createCliQuery(config: Record<string, unknown>): CliQuery {
  return async (args, signal) => {
    const path = await executable(config);
    let output: string;
    try {
      output = (await run(path, ["--no-auto-upgrade", "--json", ...args], {
        signal, timeout: 45000, maxBuffer: 8 * 1024 * 1024, windowsHide: true,
        env: { ...process.env, BYTEDCLI_NO_AUTO_UPGRADE: "1" },
      })).stdout;
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      const failure = error as { code?: string; stdout?: string };
      if (failure.code === "ENOENT") throw new FeedFailure("cli-missing");
      if (failure.stdout?.trim()) parseCliOutput(failure.stdout);
      throw new FeedFailure("network");
    }
    return parseCliOutput(output);
  };
}
