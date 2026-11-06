import { realpath, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { normalize, sep } from "node:path";
import { WorkspaceCatalog } from "./catalog.js";
import { ExecutionMetadata } from "./execution-metadata.js";
import { readGit } from "./git.js";
import { SESSION_ID } from "../shared/model.js";
import type { WorkspaceResult } from "../shared/model.js";

export class WorkspaceRepository {
  private readonly catalog: WorkspaceCatalog;
  private readonly execution: ExecutionMetadata;
  constructor(home: string) { this.catalog = new WorkspaceCatalog(home); this.execution = new ExecutionMetadata(home); }
  async read(id: string, signal: AbortSignal): Promise<WorkspaceResult> {
    if (!SESSION_ID.test(id)) throw new Error("Invalid session ID");
    id = id.toLowerCase();
    try {
      signal.throwIfAborted();
      const metadata = await this.catalog.read(id);
      if (!metadata) return { status: "missing" };
      const [desktop, evidence] = await Promise.all([this.execution.desktop(id), this.execution.records(id, metadata.rollout, signal)]);
      const lastExecution = evidence.turn;
      const selected = desktop.applied ?? lastExecution?.cwd ?? metadata.directory;
      const source = desktop.applied ? "applied" : lastExecution ? "turn" : "catalog";
      let directory: string;
      try {
        directory = await realpath(selected);
        if (!(await stat(directory)).isDirectory()) return { status: "directory-missing" };
      } catch { return { status: "directory-missing" }; }
      const git = await readGit(directory, signal); signal.throwIfAborted();
      let disagreement = false;
      if (desktop.applied && lastExecution) {
        const executed = await realpath(lastExecution.cwd).catch(() => normalize(lastExecution.cwd));
        disagreement = executed !== directory;
      }
      const toolActivity = evidence.tool ? { recordedAt: evidence.tool.recordedAt, tool: evidence.tool.tool, ...(evidence.tool.unresolved ? { unresolved: true } : {}),
        directories: await Promise.all(evidence.tool.directories.map(async path => {
          const actual = await realpath(path).catch(() => normalize(path));
          return { directory: actual, git: actual === directory ? git : await readGit(actual, signal) };
        })) } : null;
      signal.throwIfAborted();
      const home = homedir(), displayDirectory = directory.startsWith(`${home}${sep}`) ? `~${directory.slice(home.length)}` : directory;
      return { status: "ready", snapshot: { sessionId: id, directory, displayDirectory, source, registeredDirectory: metadata.directory,
        lastExecution, appliedDirectory: desktop.applied, pendingDirectory: desktop.pending, disagreement, toolActivity, git, checkedAt: Date.now() } };
    } catch { signal.throwIfAborted(); return { status: "unavailable" }; }
  }
}
