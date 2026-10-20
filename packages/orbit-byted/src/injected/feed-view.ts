import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { registerHomeSection } from "@c0sc0s/orbit/ui";
import type { HomeSectionMountContext } from "@c0sc0s/orbit/ui";
import { isFeedSnapshot } from "../shared/feed.js";
import type { FeedSnapshot } from "../shared/feed.js";
import { feedStyles } from "./styles.js";

export interface FeedViewOptions {
  title: string;
  empty: string;
  order: number;
  homeUrl: string;
  hosts: readonly string[];
  loginCommand: string;
  runtimeVersion: string;
}
const errors = {
  "cli-missing": "未找到 bytedcli，请安装后刷新。",
  auth: "尚未登录或登录已过期，请在终端登录后刷新。",
  permission: "当前账号没有访问权限，请在原平台确认权限后刷新。",
  network: "连接失败，请检查公司网络后重试。",
  data: "返回的数据格式不受支持，请检查 bytedcli 版本后重试。",
  storage: "列表已更新，但本地缓存保存失败。",
};
export function activateFeedView(context: RendererContext, options: FeedViewOptions) {
  const listeners = new Set<() => void>();
  let current: FeedSnapshot | undefined, unavailable = false;
  const accept = (value: unknown) => {
    if (!isFeedSnapshot(value, options.hosts)) { unavailable = true; for (const listener of listeners) listener(); return; }
    if (current && current.generation === value.generation && value.revision < current.revision) return;
    current = value; unavailable = false;
    for (const listener of listeners) listener();
  };
  const request = async (method: string) => {
    try { accept(await context.rpc.call(method)); }
    catch { if (!context.signal.aborted) { unavailable = true; for (const listener of listeners) listener(); } }
  };
  context.onDispose(context.events.subscribe("feed", accept));
  const mount = (container: HTMLElement, header?: HomeSectionMountContext) => {
    const document = container.ownerDocument, host = document.createElement("div"), shadow = host.attachShadow({ mode: "open" });
    const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, content = "") => {
      const node = document.createElement(tag); node.className = className; node.textContent = content; return node;
    };
    const style = element("style", ""); style.textContent = feedStyles;
    const body = element("div", "feed"), notice = element("div", "feed-notice"), empty = element("div", "feed-empty");
    const list = element("ul", "feed-list"), footer = element("div", "feed-footer"), actions = element("div", "feed-actions");
    const count = element("span", ""), refresh = element("button", "", "刷新"), open = element("a", "", "打开原平台");
    refresh.type = "button"; refresh.setAttribute("aria-label", `刷新${options.title}`);
    open.href = options.homeUrl; open.target = "_blank"; open.rel = "noopener noreferrer";
    open.style.cssText = "font:inherit;font-size:12px;color:var(--color-text-secondary,GrayText);text-decoration:none;padding:3px 0";
    refresh.addEventListener("click", () => { void request("refreshFeed"); });
    if (header) { header.summary.append(count); header.actions.append(refresh, open); }
    else { actions.append(count, refresh, open); body.append(actions); }
    notice.setAttribute("role", "status");
    list.setAttribute("aria-label", options.title);
    body.append(notice, empty, list, footer); shadow.append(style, body); container.append(host);
    let previousItems: FeedSnapshot["items"] | undefined;
    const render = () => {
      const data = current;
      refresh.disabled = Boolean(data?.refreshing); refresh.textContent = data?.refreshing ? "刷新中…" : "刷新";
      body.setAttribute("aria-busy", String(Boolean(data?.refreshing)));
      count.textContent = data?.updatedAt ? `${data.items.length}${data.complete ? "" : "+"}` : "";
      notice.replaceChildren();
      if (unavailable) notice.textContent = "插件服务暂不可用，请重试。";
      else if (data?.error) {
        notice.textContent = `${errors[data.error]}${data.updatedAt && data.error !== "storage" ? " 当前显示上次同步的列表。" : ""}`;
        if (data.error === "auth") notice.append(element("code", "feed-command", options.loginCommand));
      }
      notice.hidden = !notice.textContent;
      empty.hidden = Boolean(data?.items.length) || Boolean(data?.error) || unavailable;
      empty.textContent = !data?.updatedAt ? "正在获取列表…" : !data.complete ? "列表尚未取全，请刷新重试。" : options.empty;
      if (data?.items !== previousItems) {
        previousItems = data?.items;
        const scrollTop = list.scrollTop;
        const fragment = document.createDocumentFragment();
        for (const item of data?.items ?? []) {
          const row = element("li", ""), link = element("a", "feed-link"), title = element("div", "feed-title");
          link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer";
          title.append(element("span", "feed-name", item.title), element("span", "feed-status", item.status));
          link.append(title);
          if (item.details.length) link.append(element("div", "feed-details", item.details.join(" · ")));
          row.append(link); fragment.append(row);
        }
        list.replaceChildren(fragment); list.scrollTop = scrollTop;
      }
      footer.replaceChildren();
      if (data?.updatedAt) {
        const date = new Date(data.updatedAt), time = element("time", "", `更新于 ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`);
        time.dateTime = date.toISOString(); time.title = date.toLocaleString("zh-CN"); footer.append(time);
        if (!data.complete) footer.append(element("span", "", "仅显示部分结果"));
      }
      header?.setCompact(Boolean(data?.updatedAt && !data.items.length && !data.error && !unavailable));
    };
    listeners.add(render); render(); void request("getFeed");
    return () => { listeners.delete(render); count.remove(); refresh.remove(); open.remove(); host.remove(); };
  };
  context.onDispose(registerHomeSection({ id: `${context.id}.list`, title: options.title, slot: "main", order: options.order, mount }));
  context.onDispose(() => listeners.clear());
  return { status: () => ({ version: options.runtimeVersion, count: current?.items.length ?? null, updatedAt: current?.updatedAt ?? null, refreshing: current?.refreshing ?? false, error: current?.error ?? null }) };
}
