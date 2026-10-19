import Database from "better-sqlite3";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { MAX_DEPTH, PAGE_SIZE, TodoError, object, parsePatch, revision, taskId, text } from "../shared/model.js";
import type { CompletionResult, CreateTask, StatusUndo, Task, TaskPage, TaskQuery, TaskSummary } from "../shared/model.js";

const columns = "id, parentId, title, status, project, threadId, dueDate, position, revision, createdAt, updatedAt, archivedAt";
export class TodoRepository {
  private db: Database.Database;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.db = new Database(join(directory, "tasks.sqlite"));
    try {
      this.db.pragma("busy_timeout = 5000");
      this.db.pragma("foreign_keys = ON");
      const version = this.db.pragma("user_version", { simple: true }) as number;
      if (version > 1) throw new TodoError("schema_version", "此任务库由较新版本创建，请升级 Orbit Todo。");
      this.db.pragma("journal_mode = WAL");
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY, parentId TEXT REFERENCES tasks(id), title TEXT NOT NULL,
          description TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('todo','doing','done')),
          project TEXT, threadId TEXT, dueDate TEXT, position INTEGER NOT NULL,
          revision INTEGER NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, archivedAt TEXT, archiveGroup TEXT
        );
        CREATE INDEX IF NOT EXISTS tasks_parent ON tasks(parentId, position);
        CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY CHECK(id=1), generation INTEGER NOT NULL);
        INSERT OR IGNORE INTO metadata VALUES(1, 0);
        CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, hash TEXT NOT NULL, result TEXT NOT NULL);
        PRAGMA user_version = 1;
      `);
    } catch (error) { this.db.close(); throw error; }
  }
  close(): void { this.db.close(); }
  generation(): number { return (this.db.prepare("SELECT generation FROM metadata WHERE id=1").get() as { generation: number }).generation; }
  get(id: string): Task {
    const task = this.db.prepare(`SELECT ${columns}, description FROM tasks WHERE id=?`).get(taskId(id)) as Task | undefined;
    if (!task) throw new TodoError("not_found", "任务不存在。");
    return task;
  }
  private descendants(id: string): Task[] {
    return this.db.prepare(`WITH RECURSIVE tree(id) AS (
      SELECT id FROM tasks WHERE parentId=? UNION ALL SELECT t.id FROM tasks t JOIN tree ON t.parentId=tree.id
    ) SELECT tasks.* FROM tasks JOIN tree ON tasks.id=tree.id`).all(id) as Task[];
  }
  private ancestors(id: string | null): Task[] {
    const parents: Task[] = [];
    while (id) {
      const parent = this.get(id);
      if (parents.some(item => item.id === id) || parents.length >= MAX_DEPTH) throw new TodoError("invalid_tree", "任务层级无效。");
      parents.push(parent); id = parent.parentId;
    }
    return parents;
  }
  private touchGeneration(): void { this.db.prepare("UPDATE metadata SET generation=generation+1 WHERE id=1").run(); }
  private reopenAncestors(parentId: string | null, now: string): void {
    for (const task of this.ancestors(parentId)) {
      if (task.status === "done") this.db.prepare("UPDATE tasks SET status='todo', revision=revision+1, updatedAt=? WHERE id=?").run(now, task.id);
    }
  }
  private checked(id: string, expected: unknown): Task {
    const task = this.get(id);
    if (task.revision !== revision(expected)) throw new TodoError("conflict", "任务已被其他窗口或 Agent 修改。请重新读取后合并修改。");
    return task;
  }
  list(query: TaskQuery = {}): TaskPage {
    const { limit = PAGE_SIZE, offset = 0 } = query;
    if (query.archived !== undefined && typeof query.archived !== "boolean") throw new TodoError("invalid_input", "archived 必须为布尔值。");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > PAGE_SIZE || !Number.isSafeInteger(offset) || offset < 0) throw new TodoError("invalid_input", `limit 为 1–${PAGE_SIZE}，offset 为非负整数。`);
    if (query.status && !["open", "todo", "doing", "done"].includes(query.status)) throw new TodoError("invalid_input", "未知状态筛选。");
    const filters = [query.archived ? "archivedAt IS NOT NULL" : "archivedAt IS NULL"];
    const values: unknown[] = [];
    if (query.status === "open") filters.push("status != 'done'");
    else if (query.status) { filters.push("status = ?"); values.push(query.status); }
    for (const key of ["project", "threadId"] as const) if (query[key] !== undefined) {
      filters.push(`${key} = ?`); values.push(text(query[key], key, key === "project" ? 1024 : 36));
    }
    if (query.query) {
      const search = text(query.query, "query", 300)!;
      filters.push("(instr(lower(title), lower(?)) > 0 OR instr(lower(description), lower(?)) > 0)"); values.push(search, search);
    }
    const where = filters.join(" AND ");
    return this.db.transaction(() => ({
      items: this.db.prepare(`SELECT ${columns} FROM tasks WHERE ${where} ORDER BY position, createdAt, id LIMIT ? OFFSET ?`).all(...values, limit, offset) as TaskSummary[],
      total: (this.db.prepare(`SELECT COUNT(*) AS count FROM tasks WHERE ${where}`).get(...values) as { count: number }).count,
      generation: this.generation(),
    }))();
  }
  create(value: unknown): { tasks: Task[]; replayed: boolean } {
    const raw = object(value);
    const requestId = raw.requestId === undefined ? null : text(raw.requestId, "requestId", 128);
    if (requestId === "") throw new TodoError("invalid_input", "requestId 不能为空。");
    const hash = createHash("sha256").update(JSON.stringify(raw)).digest("hex");
    return this.db.transaction(() => {
      if (requestId) {
        const saved = this.db.prepare("SELECT hash, result FROM requests WHERE id=?").get(requestId) as { hash: string; result: string } | undefined;
        if (saved) {
          if (saved.hash !== hash) throw new TodoError("request_conflict", "此 requestId 已用于不同的创建请求。");
          return { tasks: JSON.parse(saved.result) as Task[], replayed: true };
        }
      }
      const created: Task[] = [], now = new Date().toISOString();
      const insert = (input: unknown, parent: Task | null, depth: number): Task => {
        if (depth > MAX_DEPTH || created.length >= 100) throw new TodoError("limit_exceeded", `一次最多创建 100 个任务，层级最多 ${MAX_DEPTH} 层。`);
        const data = object(input);
        const patch = parsePatch(data, true) as CreateTask;
        if (depth > 1 && "parentId" in data) throw new TodoError("invalid_input", "children 内无需提供 parentId。");
        const ancestors = parent ? this.ancestors(parent.id) : [];
        if (ancestors.some(item => item.archivedAt)) throw new TodoError("parent_archived", "先恢复父任务，再添加子任务。");
        if (ancestors.length + 1 > MAX_DEPTH) throw new TodoError("limit_exceeded", `层级最多 ${MAX_DEPTH} 层。`);
        const position = (this.db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS value FROM tasks WHERE parentId IS ?").get(parent?.id ?? null) as { value: number }).value;
        const task: Task = {
          id: randomUUID(), parentId: parent?.id ?? null, title: patch.title,
          description: patch.description ?? "", status: "todo", project: patch.project === undefined ? parent?.project ?? null : patch.project,
          threadId: patch.threadId === undefined ? parent?.threadId ?? null : patch.threadId,
          dueDate: patch.dueDate ?? null, position, revision: 1, createdAt: now, updatedAt: now, archivedAt: null,
        };
        this.db.prepare(`INSERT INTO tasks (${columns}, description) VALUES (@id,@parentId,@title,@status,@project,@threadId,@dueDate,@position,@revision,@createdAt,@updatedAt,@archivedAt,@description)`).run(task);
        created.push(task);
        if (data.children !== undefined) {
          if (!Array.isArray(data.children)) throw new TodoError("invalid_input", "children 必须是数组。");
          for (const child of data.children) insert(child, task, depth + 1);
        }
        return task;
      };
      const parent = raw.parentId ? this.get(taskId(raw.parentId)) : null;
      insert(raw, parent, 1);
      this.reopenAncestors(parent?.id ?? null, now);
      this.touchGeneration();
      if (requestId) this.db.prepare("INSERT INTO requests VALUES (?,?,?)").run(requestId, hash, JSON.stringify(created));
      return { tasks: created, replayed: false };
    }).immediate();
  }
  update(id: string, expected: unknown, value: unknown): Task {
    const patch = parsePatch(value);
    return this.db.transaction(() => {
      const before = this.checked(id, expected);
      if (before.archivedAt) throw new TodoError("task_archived", "先恢复任务，再编辑。");
      const task: Task = { ...before, ...patch, revision: before.revision + 1, updatedAt: new Date().toISOString() };
      const descendants = this.descendants(id);
      if (task.parentId === id || descendants.some(item => item.id === task.parentId)) throw new TodoError("cycle", "任务不能移入自己或自己的子任务。");
      const ancestors = this.ancestors(task.parentId);
      if (ancestors.some(item => item.archivedAt)) throw new TodoError("parent_archived", "不能移入已删除任务，请先恢复。");
      const subtreeDepth = (nodeId: string): number => 1 + Math.max(0, ...descendants.filter(item => item.parentId === nodeId).map(item => subtreeDepth(item.id)));
      if (ancestors.length + subtreeDepth(id) > MAX_DEPTH) throw new TodoError("limit_exceeded", `层级最多 ${MAX_DEPTH} 层。`);
      if (task.status === "done" && descendants.some(item => !item.archivedAt && item.status !== "done")) throw new TodoError("children_incomplete", "请先完成所有子任务，再完成父任务。");
      if (task.parentId !== before.parentId) task.position = (this.db.prepare("SELECT COALESCE(MAX(position), -1) + 1 AS value FROM tasks WHERE parentId IS ?").get(task.parentId) as { value: number }).value;
      this.db.prepare(`UPDATE tasks SET parentId=@parentId,title=@title,description=@description,status=@status,
        project=@project,threadId=@threadId,dueDate=@dueDate,position=@position,revision=@revision,updatedAt=@updatedAt WHERE id=@id`).run(task);
      if (task.status !== "done") this.reopenAncestors(task.parentId, task.updatedAt);
      this.touchGeneration();
      return task;
    }).immediate();
  }
  complete(id: string, expected: unknown, expectedGeneration: unknown): CompletionResult {
    return this.db.transaction(() => {
      if (!Number.isSafeInteger(expectedGeneration) || Number(expectedGeneration) < 0) throw new TodoError("invalid_input", "完成操作需要最新的 ifGeneration。");
      if (this.generation() !== expectedGeneration) throw new TodoError("conflict", "任务列表已有更新，请刷新后重试完成操作。");
      const task = this.checked(id, expected), now = new Date().toISOString();
      if (task.archivedAt) throw new TodoError("task_archived", "先恢复任务，再完成。");
      const affected = [task, ...this.descendants(id)].filter(item => !item.archivedAt && item.status !== "done");
      const undo = affected.map(item => ({ id: item.id, ifRevision: item.revision + 1, status: item.status }));
      for (const item of affected) this.db.prepare("UPDATE tasks SET status='done',revision=revision+1,updatedAt=? WHERE id=?").run(now, item.id);
      if (affected.length) this.touchGeneration();
      return { task: this.get(id), undo };
    }).immediate();
  }
  undoCompletion(value: unknown): void {
    if (!Array.isArray(value) || !value.length) throw new TodoError("invalid_input", "需要完成操作返回的撤销记录。");
    const changes: StatusUndo[] = value.map(input => {
      const item = object(input), patch = parsePatch({ status: item.status });
      return { id: taskId(item.id), ifRevision: revision(item.ifRevision), status: patch.status! };
    });
    if (new Set(changes.map(item => item.id)).size !== changes.length) throw new TodoError("invalid_input", "撤销记录包含重复任务。");
    this.db.transaction(() => {
      for (const change of changes) {
        const task = this.checked(change.id, change.ifRevision);
        if (task.archivedAt) throw new TodoError("task_archived", "任务已删除，无法撤销完成。");
      }
      const now = new Date().toISOString();
      for (const change of changes) this.db.prepare("UPDATE tasks SET status=?,revision=revision+1,updatedAt=? WHERE id=?").run(change.status, now, change.id);
      for (const change of changes) {
        if (change.status === "done" && this.descendants(change.id).some(item => !item.archivedAt && item.status !== "done")) throw new TodoError("children_incomplete", "撤销会留下未完成子任务，操作已取消。");
        if (change.status !== "done") this.reopenAncestors(this.get(change.id).parentId, now);
      }
      this.touchGeneration();
    }).immediate();
  }
  archive(id: string, expected: unknown, restore = false): Task {
    return this.db.transaction(() => {
      const task = this.checked(id, expected), now = new Date().toISOString();
      if (restore && this.ancestors(task.parentId).some(item => item.archivedAt)) throw new TodoError("parent_archived", "先恢复父任务。");
      // A shared archive marker restores only the descendants archived with this operation.
      const marker = task.archivedAt;
      const group = (this.db.prepare("SELECT archiveGroup FROM tasks WHERE id=?").get(id) as { archiveGroup: string | null }).archiveGroup;
      const groupIds = new Set((this.db.prepare("SELECT id FROM tasks WHERE archiveGroup=?").all(group) as { id: string }[]).map(item => item.id));
      const affected = [task, ...this.descendants(id)].filter(item => restore ? groupIds.has(item.id) : !item.archivedAt);
      if ((restore && !marker) || (!restore && marker)) return task;
      const archiveGroup = restore ? null : randomUUID();
      for (const item of affected) this.db.prepare("UPDATE tasks SET archivedAt=?,archiveGroup=?,revision=revision+1,updatedAt=? WHERE id=?").run(restore ? null : now, archiveGroup, now, item.id);
      if (restore && affected.some(item => item.status !== "done")) this.reopenAncestors(task.parentId, now);
      this.touchGeneration();
      return this.get(id);
    }).immediate();
  }
}
