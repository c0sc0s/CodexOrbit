import type { HomeSection, HomeSectionFailure } from "@c0sc0s/orbit/ui";
import type { HomePreferences } from "../shared/preferences.js";

export function createSectionHost(container: HTMLElement, onError: (failure: HomeSectionFailure) => void) {
  const document = container.ownerDocument;
  const overview = document.createElement("div"), main = document.createElement("div");
  overview.className = "home-overview"; main.className = "home-main"; container.append(main, overview);
  const mounted = new Map<HomeSection, { element: HTMLElement; dispose: () => void }>();
  let sections: readonly HomeSection[] = [], preferences: HomePreferences;
  const remove = (section: HomeSection) => {
    const entry = mounted.get(section);
    if (!entry) return;
    mounted.delete(section);
    try { entry.dispose(); } catch { onError({ id: section.id, phase: "dispose" }); }
    finally { entry.element.remove(); }
  };
  const refresh = () => {
    const visible = sections.filter(section => {
      const saved = Object.hasOwn(preferences.moduleVisibility, section.id) ? preferences.moduleVisibility[section.id] : undefined;
      return saved ?? section.defaultVisible ?? true;
    });
    for (const section of mounted.keys()) if (!visible.includes(section)) remove(section);
    for (const section of visible) {
      if (mounted.has(section)) continue;
      const element = document.createElement("section"), heading = document.createElement("h2"), body = document.createElement("div");
      const header = document.createElement("header"), summary = document.createElement("span"), actions = document.createElement("div");
      header.className = "home-section-header"; summary.className = "home-section-summary"; actions.className = "home-section-actions";
      body.className = "home-section-body"; header.append(heading, summary, actions);
      element.className = "home-section"; element.dataset.orbitHomeSection = section.id;
      heading.id = `home-section-${section.id}`; heading.textContent = section.title || section.id;
      element.setAttribute("aria-labelledby", heading.id); element.append(header, body);
      const parent = section.slot === "overview" ? overview : main;
      const following = visible.slice(visible.indexOf(section) + 1).find(item => mounted.get(item)?.element.parentElement === parent);
      parent.insertBefore(element, following ? mounted.get(following)!.element : null);
      const entry = { element, dispose: () => {} };
      mounted.set(section, entry);
      try {
        const dispose = section.mount(body, { summary, actions, setCompact(compact) { element.classList.toggle("is-compact", compact); } });
        if (typeof dispose !== "function") throw new Error("Home sections must return cleanup");
        entry.dispose = dispose;
      }
      catch {
        summary.replaceChildren(); actions.replaceChildren(); element.classList.remove("is-compact");
        body.replaceChildren();
        const error = document.createElement("p"), retry = document.createElement("button");
        error.textContent = "暂时无法显示"; error.setAttribute("role", "alert");
        retry.type = "button"; retry.textContent = "重试";
        retry.addEventListener("click", () => { remove(section); refresh(); });
        body.append(error, retry); onError({ id: section.id, phase: "mount" });
      }
    }
    overview.hidden = !overview.children.length; main.hidden = !main.children.length;
  };
  return {
    update(next: readonly HomeSection[], settings: HomePreferences) { sections = next; preferences = settings; refresh(); },
    dispose() { for (const section of mounted.keys()) remove(section); overview.remove(); main.remove(); },
  };
}
