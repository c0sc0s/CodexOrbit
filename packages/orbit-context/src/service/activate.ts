import { homedir } from "node:os";
import { join } from "node:path";
import type { ServiceContext } from "@c0sc0s/orbit/sdk";
import { SESSION_ID } from "../shared/model.js";
import { ContextRepository } from "./repository.js";

export function activate(context: ServiceContext): void {
  const repository = new ContextRepository(process.env.CODEX_HOME ?? join(homedir(), ".codex"));
  let active = 0;
  context.rpc.handle("context.read", async (value, request) => {
    const id = (value as { sessionId?: unknown } | null)?.sessionId;
    if (typeof id !== "string" || !SESSION_ID.test(id)) throw new Error("Invalid session ID");
    if (active >= 4) throw new Error("Context reader is busy");
    active++;
    try { return await repository.read(id, request.signal); } finally { active--; }
  });
}
