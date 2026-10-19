import { registerHomeSection } from "@c0sc0s/orbit/ui";
import type { HomeSection } from "@c0sc0s/orbit/ui";
import type { RuntimeI18n } from "./i18n";
import type { SessionEntry } from "./models";

interface Options {
  i18n: RuntimeI18n;
  getEntries(): SessionEntry[];
  openEntry(entry: SessionEntry): void;
}

export function createRunningSessionsHomeSection(options: Options) {
  const views = new Set<() => void>();
  const section: HomeSection = {
    id: "orbit-tags-running-sessions", title: "正在运行", slot: "main", order: 0,
    mount(container, header) {
      const document = container.ownerDocument;
      const host = document.createElement("div"), shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style"), summary = document.createElement("p"), list = document.createElement("ul");
      style.textContent = `
        :host { display:block; font:inherit; color:inherit; } * { box-sizing:border-box; }
        [hidden] { display:none !important; }
        .running-summary { margin:0; color:var(--color-text-secondary,GrayText); font-size:12px; }
        ul { display:grid; gap:2px; margin:0; padding:0; list-style:none; }
        button { display:flex; align-items:center; gap:10px; width:100%; min-height:40px; padding:8px 10px; border:0; border-radius:7px; background:transparent; color:inherit; font:inherit; text-align:start; cursor:pointer; }
        button:hover { background:var(--color-background-primary-hover,var(--color-token-main-surface-secondary,#8881)); }
        button:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:2px; }
        .running-indicator { flex:none; width:12px; height:12px; border:1.5px solid var(--color-border,#8883); border-top-color:var(--color-text-success,#63b98f); border-radius:50%; animation:running-spin 1s linear infinite; }
        .running-copy { display:flex; align-items:center; gap:10px; min-width:0; }
        .running-title { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:13px; line-height:1.5; }
        .running-tag { flex:none; max-width:160px; padding:2px 6px; border-radius:4px; color:var(--tag-color); background:color-mix(in srgb,var(--tag-color) 9%,transparent); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
        @media(max-width:480px) { .running-copy { flex:1; flex-wrap:wrap; gap:4px 8px; } .running-title { flex-basis:100%; } }
        @keyframes running-spin { to { transform:rotate(360deg); } }
        @media(prefers-reduced-motion:reduce) { .running-indicator { animation:none; } }
      `;
      summary.className = "running-summary"; summary.setAttribute("role", "status");
      shadow.append(style, summary, list); container.append(host);
      const rows = new Map<string, { item: HTMLLIElement; button: HTMLButtonElement; title: HTMLElement; tag: HTMLElement; entry: SessionEntry }>();
      const update = () => {
        const entries = options.getEntries(), keys = new Set(entries.map(entry => entry.key));
        summary.textContent = options.i18n.t(entries.length ? "runningSessionCount" : "noRunningSessions", { count: entries.length });
        summary.hidden = Boolean(header) && entries.length > 0;
        host.hidden = entries.length === 0;
        if (header) header.summary.textContent = String(entries.length);
        list.hidden = entries.length === 0;
        for (const [key, row] of rows) if (!keys.has(key)) { row.item.remove(); rows.delete(key); }
        for (const [index, entry] of entries.entries()) {
          let row = rows.get(entry.key);
          if (!row) {
            const item = document.createElement("li"), button = document.createElement("button"), indicator = document.createElement("span");
            const title = document.createElement("span"), tag = document.createElement("span");
            button.type = "button"; indicator.className = "running-indicator"; indicator.setAttribute("aria-hidden", "true");
            title.className = "running-title"; tag.className = "running-tag";
            const copy = document.createElement("span"); copy.className = "running-copy"; copy.append(title, tag);
            button.append(indicator, copy); item.append(button);
            const next = { item, button, title, tag, entry };
            button.addEventListener("click", () => options.openEntry(next.entry));
            row = next; rows.set(entry.key, row);
          }
          row.entry = entry; row.button.dataset.threadId = entry.threadId;
          row.button.setAttribute("aria-label", options.i18n.t("openRunningSession", { title: entry.raw }));
          row.title.textContent = entry.title; row.title.title = entry.raw; row.tag.textContent = entry.tag;
          row.tag.hidden = !entry.tagged;
          row.tag.style.setProperty("--tag-color", /^#[\da-f]{6}$/iu.test(entry.color) ? entry.color : "currentColor");
          if (list.children[index] !== row.item) list.insertBefore(row.item, list.children[index] ?? null);
        }
      };
      views.add(update);
      try { update(); } catch (error) { views.delete(update); host.remove(); throw error; }
      return () => { views.delete(update); host.remove(); };
    },
  };
  let unregister: (() => void) | undefined;
  const refresh = () => {
    if (options.getEntries().length) unregister ??= registerHomeSection(section);
    else { unregister?.(); unregister = undefined; }
    for (const update of views) update();
  };
  refresh();
  return { refresh, dispose() { unregister?.(); unregister = undefined; } };
}
