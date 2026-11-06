import { readdir } from "node:fs/promises";
import { join, isAbsolute } from "node:path";
import Database from "better-sqlite3";

export function validDirectory(value: unknown): value is string {
  return typeof value === "string" && isAbsolute(value) && value.length <= 8192 && !value.includes("\0");
}
export class WorkspaceCatalog {
  constructor(private readonly home: string) {}
  async read(sessionId: string) {
    const files = (await readdir(this.home)).filter(name => /^state_\d+\.sqlite$/u.test(name))
      .sort((a, b) => Number(b.match(/\d+/u)![0]) - Number(a.match(/\d+/u)![0]));
    if (!files[0]) return null;
    const database = new Database(join(this.home, files[0]), { readonly: true, fileMustExist: true, timeout: 500 });
    try {
      const columns = new Set((database.pragma("table_info(threads)") as Array<{ name: string }>).map(column => column.name));
      if (!["id", "cwd"].every(column => columns.has(column))) throw new Error("Unsupported workspace metadata");
      const rollout = columns.has("rollout_path") ? "rollout_path" : "NULL";
      const row = database.prepare<[string], { cwd: string; rollout: string | null }>(`SELECT cwd, ${rollout} AS rollout FROM threads WHERE id = ?`).get(sessionId);
      return row && validDirectory(row.cwd) ? { directory: row.cwd, rollout: typeof row.rollout === "string" ? row.rollout : null } : null;
    } finally { database.close(); }
  }
}
