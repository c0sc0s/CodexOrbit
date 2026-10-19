import { registerHomeSection } from "@c0sc0s/orbit/ui";
import { summarizeTags } from "./tag-summary";
import type { SessionEntry, TagDefinition } from "./models";
import type { RuntimeI18n } from "./i18n";


interface Options {
  i18n: RuntimeI18n;
  getEntries(): SessionEntry[];
  getDefinitions(): TagDefinition[];
  getAvailability(): { complete: boolean; error: boolean };
  openTag(tag: string): void;
}

export function createTagsHomeSection(options: Options) {
  const views = new Set<() => void>();
  const unregister = registerHomeSection({ id: "orbit-tags", title: "标签", slot: "overview", order: 100, mount(container, header) {
    const host = document.createElement("div"), shadow = host.attachShadow({ mode: "open" }), style = document.createElement("style"), content = document.createElement("div");
    style.textContent = `
      :host { display:block; font:inherit; color:inherit; } * { box-sizing:border-box; }
      [hidden] { display:none !important; }
      button { color:inherit; font:inherit; cursor:pointer; border:0; border-radius:8px; background:transparent; }
      button:hover { background:var(--color-background-primary-hover,var(--color-token-main-surface-secondary,#8881)); }
      button:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:2px; }
      .tags-home-total { display:flex; align-items:baseline; gap:6px; margin:0 0 12px; padding:0; font-size:12px; }
      .tags-home-total strong { font-weight:400; font-variant-numeric:tabular-nums; }
      .tags-home-grid { display:flex; flex-wrap:wrap; gap:4px 8px; }
      .tags-home-grid button { display:flex; align-items:center; gap:8px; min-height:30px; padding:5px 8px; border-radius:6px; font-size:12px; }
      .tags-home-grid .tags-home-more { opacity:.6; }
      .tags-home-grid i { display:block; width:6px; height:6px; flex:none; border-radius:50%; background:var(--tag-color); }
      .tags-home-grid span:last-child { opacity:.6; font-variant-numeric:tabular-nums; }
      .tags-home-status { margin:12px 0 0; font-size:12px; opacity:.65; }
    `;
    shadow.append(style, content); container.append(host);
    const total = document.createElement("button"), totalCount = document.createElement("strong"), totalLabel = document.createElement("span"), grid = document.createElement("div"), status = document.createElement("p");
    total.type = "button"; total.className = "tags-home-total"; total.dataset.tag = "all";
    total.append(totalCount, totalLabel); total.addEventListener("click", () => options.openTag("all"));
    const more = document.createElement("button"); more.type = "button"; more.className = "tags-home-more";
    let expanded = false;
    more.addEventListener("click", () => { expanded = !expanded; update(); });
    grid.className = "tags-home-grid"; status.className = "tags-home-status";
    if (header) header.summary.append(total); else content.append(total);
    content.append(grid, status);
    const buttons = new Map<string, { button: HTMLButtonElement; dot: HTMLElement; name: HTMLElement; count: HTMLElement }>();
    const update = () => {
      const entries = options.getEntries(), availability = options.getAvailability(), tags = summarizeTags(entries, options.getDefinitions()).sort((a, b) => b.count - a.count);
      totalCount.textContent = String(entries.length); totalLabel.textContent = "个会话";
      const keys = new Set(tags.map(tag => tag.name.toLocaleLowerCase()));
      for (const [key, view] of buttons) if (!keys.has(key)) { view.button.remove(); buttons.delete(key); }
      for (const [index, tag] of tags.entries()) {
        const key = tag.name.toLocaleLowerCase();
        let view = buttons.get(key);
        if (!view) {
          const button = document.createElement("button"), dot = document.createElement("i"), name = document.createElement("span"), count = document.createElement("span");
          button.type = "button"; dot.setAttribute("aria-hidden", "true"); button.append(dot, name, count);
          button.addEventListener("click", () => options.openTag(button.dataset.tag!));
          view = { button, dot, name, count }; buttons.set(key, view);
        }
        view.button.dataset.tag = tag.name; view.button.setAttribute("aria-label", `${tag.name} · ${options.i18n.t("sessionCount", { count: tag.count })}`);
        if (/^#[\da-f]{6}$/iu.test(tag.color)) view.dot.style.setProperty("--tag-color", tag.color);
        view.name.textContent = tag.name; view.count.textContent = String(tag.count);
        view.button.hidden = !expanded && index >= 5;
        if (grid.children[index] !== view.button) grid.insertBefore(view.button, grid.children[index] ?? null);
      }
      more.hidden = tags.length <= 5; more.textContent = expanded ? "收起" : "更多";
      more.setAttribute("aria-expanded", String(expanded)); grid.append(more);
      content.setAttribute("aria-busy", String(!availability.complete)); status.hidden = availability.complete;
      status.setAttribute("role", availability.error ? "alert" : "status");
      status.textContent = availability.complete ? "" : options.i18n.t(availability.error ? "catalogUnavailable" : "catalogLoading");
    };
    views.add(update);
    try { update(); } catch (error) { views.delete(update); total.remove(); host.remove(); throw error; }
    return () => { views.delete(update); total.remove(); host.remove(); };
  } });
  return { refresh() { for (const update of views) update(); }, dispose: unregister };
}
