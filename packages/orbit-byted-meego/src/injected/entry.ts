import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { registerHomeSection } from "@c0sc0s/orbit/ui";
import { BugStore } from "./store.js";
import { element, icon, mountBugList } from "./list-view.js";
import { openBugPicker } from "./picker.js";
import type { BugItem } from "../shared/model.js";
import { styles } from "./styles.js";

const RUNTIME_VERSION = "0.2.3";
export function activate(context: RendererContext) {
  const document = globalThis.document, store = new BugStore(context);
  let picker: (() => void) | null = null;
  const open = (initial?: BugItem) => {
    if (picker) return;
    picker = openBugPicker(document, store, initial, () => { picker = null; });
  };
  context.onDispose(() => picker?.());
  context.onDispose(registerHomeSection({ id: `${context.id}.list`, title: "我的 Bug", slot: "main", order: 200, mount(container, header) {
    const host = element(document, "div"), shadow = host.attachShadow({ mode: "open" }), body = element(document, "div");
    shadow.append(element(document, "style", "", styles), body); container.append(host);
    const count = element(document, "span"), refresh = element(document, "button");
    refresh.append(icon(document, "M20 7v5h-5M4 17v-5h5M6.1 7a7 7 0 0 1 11.6-2L20 8M4 16l2.3 3A7 7 0 0 0 18 17"));
    refresh.title = "刷新 Bug"; refresh.setAttribute("aria-label", "刷新 Bug");
    refresh.style.cssText = "font:inherit;font-size:12px;color:var(--color-text-secondary,GrayText);padding:3px 0;background:transparent;border:0;cursor:pointer;display:inline-flex;align-items:center";
    const actions = header?.actions ?? body; (header?.summary ?? body).append(count); actions.append(refresh);
    refresh.addEventListener("click", () => { void store.refresh(); });
    const list = mountBugList(body, store, { preview: bug => open(bug), reference: bug => open(bug) });
    const render = () => {
      const bugs = store.bugs.filter(bug => !store.preferences.projectKey || bug.projectKey === store.preferences.projectKey);
      count.textContent = store.snapshot?.updatedAt ? `${bugs.length}${store.snapshot.complete ? "" : "+"}` : "";
      refresh.disabled = Boolean(store.snapshot?.refreshing); refresh.setAttribute("aria-label", refresh.disabled ? "正在刷新 Bug" : "刷新 Bug");
      header?.setCompact(false);
    };
    const unsubscribe = store.subscribe(render); render(); void store.refresh(false);
    return () => { unsubscribe(); list.dispose(); count.remove(); refresh.remove(); host.remove(); };
  } }));
  return { status: () => ({ version: RUNTIME_VERSION, count: store.snapshot?.items.length ?? null, updatedAt: store.snapshot?.updatedAt ?? null, refreshing: store.snapshot?.refreshing ?? false, error: store.snapshot?.error ?? null, pickerOpen: Boolean(picker) }) };
}
