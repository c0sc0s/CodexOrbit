import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { registerHomeSection } from "@c0sc0s/orbit/ui";
import type { HomeSectionMountContext } from "@c0sc0s/orbit/ui";
import { isFeedSnapshot } from "../shared/feed.js";
import type { FeedSnapshot } from "../shared/feed.js";
import { feedStyles, toolbarStyles } from "./styles.js";

export interface FeedViewOptions {
  title: string;
  empty: string;
  order: number;
  homeUrl: string;
  hosts: readonly string[];
  loginCommand: string;
  runtimeVersion: string;
  dismissible?: boolean;
  platformLabel?: string;
  statusTones?: Readonly<Record<string, "positive" | "warning" | "info">>;
}
function icon(document: Document, path: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  for (const [name, value] of Object.entries({ viewBox: "0 0 24 24", width: "14", height: "14", fill: "none", stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(name, value);
  const shape = document.createElementNS(svg.namespaceURI, "path"); shape.setAttribute("d", path); svg.append(shape);
  return svg;
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
    const count = element("span", ""), toolbar = element("span", ""), controls = toolbar.attachShadow({ mode: "open" });
    const controlStyle = element("style", ""); controlStyle.textContent = toolbarStyles;
    const buttons = element("div", "feed-toolbar"), updated = element("time", "feed-updated");
    const refresh = element("button", "feed-refresh"), open = element("a", "feed-platform");
    const refreshLabel = `刷新${options.title}`;
    count.style.cssText = "display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 6px;border-radius:6px;background:var(--color-background-primary-hover,#8881);color:var(--color-text-secondary,GrayText);font-size:11px;font-variant-numeric:tabular-nums";
    refresh.type = "button"; refresh.setAttribute("aria-label", refreshLabel); refresh.title = refreshLabel;
    refresh.append(icon(document, "M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"));
    open.href = options.homeUrl; open.target = "_blank"; open.rel = "noopener noreferrer";
    open.setAttribute("aria-label", `打开${options.platformLabel ?? "原平台"}`);
    open.append(element("span", "", options.platformLabel ?? "原平台"), icon(document, "M14 3h7v7M21 3l-9 9M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"));
    buttons.append(updated, refresh, open); controls.append(controlStyle, buttons);
    refresh.addEventListener("click", () => { void request("refreshFeed"); });
    if (header) { header.summary.append(count); header.actions.append(toolbar); }
    else { actions.append(count, toolbar); body.append(actions); }
    notice.setAttribute("role", "status");
    list.setAttribute("aria-label", options.title);
    body.append(notice, empty, list, footer); shadow.append(style, body); container.append(host);
    let previousItems: FeedSnapshot["items"] | undefined;
    const dismissing = new Set<string>();
    let dismissError = "";
    const dismiss = async (id: string) => {
      if (dismissing.has(id)) return;
      dismissing.add(id); dismissError = ""; render();
      try {
        const value = await context.rpc.call("dismissFeedItem", { id });
        if (!isFeedSnapshot(value, options.hosts)) throw new Error("Invalid feed response");
        accept(value);
      } catch {
        if (!context.signal.aborted) dismissError = "删除失败，请重试。";
      } finally { dismissing.delete(id); render(); }
    };
    const render = () => {
      const data = current;
      refresh.disabled = Boolean(data?.refreshing);
      refresh.setAttribute("aria-label", data?.refreshing ? "正在刷新…" : refreshLabel);
      refresh.title = data?.refreshing ? "正在刷新…" : refreshLabel;
      refresh.classList.toggle("is-loading", Boolean(data?.refreshing));
      body.setAttribute("aria-busy", String(Boolean(data?.refreshing)));
      count.textContent = data?.updatedAt ? `${data.items.length}${data.complete ? "" : "+"}` : "";
      count.style.display = count.textContent ? "inline-flex" : "none";
      notice.replaceChildren();
      if (dismissError) notice.textContent = dismissError;
      else if (unavailable) notice.textContent = "插件服务暂不可用，请重试。";
      else if (data?.error) {
        notice.textContent = `${errors[data.error]}${data.updatedAt && data.error !== "storage" ? " 当前显示上次同步的列表。" : ""}`;
        if (data.error === "auth") notice.append(element("code", "feed-command", options.loginCommand));
      }
      notice.hidden = !notice.textContent;
      empty.hidden = Boolean(data?.items.length) || Boolean(data?.error) || unavailable;
      empty.textContent = !data?.updatedAt ? "正在获取列表…" : !data.complete ? "列表尚未取全，请刷新重试。" : options.empty;
      if (data?.items !== previousItems) {
        previousItems = data?.items;
        const focused = shadow.activeElement as HTMLElement | null, focusId = focused?.dataset.feedFocus;
        const scrollTop = list.scrollTop;
        const fragment = document.createDocumentFragment();
        for (const item of data?.items ?? []) {
          const row = element("li", "feed-row"), link = element("a", "feed-link"), title = element("div", "feed-title");
          link.href = item.url; link.target = "_blank"; link.rel = "noopener noreferrer";
          link.dataset.feedFocus = `open:${item.id}`;
          const status = element("span", "feed-status", item.status);
          status.dataset.tone = options.statusTones?.[item.status] ?? "neutral";
          title.append(element("span", "feed-name", item.title), status);
          link.append(title);
          if (item.details.length) {
            const details = element("div", "feed-details");
            for (const detail of item.details) details.append(element("span", "feed-detail", detail));
            link.append(details);
          }
          row.append(link);
          if (options.dismissible) {
            const remove = element("button", "feed-remove");
            remove.type = "button"; remove.dataset.itemId = item.id;
            remove.dataset.feedFocus = `remove:${item.id}`;
            remove.append(icon(document, "M3 6h18M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M5 6l1 14a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1l1-14M10 10v7M14 10v7"));
            remove.setAttribute("aria-label", `删除“${item.title}”`);
            remove.title = "从列表删除，原平台上的数据保留";
            remove.addEventListener("click", () => { void dismiss(item.id); });
            row.append(remove);
          }
          if (item.meter) {
            const { label, value } = item.meter, meter = element("span", "feed-meter");
            meter.setAttribute("role", "meter"); meter.setAttribute("aria-label", label);
            meter.setAttribute("aria-valuemin", "0"); meter.setAttribute("aria-valuemax", "100");
            meter.setAttribute("aria-valuenow", String(value)); meter.setAttribute("aria-valuetext", `${value}%`);
            const fill = element("span", "feed-meter-fill"); fill.style.width = `${value}%`; fill.setAttribute("aria-hidden", "true");
            const text = element("span", "feed-meter-label", `${label} ${value}%`); text.setAttribute("aria-hidden", "true");
            meter.append(fill, text); row.append(meter);
          }
          fragment.append(row);
        }
        list.replaceChildren(fragment); list.scrollTop = scrollTop;
        if (focusId) [...list.querySelectorAll<HTMLElement>("[data-feed-focus]")].find(node => node.dataset.feedFocus === focusId)?.focus({ preventScroll: true });
      }
      for (const button of list.querySelectorAll<HTMLButtonElement>(".feed-remove")) {
        button.disabled = dismissing.has(button.dataset.itemId!);
        button.setAttribute("aria-busy", String(button.disabled));
        button.title = button.disabled ? "正在删除…" : "从列表删除，原平台上的数据保留";
      }
      footer.replaceChildren();
      updated.hidden = !data?.updatedAt;
      if (data?.updatedAt) {
        const date = new Date(data.updatedAt);
        updated.textContent = `${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })} 更新`;
        updated.dateTime = date.toISOString(); updated.title = date.toLocaleString("zh-CN");
        if (!data.complete) footer.append(element("span", "", "仅显示部分结果"));
      }
      footer.hidden = !footer.textContent;
      header?.setCompact(Boolean(data?.updatedAt && !data.items.length && !data.error && !unavailable));
    };
    listeners.add(render); render(); void request("getFeed");
    return () => { listeners.delete(render); count.remove(); toolbar.remove(); host.remove(); };
  };
  context.onDispose(registerHomeSection({ id: `${context.id}.list`, title: options.title, slot: "main", order: options.order, mount }));
  context.onDispose(() => listeners.clear());
  return { status: () => ({ version: options.runtimeVersion, count: current?.items.length ?? null, updatedAt: current?.updatedAt ?? null, refreshing: current?.refreshing ?? false, error: current?.error ?? null }) };
}
