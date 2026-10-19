export interface HomeSectionMountContext {
  summary: HTMLElement;
  actions: HTMLElement;
  setCompact(compact: boolean): void;
}

export interface HomeSection {
  /** Stable, plugin-owned identity; also keys the visibility preference. */
  id: string;
  title: string;
  slot?: "overview" | "main";
  order?: number;
  defaultVisible?: boolean;
  mount(container: HTMLElement, context?: HomeSectionMountContext): () => void;
}
export interface HomeSectionFailure { id: string; phase: "mount" | "dispose" }
interface Registry { sections: Map<string, HomeSection>; listeners: Set<() => void> }

function registry(document: Document): Registry {
  const owner = document.defaultView;
  if (!owner) throw new Error("Home sections require a browser document");
  // Each plugin bundles this module; the isolated-world symbol joins those copies.
  const key = Symbol.for("@c0sc0s/orbit/ui/home-sections/v1");
  let value = Reflect.get(owner, key) as Registry | undefined;
  if (!value) {
    value = { sections: new Map(), listeners: new Set() };
    Reflect.set(owner, key, value);
  }
  return value;
}

/** Contribute local UI to Home; unregister before unloading its owning plugin. */
export function registerHomeSection(section: HomeSection, document: Document = globalThis.document): () => void {
  if (!/^[a-z][a-z0-9.-]{0,63}$/u.test(section.id) || typeof section.title !== "string" || !section.title.trim() || section.title.length > 80
    || typeof section.mount !== "function" || (section.slot !== undefined && !["overview", "main"].includes(section.slot))
    || (section.order !== undefined && !Number.isSafeInteger(section.order)) || (section.defaultVisible !== undefined && typeof section.defaultVisible !== "boolean")) throw new Error("Invalid Home section");
  const state = registry(document);
  if (state.sections.has(section.id)) throw new Error(`Home section already registered: ${section.id}`);
  const registered = Object.freeze({ ...section, title: section.title.trim() });
  state.sections.set(section.id, registered);
  for (const listener of state.listeners) listener();
  return () => {
    if (state.sections.get(section.id) !== registered) return;
    state.sections.delete(section.id);
    for (const listener of state.listeners) listener();
  };
}

export function getHomeSections(document: Document = globalThis.document): readonly HomeSection[] {
  const rank = (section: HomeSection) => section.slot === "overview" ? 0 : 1;
  return [...registry(document).sections.values()].sort((a, b) => rank(a) - rank(b) || (a.order ?? 100) - (b.order ?? 100) || a.id.localeCompare(b.id));
}

export function subscribeHomeSections(listener: () => void, document: Document = globalThis.document): () => void {
  const state = registry(document);
  state.listeners.add(listener);
  return () => { state.listeners.delete(listener); };
}
