import type { ServiceContext } from "@c0sc0s/orbit/sdk";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { failure, object, taskId, TodoError } from "../shared/model.js";
import type { TaskQuery } from "../shared/model.js";
import { TodoRepository } from "../storage/repository.js";

export function activate(context: ServiceContext) {
  const repository = new TodoRepository(typeof context.config.dataDirectory === "string" ? context.config.dataDirectory : context.stateDirectory);
  context.onDispose(() => repository.close());
  let generation = repository.generation();
  const publish = () => {
    const next = repository.generation();
    if (next !== generation) { generation = next; context.events.publish("changed", { generation }); }
  };
  const methods: Record<string, (value: unknown) => unknown> = {
    list: value => repository.list(object(value ?? {}) as TaskQuery),
    get: value => repository.get(taskId(object(value).id)),
    create: value => repository.create(value),
    update: value => { const input = object(value); return repository.update(taskId(input.id), input.ifRevision, input.patch); },
    complete: value => { const input = object(value); return repository.complete(taskId(input.id), input.ifRevision, input.ifGeneration); },
    undoCompletion: value => { repository.undoCompletion(object(value).changes); return { restored: true }; },
    archive: value => { const input = object(value); return repository.archive(taskId(input.id), input.ifRevision); },
    restore: value => { const input = object(value); return repository.archive(taskId(input.id), input.ifRevision, true); },
    open: async value => {
      const task = repository.get(taskId(object(value).id));
      if (!task.threadId) throw new TodoError("not_linked", "此任务尚未关联会话。");
      await promisify(execFile)("/usr/bin/open", [`codex://threads/${task.threadId}`]);
      return { opened: true };
    },
  };
  for (const [name, method] of Object.entries(methods)) context.rpc.handle(name, async value => {
    try { const data = await method(value); publish(); return { ok: true, data }; }
    catch (error) { return failure(error); }
  });
  const timer = setInterval(() => { try { publish(); } catch { /* RPC reports storage errors when the panel refreshes. */ } }, 1000);
  context.onDispose(() => clearInterval(timer));
}
