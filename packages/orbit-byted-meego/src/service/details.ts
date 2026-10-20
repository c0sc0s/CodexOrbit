import type { CliQuery } from "@c0sc0s/orbit-byted/service";
import { record } from "@c0sc0s/orbit-byted/model";
import type { BugDetail, BugItem, BugComment } from "../shared/model.js";
import { meegoData } from "./meego.js";
import { readableMarkdown } from "../shared/readable.js";

const fields = ["description", "field_d51e29", "bug_description", "severity", "priority", "updated_at", "discovery_version", "resolve_version", "bug_classification", "current_status_operator"];
function plain(value: unknown, limit: number): string {
  if (typeof value !== "string") return "";
  const content = value.replace(/\r\n/gu, "\n").trim();
  const suffix = "\n[内容较长，已截断；完整内容请查看原工单]";
  return content.length > limit ? content.slice(0, limit - suffix.length) + suffix : content;
}
function label(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value).slice(0, 500);
  if (Array.isArray(value)) return value.map(label).filter(Boolean).join("、").slice(0, 500);
  if (value && typeof value === "object") {
    const item = record(value);
    return label(item.label ?? item.name ?? item.iso_time ?? "");
  }
  return "";
}
export async function loadBugDetail(query: CliQuery, bug: BugItem, includeComments: boolean, signal: AbortSignal): Promise<BugDetail> {
  const data = meegoData(await query(["meego", "workitem", "get", "--project-key", bug.projectKey, "--work-item-id", bug.workItemId, "--fields", JSON.stringify(fields)], signal));
  const attributes = record(data.work_item_attribute);
  if (!Array.isArray(data.work_item_fields)) throw new Error("Invalid bug details");
  const values = data.work_item_fields.map(record);
  const descriptions = values.filter(value => ["description", "field_d51e29", "bug_description"].includes(String(value.key))).map(value => readableMarkdown(plain(value.value, 16000))).filter(Boolean);
  const metadata = values.filter(value => !["description", "field_d51e29", "bug_description"].includes(String(value.key)))
    .map(value => ({ name: plain(value.name, 80), value: label(value.value) })).filter(value => value.name && value.value).slice(0, 12);
  const comments: BugComment[] = [];
  let commentsComplete = true;
  if (includeComments) {
    for (let page = 1; page <= 5; page++) {
      const payload = meegoData(await query(["meego", "comment", "list", "--project-key", bug.projectKey, "--work-item-id", bug.workItemId, "--page", String(page)], signal));
      if (!Array.isArray(payload.comments)) throw new Error("Invalid bug comments");
      for (const value of payload.comments) {
        const comment = record(value), body = plain(comment.content, 2000);
        if (!body) continue;
        const author = comment.create_by && typeof comment.create_by === "object" ? label(comment.create_by) : label(comment.user ?? comment.author ?? "评论");
        comments.push({ author: author || "评论", time: label(comment.create_time ?? comment.created_at ?? ""), body });
      }
      const pagination = payload.pagination ? record(payload.pagination) : {};
      const pages = typeof pagination.total_pages === "number" ? pagination.total_pages : null;
      if (pages !== null ? page >= pages : payload.comments.length < 20) break;
      if (page === 5) commentsComplete = false;
    }
  }
  comments.sort((a, b) => (Date.parse(a.time) || 0) - (Date.parse(b.time) || 0));
  const status = attributes.work_item_status ? label(attributes.work_item_status) : bug.status;
  return {
    id: bug.id, title: plain(attributes.work_item_name, 512) || bug.title, url: bug.url, projectName: bug.projectName,
    status: status || bug.status, description: plain([...new Set(descriptions)].join("\n\n"), 16000), attributes: metadata,
    comments: comments.slice(-3), commentsComplete, fetchedAt: new Date().toISOString(),
  };
}
