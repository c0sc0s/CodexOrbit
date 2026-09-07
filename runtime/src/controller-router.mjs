import { createRuntimeMessage, parseRuntimeMessage, RuntimeMessageType } from "./protocol.mjs";

export class ControllerRouter {
  constructor(options) {
    this.searchIndex = options.searchIndex;
    this.settingsRepository = options.settingsRepository;
    this.getSettings = options.getSettings;
    this.onSettingsChanged = options.onSettingsChanged;
    this.waitForIndex = options.waitForIndex;
    this.getIndexStatus = options.getIndexStatus;
    this.send = options.send;
    this.latestSearchRequestIds = new Map();
    this.handlers = new Map([
      [RuntimeMessageType.settingsGet, this.handleSettingsGet.bind(this)],
      [RuntimeMessageType.settingsUpdate, this.handleSettingsUpdate.bind(this)],
      [RuntimeMessageType.searchRequest, this.handleSearchRequest.bind(this)],
    ]);
  }

  async handle(client, params) {
    const parsed = parseRuntimeMessage(params.payload);
    if (!parsed.ok) return false;
    const handler = this.handlers.get(parsed.message.type);
    if (!handler) return false;
    await handler(client, parsed.message, params.executionContextId);
    return true;
  }

  forgetTarget(targetId) {
    this.latestSearchRequestIds.delete(targetId);
  }

  async sendSettingsSnapshot(client, executionContextId) {
    await this.send(
      client,
      createRuntimeMessage(RuntimeMessageType.settingsSnapshot, { settings: this.getSettings() }),
      executionContextId,
    );
  }

  async handleSettingsGet(client, _request, executionContextId) {
    await this.sendSettingsSnapshot(client, executionContextId);
  }

  async handleSettingsUpdate(_client, request) {
    const result = await this.settingsRepository.write(request.payload.tags);
    await this.onSettingsChanged(result.settings);
  }

  async handleSearchRequest(client, request, executionContextId) {
    if (!Number.isSafeInteger(request.requestId)) return;
    const targetId = client.target.id;
    this.latestSearchRequestIds.set(targetId, request.requestId);
    await this.waitForIndex();
    if (this.latestSearchRequestIds.get(targetId) !== request.requestId) return;

    try {
      const items = this.searchIndex.search(request.payload);
      await this.send(client, createRuntimeMessage(RuntimeMessageType.searchResult, {
        query: request.payload.query,
        items,
        indexStatus: this.getIndexStatus(),
      }, request.requestId), executionContextId);
    } catch (error) {
      await this.send(client, createRuntimeMessage(RuntimeMessageType.searchResult, {
        query: request.payload.query,
        items: [],
        indexStatus: this.getIndexStatus(),
        error: error instanceof Error ? error.message : "Search failed",
      }, request.requestId), executionContextId).catch(() => {});
    }
  }
}
