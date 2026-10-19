import { parseArgs } from "node:util";
import { dataDirectory } from "../storage/location.js";
import { TodoRepository } from "../storage/repository.js";
import { failure, TodoError } from "../shared/model.js";
import type { TaskQuery } from "../shared/model.js";

const help = `Orbit Todo — local personal tasks for Codex

orbit-todo list [--status open|todo|doing|done] [--project VALUE] [--thread ID] [--query TEXT] [--archived] [--offset N] [--limit N]
orbit-todo get ID
orbit-todo create --title TEXT [--parent ID] [--description TEXT] [--project VALUE] [--thread ID] [--due YYYY-MM-DD] [--request-id KEY]
orbit-todo create --stdin           JSON object, supports nested children (atomic, max 100)
orbit-todo update ID --if-revision N --stdin   JSON patch; null clears optional fields
orbit-todo update ID --if-revision N [--title TEXT] [--description TEXT] [--status todo|doing|done] [--parent ID|root]
orbit-todo delete ID --if-revision N           Moves the whole subtree to trash
orbit-todo archive ID --if-revision N          Alias of delete
orbit-todo restore ID --if-revision N
orbit-todo info

All commands return JSON. --data-dir PATH selects an explicit store.
Read the task before updating; conflict means read again and merge.
Parent completion requires all active descendants to be done.
`;
async function stdin(): Promise<unknown> {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += Buffer.byteLength(chunk);
    if (bytes > 1024 * 1024) throw new TodoError("invalid_input", "JSON 输入最大 1 MiB。");
    chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new TodoError("invalid_input", "stdin 必须是有效 JSON。"); }
}
export async function main(args = process.argv.slice(2)): Promise<void> {
  let repository: TodoRepository | undefined;
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, strict: true, options: {
      help: { type: "boolean", short: "h" }, "data-dir": { type: "string" }, stdin: { type: "boolean" },
      title: { type: "string" }, description: { type: "string" }, status: { type: "string" },
      parent: { type: "string" }, project: { type: "string" }, thread: { type: "string" }, due: { type: "string" },
      "if-revision": { type: "string" }, "request-id": { type: "string" },
      archived: { type: "boolean" }, query: { type: "string" }, limit: { type: "string" }, offset: { type: "string" },
    } });
    if (values.help || !positionals.length) { process.stdout.write(help); return; }
    const [command, id] = positionals;
    const allowed: Record<string, string[]> = {
      info: [], get: [], list: ["status", "project", "thread", "archived", "query", "limit", "offset"],
      create: ["stdin", "title", "description", "parent", "project", "thread", "due", "request-id"],
      update: ["stdin", "if-revision", "title", "description", "status", "parent", "project", "thread", "due"],
      delete: ["if-revision"], archive: ["if-revision"], restore: ["if-revision"],
    };
    if (!allowed[command] || positionals.length !== (["get", "update", "delete", "archive", "restore"].includes(command) ? 2 : 1)) throw new TodoError("invalid_input", "命令或参数数量无效。使用 --help 查看用法。");
    if (Object.keys(values).some(key => !["data-dir", ...allowed[command]].includes(key))) throw new TodoError("invalid_input", "此命令不支持提供的选项。");
    if (values.stdin && Object.keys(values).some(key => !["stdin", "data-dir", "if-revision"].includes(key))) throw new TodoError("invalid_input", "--stdin 不与任务字段选项混用。");
    const directory = await dataDirectory(values["data-dir"]);
    if (command === "info") { process.stdout.write(`${JSON.stringify({ ok: true, data: { dataDirectory: directory, schemaVersion: 1, maxDepth: 16 } })}\n`); return; }
    const input = values.stdin ? await stdin() : Object.fromEntries([
      ["title", values.title], ["description", values.description], ["status", values.status],
      ["parentId", values.parent === "root" ? null : values.parent], ["project", values.project],
      ["threadId", values.thread], ["dueDate", values.due], ["requestId", values["request-id"]],
    ].filter(([, value]) => value !== undefined));
    repository = new TodoRepository(directory);
    let data: unknown;
    if (command === "list") data = repository.list({
      status: values.status as TaskQuery["status"], project: values.project, threadId: values.thread,
      query: values.query, archived: values.archived,
      ...(values.limit !== undefined ? { limit: Number(values.limit) } : {}),
      ...(values.offset !== undefined ? { offset: Number(values.offset) } : {}),
    });
    else if (command === "get") data = repository.get(id);
    else if (command === "create") data = repository.create(input);
    else if (command === "update") data = repository.update(id, Number(values["if-revision"]), input);
    else data = repository.archive(id, Number(values["if-revision"]), command === "restore");
    process.stdout.write(`${JSON.stringify({ ok: true, data })}\n`);
  } catch (error) {
    const result = error instanceof TypeError && "code" in error && String(error.code).startsWith("ERR_PARSE_ARGS")
      ? failure(new TodoError("invalid_input", error.message)) : failure(error);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = 1;
  } finally { repository?.close(); }
}
