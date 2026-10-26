import { createReadStream } from "node:fs";
import { opendir, realpath, stat } from "node:fs/promises";
import { basename, join, relative, sep } from "node:path";
import { SESSION_ID } from "../shared/model.js";
import type { ContextResult } from "../shared/model.js";
import { ContextAnalyzer } from "./analyzer.js";

const MAX_FILE = 128 * 1024 * 1024, MAX_LINE = 4 * 1024 * 1024;
export class ContextRepository {
  private files = new Map<string, string>();
  private scannedAt = 0;
  private discovery: Promise<void> | null = null;
  private cache = new Map<string, { stamp: string; result: ContextResult }>();
  constructor(private readonly home: string) {}

  private async discover(signal: AbortSignal): Promise<void> {
    if (Date.now() - this.scannedAt < 30_000) return;
    if (this.discovery) return this.discovery;
    this.discovery = (async () => {
      const files = new Map<string, string>();
      let visited = 0;
      const walk = async (path: string, depth: number): Promise<void> => {
        if (depth > 5) return;
        let directory;
        try { directory = await opendir(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
        for await (const entry of directory) {
          signal.throwIfAborted();
          if (++visited > 100_000) throw new Error("Session catalog limit reached");
          if (entry.isDirectory()) await walk(join(path, entry.name), depth + 1);
          else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
            const id = basename(entry.name, ".jsonl").slice(-36).toLowerCase();
            if (SESSION_ID.test(id)) files.set(id, join(path, entry.name));
          }
        }
      };
      // Active sessions take precedence over an archived copy.
      await walk(join(this.home, "archived_sessions"), 0); await walk(join(this.home, "sessions"), 0);
      this.files = files; this.scannedAt = Date.now();
    })();
    try { await this.discovery; } finally { this.discovery = null; }
  }
  async read(sessionId: string, signal: AbortSignal): Promise<ContextResult> {
    if (!SESSION_ID.test(sessionId)) throw new Error("Invalid session ID");
    sessionId = sessionId.toLowerCase();
    try {
      await this.discover(signal); signal.throwIfAborted();
      const path = this.files.get(sessionId);
      if (!path) return { status: "missing" };
      const actual = await realpath(path), home = await realpath(this.home), local = relative(home, actual);
      if (local.startsWith(`..${sep}`) || local === ".." || !["sessions", "archived_sessions"].includes(local.split(sep)[0])) return { status: "unavailable" };
      const details = await stat(actual);
      if (!details.isFile()) return { status: "unavailable" };
      if (details.size > MAX_FILE) return { status: "too-large" };
      const stamp = `${actual}:${details.ino}:${details.size}:${details.mtimeMs}:${details.ctimeMs}`;
      const cached = this.cache.get(sessionId);
      if (cached?.stamp === stamp) return cached.result;
      const analyzer = new ContextAnalyzer();
      let pending = "", skipping = false;
      if (details.size) {
        const stream = createReadStream(actual, { encoding: "utf8", highWaterMark: 64 * 1024, end: details.size - 1, signal });
        for await (const chunk of stream) {
          signal.throwIfAborted();
          for (const [index, segment] of String(chunk).split("\n").entries()) {
            if (index > 0) {
              if (!skipping && pending.trim()) { try { analyzer.accept(JSON.parse(pending)); } catch { analyzer.markPartial(); } }
              pending = ""; skipping = false;
            }
            if (!skipping) {
              if (pending.length + segment.length > MAX_LINE) { pending = ""; skipping = true; analyzer.markPartial(); }
              else pending += segment;
            }
          }
        }
        // A writer may still be appending the last record; consume it only after its newline.
        if (pending || skipping) analyzer.markPartial();
      }
      const result: ContextResult = { status: "ready", snapshot: analyzer.snapshot(sessionId) };
      if (this.cache.size >= 8) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(sessionId, { stamp, result });
      return result;
    } catch (error) {
      signal.throwIfAborted();
      if ((error as NodeJS.ErrnoException).code === "ENOENT") { this.scannedAt = 0; return { status: "missing" }; }
      return { status: "unavailable" };
    }
  }
}
