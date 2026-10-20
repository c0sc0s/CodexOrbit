import type { ServiceContext } from "@c0sc0s/orbit/sdk";
import { activateFeed, createCliQuery } from "@c0sc0s/orbit-byted/service";
import { experimentSource } from "./experiments.js";

export function activate(context: ServiceContext) {
  activateFeed(context, experimentSource(createCliQuery(context.config), context.config));
}
