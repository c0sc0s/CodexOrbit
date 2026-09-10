import { createRuntimeMessage, parseRuntimeMessage, RuntimeMessageType } from "../shared/protocol.js";

import type { RuntimeMessage } from "../shared/protocol.js";
import type { TagSettings } from "../shared/tag-settings.js";
import type { SettingsRepository } from "./settings/repository.js";
import type { SessionSearchIndex, IndexStatus } from "./search/search-index.js";
interface Client { id: string }
interface RouterOptions {
  searchIndex: Pick<SessionSearchIndex, "search">;
  settingsRepository: Pick<SettingsRepository, "write">;
  getSettings(): TagSettings;
  onSettingsChanged(settings: TagSettings): Promise<void>;
  waitForIndex(): Promise<unknown>;
  getIndexStatus(): IndexStatus;
  send(client: Client, message: RuntimeMessage<string, object>): Promise<void>;
  openSession?(threadId: string): Promise<void>;
}
export class ControllerRouter {
  searchIndex: RouterOptions["searchIndex"];
  settingsRepository: RouterOptions["settingsRepository"];
  getSettings: RouterOptions["getSettings"];
  onSettingsChanged: RouterOptions["onSettingsChanged"];
  waitForIndex: RouterOptions["waitForIndex"];
  getIndexStatus: RouterOptions["getIndexStatus"];
  send: RouterOptions["send"];
  openSession: RouterOptions["openSession"];
  latestSearchRequestIds: Map<string, number>;
  handlers: Map<string, (client: Client, request: RuntimeMessage) => Promise<void>>;
  constructor(options: RouterOptions) {
    this.searchIndex = options.searchIndex;
    this.settingsRepository = options.settingsRepository;
    this.getSettings = options.getSettings;
    this.onSettingsChanged = options.onSettingsChanged;
    this.waitForIndex = options.waitForIndex;
    this.getIndexStatus = options.getIndexStatus;
    this.send = options.send;
    this.openSession = options.openSession;
    this.latestSearchRequestIds = new Map();
    this.handlers = new Map([
      [RuntimeMessageType.settingsGet, this.handleSettingsGet.bind(this)],
      [RuntimeMessageType.settingsUpdate, this.handleSettingsUpdate.bind(this)],
      [RuntimeMessageType.searchRequest, this.handleSearchRequest.bind(this)],
      [RuntimeMessageType.navigationOpen, async (_client, request) => {
        const threadId = typeof request.payload.threadId === "string" ? request.payload.threadId.replace(/^local:/u, "") : "";
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(threadId)) await this.openSession?.(threadId);
      }],
    ]);
  }

  async handle(client: Client, message: unknown) {
    const parsed = parseRuntimeMessage(message);
    if (!parsed.ok) return false;
    const handler = this.handlers.get(parsed.message.type);
    if (!handler) return false;
    await handler(client, parsed.message);
    return true;
  }

  forgetTarget(targetId: string) {
    this.latestSearchRequestIds.delete(targetId);
  }

  async sendSettingsSnapshot(client: Client) {
    await this.send(
      client,
      createRuntimeMessage(RuntimeMessageType.settingsSnapshot, { settings: this.getSettings() }),
    );
  }

  async handleSettingsGet(client: Client, _request: RuntimeMessage) {
    await this.sendSettingsSnapshot(client);
  }

  async handleSettingsUpdate(client: Client, request: RuntimeMessage) {
    try {
      if (!Array.isArray(request.payload.tags) || request.payload.tags.length > 32) throw new Error("Invalid tag definitions");
      const result = await this.settingsRepository.write(request.payload.tags);
      await this.onSettingsChanged(result.settings);
    } catch {
      await this.sendSettingsSnapshot(client);
      await this.send(client, createRuntimeMessage(RuntimeMessageType.settingsError, {}));
    }
  }

  async handleSearchRequest(client: Client, request: RuntimeMessage) {
    if (typeof request.requestId !== "number" || !Number.isSafeInteger(request.requestId)) return;
    const targetId = client.id;
    this.latestSearchRequestIds.set(targetId, request.requestId);
    await this.waitForIndex();
    if (this.latestSearchRequestIds.get(targetId) !== request.requestId) return;

    try {
      const items = this.searchIndex.search({ query: request.payload.query, threadIds: request.payload.threadIds, limit: request.payload.limit });
      await this.send(client, createRuntimeMessage(RuntimeMessageType.searchResult, {
        query: request.payload.query,
        items,
        indexStatus: this.getIndexStatus(),
      }, request.requestId));
    } catch (error) {
      await this.send(client, createRuntimeMessage(RuntimeMessageType.searchResult, {
        query: request.payload.query,
        items: [],
        indexStatus: this.getIndexStatus(),
        error: error instanceof Error ? error.message : "Search failed",
      }, request.requestId)).catch(() => {});
    }
  }
}
