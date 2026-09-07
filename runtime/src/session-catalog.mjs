import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";

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
      const rows = database.prepare(`SELECT id AS threadId, ${title} AS raw, ${time} AS updatedAt, ${project} AS projectId, ${pinned} AS pinned FROM threads WHERE archived = 0 ORDER BY ${time} DESC, id`).all();
      return { items: rows.map((row) => ({ ...row, pinned: row.pinned === null ? null : Boolean(row.pinned) })), error: null, complete: true };
    } catch {
      return { items: [], error: "Local session catalog could not be read; sidebar-only results are available", complete: false };
    } finally {
      database?.close();
    }
  }
}
