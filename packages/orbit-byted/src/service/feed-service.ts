import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { ServiceContext } from "@c0sc0s/orbit/sdk";
import { boundFeed, isFeedResult, record } from "../shared/feed.js";
import type { FeedResult, FeedSnapshot } from "../shared/feed.js";
import { FeedFailure } from "./cli.js";

export interface FeedSource {
  key: string;
  hosts: readonly string[];
  dismissible?: boolean;
  load(signal: AbortSignal): Promise<FeedResult>;
}
export function activateFeed(context: ServiceContext, source: FeedSource, intervalMs = 300000) {
  const controller = new AbortController(), signal = AbortSignal.any([context.signal, controller.signal]);
  const directory = typeof context.config.dataDirectory === "string" && isAbsolute(context.config.dataDirectory) ? context.config.dataDirectory : context.stateDirectory;
  const cachePath = join(directory, "feed.json");
  let snapshot: FeedSnapshot = { generation: randomUUID(), revision: 0, items: [], complete: false, updatedAt: null, refreshing: false, error: null };
  let dismissedIds = new Set<string>(), mutations = Promise.resolve();
  let pending: Promise<void> | undefined, timer: ReturnType<typeof setTimeout> | undefined;
  const mutate = (operation: () => Promise<void>) => {
    const next = mutations.then(operation);
    mutations = next.catch(() => {});
    return next;
  };
  const visible = (result: FeedResult): FeedResult => ({ ...result, items: result.items.filter(item => !dismissedIds.has(item.id)) });
  const publish = () => {
    if (signal.aborted) return;
    snapshot = { ...snapshot, revision: snapshot.revision + 1 };
    context.events.publish("feed", snapshot);
  };
  const persist = async (result: FeedResult, updatedAt: number, dismissed = dismissedIds) => {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${cachePath}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify({ schemaVersion: 1, source: source.key, updatedAt, ...result,
        ...(source.dismissible ? { dismissedIds: [...dismissed] } : {}),
      }), { mode: 0o600 });
      signal.throwIfAborted();
      await rename(temporary, cachePath);
    } finally { await rm(temporary, { force: true }); }
  };
  const refresh = () => {
    if (signal.aborted || pending) return;
    clearTimeout(timer);
    snapshot = { ...snapshot, refreshing: true }; publish();
    pending = Promise.resolve().then(async () => {
      try {
        const loaded = await source.load(signal);
        signal.throwIfAborted();
        if (!isFeedResult(loaded, source.hosts)) throw new FeedFailure("data");
        await mutate(async () => {
          signal.throwIfAborted();
          const result = boundFeed(visible(loaded)), updatedAt = Date.now();
          snapshot = { ...snapshot, ...result, updatedAt, error: null };
          try { await persist(result, updatedAt); }
          catch { if (!signal.aborted) snapshot = { ...snapshot, error: "storage" }; }
        });
      } catch (error) {
        if (!signal.aborted) snapshot = { ...snapshot, error: error instanceof FeedFailure ? error.code : "data" };
      } finally {
        pending = undefined;
        snapshot = { ...snapshot, refreshing: false }; publish();
        if (!signal.aborted) { timer = setTimeout(refresh, intervalMs); timer.unref(); }
      }
    });
  };
  const ready = (async () => {
    try {
      if ((await stat(cachePath)).size > 1024 * 1024) throw new Error("Cache too large");
      const cache = record(JSON.parse(await readFile(cachePath, "utf8")));
      if (cache.schemaVersion === 1 && cache.source === source.key && typeof cache.updatedAt === "number" && cache.updatedAt > 0 && Number.isFinite(cache.updatedAt) && isFeedResult(cache, source.hosts)) {
        if (source.dismissible && Array.isArray(cache.dismissedIds) && cache.dismissedIds.every(id => typeof id === "string" && id.length > 0 && id.length <= 128)) dismissedIds = new Set(cache.dismissedIds);
        snapshot = { ...snapshot, ...boundFeed(visible({ items: cache.items, complete: cache.complete })), updatedAt: cache.updatedAt };
      }
    } catch { /* A disposable cache must never prevent an authenticated refresh. */ }
    if (!signal.aborted) { publish(); refresh(); }
  })();
  context.rpc.handle("getFeed", async () => { await ready; return snapshot; });
  context.rpc.handle("refreshFeed", async () => { await ready; refresh(); return snapshot; });
  if (source.dismissible) context.rpc.handle("dismissFeedItem", async input => {
    const value = record(input);
    if (Object.keys(value).some(key => key !== "id") || typeof value.id !== "string" || !value.id || value.id.length > 128) throw new Error("Invalid item request");
    const id = value.id;
    await ready;
    await mutate(async () => {
      signal.throwIfAborted();
      if (dismissedIds.has(id)) return;
      if (!snapshot.items.some(item => item.id === id) || snapshot.updatedAt === null) throw new Error("Item is not in the current list");
      const nextIds = new Set(dismissedIds).add(id), result = { items: snapshot.items.filter(item => item.id !== id), complete: snapshot.complete };
      await persist(result, snapshot.updatedAt, nextIds);
      dismissedIds = nextIds;
      snapshot = { ...snapshot, ...result }; publish();
    });
    return snapshot;
  });
  context.onDispose(() => {
    clearTimeout(timer); controller.abort();
  });
  return { ready, settled: async () => { await ready; await pending; }, snapshot: () => snapshot };
}
