import { chmodSync, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import Database from "better-sqlite3";

import { discoverSessionFiles, extractConversationText } from "./content-index.mjs";

const defaultResultLimit = 50;
const maximumResultLimit = 100;

function localThreadIdFor(threadId) {
  return threadId.includes(":") ? threadId.slice(threadId.lastIndexOf(":") + 1) : threadId;
}

function quotedFtsQuery(query) {
  return `"${query.replaceAll('"', '""')}"`;
}

function buildSnippet(text, query) {
  const normalized = text.replace(/\s+/gu, " ");
  const matchIndex = normalized.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
  if (matchIndex === -1) return normalized.slice(0, 132);
  const start = Math.max(0, matchIndex - 46);
  const end = Math.min(normalized.length, matchIndex + query.length + 82);
  return `${start > 0 ? "…" : ""}${normalized.slice(start, end)}${end < normalized.length ? "…" : ""}`;
}

export class SessionSearchIndex {
  constructor(databasePath, options = {}) {
    this.discoverFiles = options.discoverFiles ?? (() => discoverSessionFiles(true));
    this.readOnly = options.readOnly === true;
    this.database = new Database(databasePath, {
      readonly: this.readOnly,
      fileMustExist: this.readOnly,
      timeout: 5000,
    });
    if (!this.readOnly) this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS indexed_sessions (
        thread_id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        modified_at REAL NOT NULL
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS session_messages USING fts5(
        thread_id UNINDEXED,
        role UNINDEXED,
        content,
        tokenize = 'trigram'
      );
    `);
    if (!this.readOnly) {
      for (const path of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`]) {
        if (existsSync(path)) chmodSync(path, 0o600);
      }
    }
    this.selectIndexedSessions = this.database.prepare("SELECT thread_id, file_path, file_size, modified_at FROM indexed_sessions");
    if (this.readOnly) return;
    this.deleteMessages = this.database.prepare("DELETE FROM session_messages WHERE thread_id = ?");
    this.deleteSession = this.database.prepare("DELETE FROM indexed_sessions WHERE thread_id = ?");
    this.insertMessage = this.database.prepare("INSERT INTO session_messages(thread_id, role, content) VALUES (?, ?, ?)");
    this.upsertSession = this.database.prepare(`
      INSERT INTO indexed_sessions(thread_id, file_path, file_size, modified_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(thread_id) DO UPDATE SET
        file_path = excluded.file_path,
        file_size = excluded.file_size,
        modified_at = excluded.modified_at
    `);
    this.searchFts = this.database.prepare(`
      SELECT thread_id, role, content, bm25(session_messages) AS rank
      FROM session_messages
      WHERE session_messages MATCH ?
        AND thread_id IN (SELECT value FROM json_each(?))
      ORDER BY rank
      LIMIT ?
    `);
    this.searchShortQuery = this.database.prepare(`
      SELECT thread_id, role, content, 0 AS rank
      FROM session_messages
      WHERE instr(lower(content), lower(?)) > 0
        AND thread_id IN (SELECT value FROM json_each(?))
      LIMIT ?
    `);
  }

  async refresh(onProgress = () => {}) {
    if (this.readOnly) throw new Error("Cannot refresh a read-only search index");
    const files = await this.discoverFiles();
    const indexed = new Map(this.selectIndexedSessions.all().map((row) => [row.thread_id, row]));
    const entries = [...files.entries()];
    let completed = 0;
    let changed = 0;
    onProgress({ phase: "indexing", completed, total: entries.length, changed });

    for (const [threadId, filePath] of entries) {
      let metadata;
      try {
        metadata = await stat(filePath);
      } catch {
        completed += 1;
        continue;
      }
      const previous = indexed.get(threadId);
      if (previous?.file_path === filePath && previous.file_size === metadata.size && previous.modified_at === metadata.mtimeMs) {
        indexed.delete(threadId);
        completed += 1;
        onProgress({ phase: "indexing", completed, total: entries.length, changed });
        continue;
      }

      const chunks = await extractConversationText(filePath);
      this.database.exec("BEGIN IMMEDIATE");
      try {
        this.deleteMessages.run(threadId);
        for (const chunk of chunks) this.insertMessage.run(threadId, chunk.role, chunk.text);
        this.upsertSession.run(threadId, filePath, metadata.size, metadata.mtimeMs);
        this.database.exec("COMMIT");
      } catch (error) {
        this.database.exec("ROLLBACK");
        throw error;
      }
      indexed.delete(threadId);
      changed += 1;
      completed += 1;
      onProgress({ phase: "indexing", completed, total: entries.length, changed });
    }

    for (const threadId of indexed.keys()) {
      this.database.exec("BEGIN IMMEDIATE");
      try {
        this.deleteMessages.run(threadId);
        this.deleteSession.run(threadId);
        this.database.exec("COMMIT");
      } catch (error) {
        this.database.exec("ROLLBACK");
        throw error;
      }
      changed += 1;
    }
    const result = { phase: "ready", completed: entries.length, total: entries.length, changed };
    this.database.pragma("optimize");
    this.database.pragma("wal_checkpoint(TRUNCATE)");
    onProgress(result);
    return result;
  }

  search({ query, threadIds, limit = defaultResultLimit }) {
    if (this.readOnly) throw new Error("Cannot search through a status-only index connection");
    const normalizedQuery = typeof query === "string" ? query.trim() : "";
    if (!normalizedQuery || !Array.isArray(threadIds) || threadIds.length === 0) return [];
    const boundedLimit = Math.max(1, Math.min(maximumResultLimit, Number(limit) || defaultResultLimit));
    const originalIdByLocalId = new Map();
    for (const threadId of threadIds) {
      if (typeof threadId !== "string" || !threadId) continue;
      originalIdByLocalId.set(localThreadIdFor(threadId), threadId);
    }
    const localThreadIds = [...originalIdByLocalId.keys()];
    if (localThreadIds.length === 0) return [];
    const candidateLimit = Math.min(maximumResultLimit * 5, boundedLimit * 5);
    const rows = [...normalizedQuery].length < 3
      ? this.searchShortQuery.all(normalizedQuery, JSON.stringify(localThreadIds), candidateLimit)
      : this.searchFts.all(quotedFtsQuery(normalizedQuery), JSON.stringify(localThreadIds), candidateLimit);
    const results = [];
    const seenThreadIds = new Set();
    for (const row of rows) {
      const threadId = originalIdByLocalId.get(row.thread_id);
      if (!threadId || seenThreadIds.has(threadId)) continue;
      seenThreadIds.add(threadId);
      results.push({ threadId, role: row.role, snippet: buildSnippet(row.content, normalizedQuery), score: -Number(row.rank) || 0 });
      if (results.length >= boundedLimit) break;
    }
    return results;
  }

  status() {
    const row = this.database.prepare("SELECT count(*) AS count FROM indexed_sessions").get();
    return { indexedSessions: Number(row?.count ?? 0) };
  }

  close() {
    this.database.close();
  }
}
