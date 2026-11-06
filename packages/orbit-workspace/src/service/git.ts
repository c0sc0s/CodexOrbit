import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitState } from "../shared/model.js";

const run = promisify(execFile);
export async function readGit(directory: string, signal: AbortSignal): Promise<GitState> {
  const env = { ...process.env, GIT_OPTIONAL_LOCKS: "0", LC_ALL: "C" };
  for (const key of Object.keys(env)) if (key.startsWith("GIT_") && key !== "GIT_OPTIONAL_LOCKS") delete env[key as keyof typeof env];
  const git = async (args: string[]) => (await run("git", ["--no-optional-locks", "-C", directory, ...args], { env, signal, timeout: 3000, maxBuffer: 32 * 1024, encoding: "utf8" })).stdout.trim();
  try {
    const [root, gitDirectory, common] = (await git(["rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir"])).split("\n");
    if (!root || !gitDirectory || !common) return { status: "unavailable" };
    const branch = await git(["symbolic-ref", "--quiet", "--short", "HEAD"]).catch(error => {
      if (error.code === 1) return null;
      throw error;
    });
    const commit = await git(["rev-parse", "--verify", "HEAD"]).catch(error => {
      if (error.code === 128 && branch) return null;
      throw error;
    });
    return { status: "ready", root, branch, commit, worktree: gitDirectory !== common };
  } catch (error) {
    signal.throwIfAborted();
    const failure = error as { code?: unknown; stderr?: string };
    return { status: failure.code === 128 && failure.stderr?.includes("not a git repository") ? "not-git" : "unavailable" };
  }
}
