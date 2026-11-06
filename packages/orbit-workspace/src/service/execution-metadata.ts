import { open, realpath, stat } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { validDirectory } from "./catalog.js";
import type { ExecutionRecord, ToolDirectoryRecord } from "../shared/model.js";
import { declaredToolDirectories } from "./tool-directories.js";

const MAX_BYTES = 8 * 1024 * 1024;
interface DesktopWorkspace { applied: string | null; pending: string | null }
interface ExecutionEvidence { turn: ExecutionRecord | null; tool: ToolDirectoryRecord | null }
export class ExecutionMetadata {
  private desktopCache: { stamp: string; states: Record<string, unknown> } | null = null;
  private readonly turns = new Map<string, { stamp: string; value: ExecutionEvidence }>();
  constructor(private readonly home: string) {}
  async desktop(id: string): Promise<DesktopWorkspace> {
    try {
      const path = join(this.home, ".codex-global-state.json"), details = await stat(path);
      if (!details.isFile() || details.size > MAX_BYTES) return { applied: null, pending: null };
      const stamp = `${details.ino}:${details.size}:${details.mtimeMs}:${details.ctimeMs}`;
      if (this.desktopCache?.stamp !== stamp) {
        const file = await open(path, "r");
        try {
          const buffer = Buffer.alloc(details.size); await file.read(buffer, 0, buffer.length, 0);
          const parsed = JSON.parse(buffer.toString("utf8"));
          const states = Object.fromEntries(Object.entries(parsed["electron-persisted-atom-state"] ?? {})
            .filter(([key]) => key.startsWith("thread-workspace-state-v1:")));
          this.desktopCache = { stamp, states };
        } finally { await file.close(); }
      }
      const state = this.desktopCache!.states[`thread-workspace-state-v1:${id}`] as { applied?: { cwd?: unknown }; pending?: { cwd?: unknown } } | undefined;
      return { applied: validDirectory(state?.applied?.cwd) ? state.applied.cwd : null, pending: validDirectory(state?.pending?.cwd) ? state.pending.cwd : null };
    } catch { return { applied: null, pending: null }; }
  }
  async records(id: string, path: string | null, signal: AbortSignal): Promise<ExecutionEvidence> {
    const empty = (): ExecutionEvidence => ({ turn: null, tool: null });
    if (!path) return empty();
    try {
      const actual = await realpath(path), home = await realpath(this.home), local = relative(home, actual);
      if (local === ".." || local.startsWith(`..${sep}`) || !["sessions", "archived_sessions"].includes(local.split(sep)[0]) || !basename(actual).endsWith(`${id}.jsonl`)) return empty();
      const file = await open(actual, "r");
      try {
        const details = await file.stat();
        if (!details.isFile()) return empty();
        const stamp = `${actual}:${details.ino}:${details.size}:${details.mtimeMs}:${details.ctimeMs}`;
        const cached = this.turns.get(id); if (cached?.stamp === stamp) return cached.value;
        let size = Math.min(details.size, 128 * 1024), value = empty();
        while (size > 0) {
          signal.throwIfAborted();
          const start = details.size - size, buffer = Buffer.alloc(size);
          const { bytesRead } = await file.read(buffer, 0, size, start);
          const lines = buffer.toString("utf8", 0, bytesRead).split("\n");
          if (start > 0) lines.shift();
          lines.pop();
          for (let index = lines.length - 1; index >= 0; index--) {
            const line = lines[index];
            if (!line.includes('"turn_context"') && !(line.includes('"response_item"') && (line.includes('"function_call"') || line.includes('"custom_tool_call"')))) continue;
            try {
              const record = JSON.parse(line);
              const recordedAt = typeof record.timestamp === "string" && record.timestamp.length <= 64 ? record.timestamp : null;
              if (!value.turn && record.type === "turn_context" && validDirectory(record.payload?.cwd)) {
                value.turn = { cwd: record.payload.cwd, recordedAt,
                  turnId: typeof record.payload.turn_id === "string" && record.payload.turn_id.length <= 128 ? record.payload.turn_id : null };
              }
              if (!value.tool && record.type === "response_item") {
                const declared = declaredToolDirectories(record.payload);
                if (declared) value.tool = { ...declared, recordedAt };
              }
              if (value.turn && value.tool) break;
            } catch { /* Concurrent writers can leave an incomplete metadata record. */ }
          }
          if (value.turn && value.tool || size >= details.size || size >= MAX_BYTES) break;
          size = Math.min(details.size, size * 2, MAX_BYTES);
        }
        if (this.turns.size >= 8) this.turns.delete(this.turns.keys().next().value!);
        this.turns.set(id, { stamp, value }); return value;
      } finally { await file.close(); }
    } catch { signal.throwIfAborted(); return empty(); }
  }
}
