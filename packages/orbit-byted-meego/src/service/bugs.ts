import type { CliQuery, FeedSource } from "@c0sc0s/orbit-byted/service";
import { MAX_ITEMS, identifier, record, text } from "@c0sc0s/orbit-byted/model";
import type { BugItem } from "../shared/model.js";
import { meegoData } from "./meego.js";

export const MEEGO_HOST = "meego.larkoffice.com";
export function bugSource(query: CliQuery, config: Record<string, unknown>): FeedSource {
  const filter = config.projectKeys;
  if (filter !== undefined && (!Array.isArray(filter) || filter.length > 50 || filter.some(key => typeof key !== "string" || !/^[a-zA-Z0-9_-]{1,80}$/u.test(key)))) throw new Error("Invalid projectKeys");
  const projects = filter as string[] | undefined;
  return {
    key: JSON.stringify({ type: "meego-bugs-v2", projects: projects ? [...new Set(projects)].sort() : null, cliPath: config.cliPath ?? null }),
    hosts: [MEEGO_HOST],
    async load(signal) {
      const items = new Map<string, BugItem>();
      for (let page = 1; page <= 20; page++) {
        signal.throwIfAborted();
        const data = meegoData(await query(["meego", "todo", "list", "--action", "todo", "--todo-scope", "all", "--page", String(page)], signal));
        if (!Array.isArray(data.list)) throw new Error("Invalid todo list");
        for (const value of data.list) {
          const row = record(value), info = record(row.work_item_info);
          if (typeof info.work_item_type_key !== "string") throw new Error("Invalid work item type");
          if (info.work_item_type_key !== "issue") continue;
          const project = text(row.project_key, 80);
          if (!/^[a-zA-Z0-9_-]+$/u.test(project)) throw new Error("Invalid project");
          if (projects && !projects.includes(project)) continue;
          const state = row.state_info ? record(row.state_info) : {};
          const status = typeof state.start_state_key_name === "string" ? state.start_state_key_name.trim().toUpperCase() : "";
          if (status !== "OPEN" && status !== "IN PROGRESS") continue;
          const id = identifier(info.work_item_id), key = `${project}:${id}`;
          const projectName = text(row.project_name, 200);
          items.set(key, {
            id: key, title: text(info.work_item_name), status, projectKey: project, projectName, workItemId: id,
            url: `https://${MEEGO_HOST}/${encodeURIComponent(project)}/issue/detail/${id}`,
            details: [`#${id}`, projectName],
          });
          if (items.size >= MAX_ITEMS) return { items: [...items.values()], complete: false };
        }
        if (data.list.length < 50) {
          const sorted = [...items.values()].sort((a, b) => (a.status === "IN PROGRESS" ? 0 : 1) - (b.status === "IN PROGRESS" ? 0 : 1));
          return { items: sorted, complete: true };
        }
      }
      return { items: [...items.values()], complete: false };
    },
  };
}
