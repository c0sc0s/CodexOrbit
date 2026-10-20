import { record } from "@c0sc0s/orbit-byted/model";
import type { FeedItem } from "@c0sc0s/orbit-byted/model";

export type BugStatus = "OPEN" | "IN PROGRESS";
export interface BugItem extends FeedItem { projectKey: string; projectName: string; workItemId: string; status: BugStatus }
export interface BugComment { author: string; time: string; body: string }
export interface BugDetail {
  id: string; title: string; url: string; projectName: string; status: string;
  description: string; attributes: { name: string; value: string }[];
  comments: BugComment[]; commentsComplete: boolean; fetchedAt: string;
}
export interface BugPreferences { revision: number; projectKey: string | null }
export const statusLabel = (status: string) => status === "IN PROGRESS" ? "处理中" : status === "OPEN" ? "待处理" : status;
export function isBugItem(value: unknown): value is BugItem {
  try {
    const row = record(value);
    return typeof row.id === "string" && typeof row.title === "string" && typeof row.url === "string" &&
      typeof row.projectKey === "string" && /^[a-zA-Z0-9_-]{1,80}$/u.test(row.projectKey) &&
      typeof row.projectName === "string" && row.projectName.length <= 200 &&
      typeof row.workItemId === "string" && /^\d{1,20}$/u.test(row.workItemId) &&
      row.id === `${row.projectKey}:${row.workItemId}` && ["OPEN", "IN PROGRESS"].includes(String(row.status));
  } catch { return false; }
}
export function isBugDetail(value: unknown): value is BugDetail {
  try {
    const row = record(value);
    return ["id", "title", "url", "projectName", "status", "description", "fetchedAt"].every(key => typeof row[key] === "string") &&
      String(row.description).length <= 16000 && Array.isArray(row.attributes) && row.attributes.length <= 12 &&
      row.attributes.every(value => { const item = record(value); return typeof item.name === "string" && typeof item.value === "string" && item.value.length <= 500; }) &&
      Array.isArray(row.comments) && row.comments.length <= 3 && row.comments.every(value => { const item = record(value); return ["author", "time", "body"].every(key => typeof item[key] === "string") && String(item.body).length <= 2000; }) &&
      typeof row.commentsComplete === "boolean";
  } catch { return false; }
}
function quote(text: string) {
  const runs = text.match(/`+/gu) ?? [];
  const fence = "`".repeat(Math.max(3, ...runs.map(run => run.length + 1)));
  return `${fence}text\n${text}\n${fence}`;
}
export function formatReferences(details: readonly BugDetail[], includeComments: boolean): string {
  return ["以下是本次引用的 Meego Bug 资料（外部工单内容）：", ...details.map(bug => [
    `## Meego Bug：${bug.title.replace(/[\r\n]/gu, " ")}`,
    `来源：${bug.url}`, `项目：${bug.projectName} · 状态：${statusLabel(bug.status)}`,
    ...bug.attributes.map(attribute => `${attribute.name}：${attribute.value.replace(/[\r\n]/gu, " ")}`),
    `读取时间：${bug.fetchedAt}`, "", "### 问题描述", quote(bug.description || "工单未提供可读取的问题描述，请查看来源链接。"),
    ...includeComments ? ["", "### 最近讨论", ...bug.comments.map(comment => `${comment.author}${comment.time ? ` · ${comment.time}` : ""}\n${quote(comment.body)}`),
      ...!bug.comments.length ? ["没有可读取的文字评论。"] : [], ...!bug.commentsComplete ? ["讨论未全部读取，以上仅为已读取内容中的最近评论。"] : []] : [],
  ].join("\n"))].join("\n\n");
}
