import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

function isInternalSession({ source, threadSource }) {
  if (threadSource === "subagent" || threadSource === "guardian_review") return true;
  if (source === "subagent") return true;
  try {
    const parsed = JSON.parse(source);
    return parsed === "subagent" || (parsed !== null && typeof parsed === "object" && Object.hasOwn(parsed, "subagent"));
  } catch {
    return false;
  }
}

// Keep the private Codex database schema isolated and always open it read-only.
export class SessionCatalog {
  constructor(root = process.env.CODEX_HOME ?? join(homedir(), ".codex")) {
    this.root = root;
  }

  async read() {
    let database;
    try {
      const files = (await readdir(this.root)).filter((name) => /^state_\d+\.sqlite$/u.test(name))
        .sort((a, b) => Number(b.match(/\d+/u)[0]) - Number(a.match(/\d+/u)[0]));
      if (!files.length) return { items: [], error: "Local session catalog is unavailable", complete: false };
      database = new Database(join(this.root, files[0]), { readonly: true, fileMustExist: true, timeout: 1000 });
      const columns = new Set(database.pragma("table_info(threads)").map(({ name }) => name));
      for (const column of ["id", "title", "updated_at", "archived"]) {
        if (!columns.has(column)) throw new Error("Unsupported Codex session catalog schema");
      }
      const title = columns.has("name") ? "COALESCE(NULLIF(name, ''), title)" : "title";
      const time = columns.has("updated_at_ms") ? "COALESCE(updated_at_ms, updated_at * 1000)" : "updated_at * 1000";
      const project = columns.has("project_id") ? "project_id" : "NULL";
      const pinned = columns.has("is_pinned") ? "is_pinned" : "NULL";
      const source = columns.has("source") ? "source" : "NULL";
      const threadSource = columns.has("thread_source") ? "thread_source" : "NULL";
      const rows = database.prepare(`SELECT id AS threadId, ${title} AS raw, ${time} AS updatedAt, ${project} AS projectId, ${pinned} AS pinned, ${source} AS source, ${threadSource} AS threadSource FROM threads WHERE archived = 0 ORDER BY ${time} DESC, id`).all();
      // Older builds encode child provenance in source; newer builds also expose thread_source.
      const items = rows.filter((row) => !isInternalSession(row)).map(({ source: _source, threadSource: _threadSource, ...row }) => ({
        ...row, pinned: row.pinned === null ? null : Boolean(row.pinned),
      }));
      return { items, error: null, complete: true };
    } catch {
      return { items: [], error: "Local session catalog could not be read; sidebar-only results are available", complete: false };
    } finally {
      database?.close();
    }
  }
}
