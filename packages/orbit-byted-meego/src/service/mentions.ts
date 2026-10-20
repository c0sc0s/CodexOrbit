import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { OPENAI_MENTIONS_CAPABILITY_KEY, OpenAIMentionSearchParamsSchema, OpenAIMentionSearchResultSchema } from "@openai/mcp-extensions";
import type { CliQuery } from "@c0sc0s/orbit-byted/service";
import { record } from "@c0sc0s/orbit-byted/model";
import type { BugItem } from "../shared/model.js";
import { formatReferences, isBugItem, statusLabel } from "../shared/model.js";
import { bugSource } from "./bugs.js";
import { loadBugDetail } from "./details.js";
import { BugPreferencesRepository } from "./preferences.js";

export async function nativeConfig(root = process.env.ORBIT_HOME ?? join(homedir(), "Library/Application Support/Orbit")): Promise<Record<string, unknown>> {
  if (!isAbsolute(root)) throw new Error("Invalid Orbit root");
  const platform = record(JSON.parse(await readFile(join(root, "loader.json"), "utf8")));
  const own = Array.isArray(platform.plugins) ? platform.plugins.map(record).find(plugin => plugin.id === "orbit-byted-meego" && plugin.enabled !== false) : null;
  if (!own) throw new Error("Meego plugin is not enabled");
  return record(own.config);
}
const resourceUri = (bug: BugItem) => `meego-bug://pending/${bug.projectKey}/${bug.workItemId}`;
export function createMeegoMentions(query: CliQuery, config: Record<string, unknown>) {
  const source = bugSource(query, config), server = new McpServer({ name: "orbit-byted-meego", title: "Meego", version: "0.2.2" });
  const directory = typeof config.dataDirectory === "string" && isAbsolute(config.dataDirectory) ? config.dataDirectory : null;
  const lifetime = new AbortController(); server.server.onclose = () => lifetime.abort();
  let current: BugItem[] = [], loadedAt = 0, pending: Promise<BugItem[]> | null = null;
  const load = async () => {
    if (Date.now() - loadedAt < 30000) return current;
    // A superseded keystroke must not cancel the refresh shared by later search requests.
    pending ??= source.load(AbortSignal.any([lifetime.signal, AbortSignal.timeout(45000)])).then(result => { current = result.items.filter(isBugItem); loadedAt = Date.now(); return current; }).finally(() => { pending = null; });
    return pending;
  };
  const capability = { searchTool: "search_mentions" };
  server.server.registerCapabilities({ extensions: { [OPENAI_MENTIONS_CAPABILITY_KEY]: capability }, experimental: { [OPENAI_MENTIONS_CAPABILITY_KEY]: capability } });
  server.registerTool("search_mentions", {
    title: "Meego", description: "搜索待处理 Bug", annotations: { readOnlyHint: true },
    inputSchema: OpenAIMentionSearchParamsSchema, outputSchema: OpenAIMentionSearchResultSchema,
    _meta: { "openai/extensions": { "mentions/search": {} }, ui: { visibility: ["app"] } },
  }, async ({ query: search }, context) => {
    if (search.length > 300) return { content: [], structuredContent: { items: [] } };
    const [bugs, preferences] = await Promise.all([load(), directory ? new BugPreferencesRepository(directory).read() : { projectKey: null }]);
    context.mcpReq.signal.throwIfAborted();
    const needle = search.trim().toLocaleLowerCase();
    return { content: [], structuredContent: { items: bugs.filter(bug => (!preferences.projectKey || bug.projectKey === preferences.projectKey) && `${bug.title} ${bug.workItemId} ${bug.projectName}`.toLocaleLowerCase().includes(needle)).slice(0, 50).map(bug => ({
      type: "resource" as const, resourceUri: resourceUri(bug), title: bug.title, subtitle: `${statusLabel(bug.status)} · ${bug.projectName} · #${bug.workItemId}`,
    })) } };
  });
  server.registerResource("meego_bug", new ResourceTemplate("meego-bug://pending/{project}/{id}", { list: undefined }), { title: "Meego Bug", mimeType: "text/markdown" }, async (uri, _variables, context) => {
    const bug = (await load()).find(bug => resourceUri(bug) === uri.href);
    context.mcpReq.signal.throwIfAborted();
    if (!bug) throw new Error("Bug is not in the personal pending list");
    const detail = await loadBugDetail(query, bug, false, context.mcpReq.signal);
    return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: formatReferences([detail], false) }] };
  });
  return server;
}
