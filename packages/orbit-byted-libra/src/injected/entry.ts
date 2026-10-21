import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { activateFeedView } from "@c0sc0s/orbit-byted/ui";
import { libraSite } from "../shared/site.js";

const RUNTIME_VERSION = "0.1.2";
export function activate(context: RendererContext) {
  const { site, host } = libraSite(context.config);
  return activateFeedView(context, {
    title: "我的实验", empty: "当前没有你负责的未结束实验", order: 210,
    homeUrl: `https://${host}/libra/`, hosts: [host],
    loginCommand: `bytedcli --site ${site} auth login`, runtimeVersion: RUNTIME_VERSION,
  });
}
