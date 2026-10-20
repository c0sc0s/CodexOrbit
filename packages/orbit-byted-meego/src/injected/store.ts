import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { isFeedSnapshot, record } from "@c0sc0s/orbit-byted/model";
import type { FeedSnapshot } from "@c0sc0s/orbit-byted/model";
import { isBugDetail, isBugItem } from "../shared/model.js";
import type { BugDetail, BugItem, BugPreferences } from "../shared/model.js";

export class BugStore {
  snapshot: FeedSnapshot | null = null;
  preferences: BugPreferences = { revision: 0, projectKey: null };
  error = "";
  private listeners = new Set<() => void>();
  private details = new Map<string, { value: BugDetail; time: number }>();
  constructor(private context: RendererContext) {
    context.onDispose(context.events.subscribe("feed", value => this.accept(value)));
    context.onDispose(context.events.subscribe("preferences", value => this.acceptPreferences(value)));
    context.onDispose(() => { this.listeners.clear(); this.details.clear(); });
    void this.refresh(false);
    void context.rpc.call("getPreferences").then(value => this.acceptPreferences(value)).catch(() => {});
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  notify() { for (const listener of this.listeners) listener(); }
  private accept(value: unknown) {
    if (!isFeedSnapshot(value, ["meego.larkoffice.com"]) || !value.items.every(isBugItem)) { this.error = "列表数据格式不受支持，请刷新重试。"; this.notify(); return; }
    if (this.snapshot?.generation === value.generation && value.revision < this.snapshot.revision) return;
    this.snapshot = value; this.error = ""; this.notify();
  }
  private acceptPreferences(value: unknown) {
    try {
      const preferences = record(value);
      if (!Number.isSafeInteger(preferences.revision) || Number(preferences.revision) < this.preferences.revision || preferences.projectKey !== null && typeof preferences.projectKey !== "string") return;
      this.preferences = { revision: Number(preferences.revision), projectKey: preferences.projectKey as string | null }; this.notify();
    } catch { /* Keep the last confirmed scope if a preference response is invalid. */ }
  }
  get bugs(): BugItem[] { return (this.snapshot?.items ?? []).filter(isBugItem); }
  async refresh(force = true) {
    try { this.accept(await this.context.rpc.call(force ? "refreshFeed" : "getFeed")); }
    catch { if (!this.context.signal.aborted) { this.error = "插件服务暂不可用，请重试。"; this.notify(); } }
  }
  async project(projectKey: string | null) {
    try { this.acceptPreferences(await this.context.rpc.call("setPreferences", { projectKey })); }
    catch { this.error = "项目筛选保存失败，请重试。"; this.notify(); }
  }
  async detail(bug: BugItem, includeComments: boolean, signal: AbortSignal): Promise<BugDetail> {
    const key = `${bug.id}:${includeComments}`, cached = this.details.get(key);
    if (cached && Date.now() - cached.time < 120000) return cached.value;
    const value = await this.context.rpc.call("getBug", { id: bug.id, includeComments }, { signal, timeoutMs: 30000 });
    if (!isBugDetail(value) || value.id !== bug.id || value.url !== bug.url) throw new Error("Invalid bug details");
    if (this.details.size >= 20) this.details.delete(this.details.keys().next().value!);
    this.details.set(key, { value, time: Date.now() }); return value;
  }
}
