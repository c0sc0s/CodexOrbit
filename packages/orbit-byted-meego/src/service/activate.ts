import type { ServiceContext } from "@c0sc0s/orbit/sdk";
import { activateFeed, createCliQuery } from "@c0sc0s/orbit-byted/service";
import { bugSource } from "./bugs.js";
import { loadBugDetail } from "./details.js";
import { isBugItem } from "../shared/model.js";
import { record } from "@c0sc0s/orbit-byted/model";
import { BugPreferencesRepository } from "./preferences.js";
import { isAbsolute } from "node:path";

export function activate(context: ServiceContext) {
  const query = createCliQuery(context.config), feed = activateFeed(context, bugSource(query, context.config));
  const directory = typeof context.config.dataDirectory === "string" && isAbsolute(context.config.dataDirectory) ? context.config.dataDirectory : context.stateDirectory;
  const preferences = new BugPreferencesRepository(directory);
  context.rpc.handle("getPreferences", () => preferences.read());
  context.rpc.handle("setPreferences", async input => {
    const value = await preferences.update(input); context.events.publish("preferences", value); return value;
  });
  context.rpc.handle("getBug", async (input, request) => {
    const value = record(input);
    if (typeof value.id !== "string" || typeof value.includeComments !== "boolean" || Object.keys(value).some(key => !["id", "includeComments"].includes(key))) throw new Error("Invalid bug request");
    await feed.ready;
    const bug = feed.snapshot().items.find(item => item.id === value.id);
    if (!isBugItem(bug)) throw new Error("Bug is not in the personal pending list");
    return loadBugDetail(query, bug, value.includeComments, AbortSignal.any([request.signal, context.signal]));
  });
}
