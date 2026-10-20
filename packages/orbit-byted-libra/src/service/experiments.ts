import type { CliQuery, FeedSource } from "@c0sc0s/orbit-byted/service";
import { MAX_ITEMS, identifier, record, text } from "@c0sc0s/orbit-byted/model";
import type { FeedItem } from "@c0sc0s/orbit-byted/model";
import { libraSite } from "../shared/site.js";

const statuses: Record<string, string> = {
  0: "已结束", 1: "运行中", 2: "待开始", 3: "调试中", 4: "已暂停", 5: "待结束",
  6: "待审批", 7: "已驳回", 8: "草稿", 39: "已冻结", 91: "已发布", 100: "已删除",
};
function dateDetail(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return;
  const date = new Date(value * 1000);
  if (!Number.isFinite(date.getTime())) return;
  return `截止 ${date.toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit" })}`;
}
export function experimentSource(query: CliQuery, config: Record<string, unknown>): FeedSource {
  const { site, host } = libraSite(config), appId = config.appId ?? -1;
  if (typeof appId !== "number" || !Number.isSafeInteger(appId) || appId !== -1 && appId <= 0) throw new Error("Invalid appId");
  return {
    key: JSON.stringify({ type: "libra-experiments-v1", site, appId, cliPath: config.cliPath ?? null }),
    hosts: [host],
    async load(signal) {
      const items = new Map<string, FeedItem>();
      for (let page = 1; page <= 20; page++) {
        signal.throwIfAborted();
        const data = record(await query(["--site", site, "libra", "experiment", "list", "--app-id", String(appId), "--owner-type", "my", "--page", String(page), "--page-size", "50"], signal));
        if (!Array.isArray(data.experiments)) throw new Error("Invalid experiment list");
        for (const value of data.experiments) {
          const row = record(value), id = identifier(row.id);
          const details = [`#${id}`];
          if (typeof row.app_name === "string" && row.app_name.trim()) details.push(row.app_name.trim().slice(0, 200));
          if (typeof row.version_resource === "number" && Number.isFinite(row.version_resource) && row.version_resource >= 0 && row.version_resource <= 1) details.push(`流量 ${Number((row.version_resource * 100).toFixed(2))}%`);
          const end = dateDetail(row.end_time); if (end) details.push(end);
          items.set(id, { id, title: text(row.name), status: statuses[String(row.status)] ?? "未知状态", details, url: `https://${host}/libra/flight/${id}/report/main` });
          if (items.size >= MAX_ITEMS) return { items: [...items.values()], complete: false };
        }
        // Some CLI versions substitute the page length for an absent server total.
        if (data.experiments.length < 50) return { items: [...items.values()], complete: true };
      }
      return { items: [...items.values()], complete: false };
    },
  };
}
