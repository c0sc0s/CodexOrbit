/** Values must be unique; labels are rendered as text, never HTML. */
export interface SelectChoice { value: string; label: string; disabled?: boolean }
export interface SelectState { value: string; choices: readonly SelectChoice[] }
export interface SelectOptions extends SelectState { onChange(value: string): void }
export interface SelectControl {
  /** Apply controlled state without invoking onChange. */
  update(state: SelectState): void;
  close(): void;
  dispose(): void;
}

const styles = `
.orbit-ui-select-trigger { display:inline-flex; align-items:center; justify-content:space-between; gap:10px; min-width:0; min-height:32px; padding:6px 9px; border:1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius:8px; background:var(--color-background-control, var(--color-token-input-background, Canvas)); color:var(--color-text-foreground, var(--color-token-text-primary, CanvasText)); font:inherit; text-align:left; cursor:pointer; }
.orbit-ui-select-trigger > span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.orbit-ui-select-trigger > svg { width:14px; height:14px; flex:none; }
.orbit-ui-select-trigger:disabled { opacity:.5; cursor:default; }
.orbit-ui-select-trigger:focus-visible { outline:2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset:2px; }
.orbit-ui-select-popup { position:fixed; inset:auto; margin:0; z-index:10001; box-sizing:border-box; width:max-content; max-width:calc(100vw - 16px); overflow:auto; overscroll-behavior:contain; padding:4px; border:1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius:10px; background:var(--color-background-elevated-secondary-opaque, var(--color-background-elevated-high, var(--color-token-dropdown-background, Canvas))); color:var(--color-text-foreground, var(--color-token-text-primary, CanvasText)); font:inherit; font-size:13px; line-height:1.5; box-shadow:0 8px 24px #0003, 0 2px 6px #0002; zoom:var(--codex-window-zoom, 1); }
.orbit-ui-select-option { display:flex; align-items:center; gap:10px; box-sizing:border-box; min-height:32px; padding:6px 8px; border-radius:6px; color:inherit; cursor:pointer; }
.orbit-ui-select-option > span { flex:1; min-width:0; overflow-wrap:anywhere; }
.orbit-ui-select-option > svg { width:14px; height:14px; flex:none; visibility:hidden; }
.orbit-ui-select-option[aria-selected="true"] > svg { visibility:visible; }
.orbit-ui-select-option[data-active] { background:var(--color-token-list-hover-background, #8882); }
.orbit-ui-select-option[aria-disabled="true"] { opacity:.45; cursor:default; }
`;

function icon(doc: Document, path: string): SVGSVGElement {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7"); svg.setAttribute("stroke-linecap", "round"); svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  const shape = doc.createElementNS(svg.namespaceURI, "path"); shape.setAttribute("d", path); svg.append(shape);
  return svg;
}

/** Mount on a connected, labeled button; dispose before removing its owner. */
export function mountSelect(trigger: HTMLButtonElement, options: SelectOptions): SelectControl {
  const doc = trigger.ownerDocument, view = doc.defaultView;
  if (!view) throw new Error("Selects require a browser document");
  if (!trigger.isConnected) throw new Error("Select triggers must be connected before mounting");
  const root = trigger.getRootNode();
  const scope = trigger.closest<HTMLElement>('dialog, [role="dialog"]') ?? (root instanceof view.ShadowRoot ? root : doc.body);
  const sheet = doc.createElement("style"); sheet.textContent = styles;
  (root instanceof view.ShadowRoot ? root : doc.head).append(sheet);
  const events = new view.AbortController(), listenerOptions = { signal: events.signal };
  const id = `orbit-select-${view.crypto.randomUUID()}`;
  const ownedAttributes = ["role", "type", "aria-haspopup", "aria-expanded", "aria-controls", "aria-activedescendant"];
  const originals = new Map(ownedAttributes.map(name => [name, trigger.getAttribute(name)]));
  const originalNodes = [...trigger.childNodes], originalValue = trigger.value;
  const label = doc.createElement("span"); trigger.replaceChildren(label, icon(doc, "m6 9 6 6 6-6"));
  trigger.classList.add("orbit-ui-select-trigger"); trigger.type = "button";
  trigger.setAttribute("role", "combobox"); trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  let state: SelectState = options, popup: HTMLDivElement | null = null, active = -1;
  let search = "", lastTyped = 0, disposed = false;
  const disabled = () => trigger.matches(":disabled");
  const close = () => {
    popup?.remove(); popup = null; active = -1; search = "";
    trigger.setAttribute("aria-expanded", "false"); trigger.removeAttribute("aria-activedescendant"); trigger.removeAttribute("aria-controls");
  };
  const selectActive = (index: number, scroll = true) => {
    active = index;
    popup?.querySelectorAll<HTMLElement>('[role="option"]').forEach((element, i) => element.toggleAttribute("data-active", i === index));
    const current = popup?.children[index];
    if (current) {
      trigger.setAttribute("aria-activedescendant", current.id);
      if (scroll) current.scrollIntoView({ block: "nearest" });
    } else trigger.removeAttribute("aria-activedescendant");
  };
  const enabled = () => state.choices.map((choice, index) => choice.disabled ? -1 : index).filter(index => index >= 0);
  const position = () => {
    if (!popup) return;
    const anchor = trigger.getBoundingClientRect(), currentZoom: unknown = Reflect.get(popup, "currentCSSZoom");
    // Popovers retain ancestor zoom even in the top layer; coordinates use the cumulative scale.
    const zoom = typeof currentZoom === "number" && Number.isFinite(currentZoom) && currentZoom > 0 ? currentZoom : Number.parseFloat(view.getComputedStyle(popup).zoom) || 1;
    const padding = 8, gap = 4, below = view.innerHeight - padding - anchor.bottom - gap, above = anchor.top - padding - gap;
    const side = below >= Math.min(280 * zoom, popup.scrollHeight * zoom) || below >= above ? "bottom" : "top";
    popup.style.maxWidth = `${Math.max(0, view.innerWidth - padding * 2) / zoom}px`;
    popup.style.minWidth = `${Math.min(Math.max(120, anchor.width), view.innerWidth - padding * 2) / zoom}px`;
    popup.style.maxHeight = `${Math.max(0, Math.min(280, (side === "bottom" ? below : above) / zoom))}px`;
    const bounds = popup.getBoundingClientRect();
    popup.style.left = `${Math.max(padding, Math.min(anchor.left, view.innerWidth - padding - bounds.width)) / zoom}px`;
    popup.style.top = `${Math.max(padding, side === "bottom" ? anchor.bottom + gap : anchor.top - gap - bounds.height) / zoom}px`;
    popup.dataset.side = side;
  };
  const choose = () => {
    const choice = state.choices[active];
    if (disabled() || !choice || choice.disabled) { close(); return; }
    const changed = choice.value !== state.value;
    state = { ...state, value: choice.value }; label.textContent = choice.label; trigger.value = choice.value;
    close(); trigger.focus({ preventScroll: true });
    if (changed) options.onChange(choice.value);
  };
  const renderOptions = () => {
    if (!popup) return;
    popup.replaceChildren(...state.choices.map((choice, index) => {
      const item = doc.createElement("div"); item.className = "orbit-ui-select-option"; item.id = `${id}-${index}`;
      item.setAttribute("role", "option"); item.setAttribute("aria-selected", String(choice.value === state.value));
      if (choice.disabled) item.setAttribute("aria-disabled", "true");
      const text = doc.createElement("span"); text.textContent = choice.label;
      item.append(text, icon(doc, "m5 12 4 4L19 6"));
      item.addEventListener("pointermove", () => { if (!choice.disabled) selectActive(index, false); });
      item.addEventListener("pointerdown", event => event.preventDefault());
      item.addEventListener("click", () => { if (!choice.disabled) { active = index; choose(); } });
      return item;
    }));
  };
  const open = () => {
    if (disposed || disabled() || popup || !enabled().length) return;
    popup = doc.createElement("div"); popup.className = "orbit-ui-select-popup"; popup.id = id; popup.setAttribute("role", "listbox");
    const accessibleLabel = trigger.getAttribute("aria-label");
    if (accessibleLabel) popup.setAttribute("aria-label", accessibleLabel);
    const labeledBy = trigger.getAttribute("aria-labelledby");
    if (labeledBy) popup.setAttribute("aria-labelledby", labeledBy);
    scope.append(popup); renderOptions();
    if (typeof popup.showPopover === "function") { popup.popover = "manual"; popup.showPopover(); }
    trigger.setAttribute("aria-expanded", "true"); trigger.setAttribute("aria-controls", id);
    const index = state.choices.findIndex(choice => choice.value === state.value && !choice.disabled);
    selectActive(index >= 0 ? index : enabled()[0], false); position();
    popup.children[active]?.scrollIntoView({ block: "nearest" });
  };
  trigger.addEventListener("click", () => { if (popup) close(); else open(); }, listenerOptions);
  trigger.addEventListener("keydown", event => {
    if (event.isComposing || disabled()) return;
    if (event.key === "Escape" && popup) { event.preventDefault(); event.stopPropagation(); close(); return; }
    if (event.key === "Tab") { if (popup) choose(); return; }
    if (["Enter", " ", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault(); event.stopPropagation();
      const wasOpen = Boolean(popup);
      if ((event.key === "Enter" || event.key === " ") && wasOpen) { choose(); return; }
      open(); if (!popup) return;
      const indices = enabled(), offset = indices.indexOf(active);
      if (event.key === "Home") selectActive(indices[0]);
      else if (event.key === "End") selectActive(indices.at(-1)!);
      else if (wasOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) selectActive(indices[Math.max(0, Math.min(indices.length - 1, offset + (event.key === "ArrowDown" ? 1 : -1)))]);
      return;
    }
    if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault(); event.stopPropagation();
      const now = Date.now(), character = event.key.toLocaleLowerCase();
      search = now - lastTyped > 750 ? character : search + character; lastTyped = now;
      const needle = [...search].every(value => value === character) ? character : search;
      open();
      for (let step = 1; step <= state.choices.length; step++) {
        const index = (active + step) % state.choices.length, choice = state.choices[index];
        if (!choice.disabled && choice.label.toLocaleLowerCase().startsWith(needle)) { selectActive(index); break; }
      }
    }
  }, listenerOptions);
  const outside = (event: Event) => { if (!event.composedPath().includes(trigger) && (!popup || !event.composedPath().includes(popup))) close(); };
  doc.addEventListener("pointerdown", outside, { ...listenerOptions, capture: true });
  doc.addEventListener("focusin", outside, { ...listenerOptions, capture: true });
  doc.addEventListener("scroll", event => {
    const target = event.composedPath()[0];
    if (target === doc || target instanceof view.Element && target.contains(trigger)) close();
  }, { ...listenerOptions, capture: true });
  view.addEventListener("resize", close, listenerOptions); view.addEventListener("blur", close, listenerOptions);
  const update = (next: SelectState) => {
    if (disposed) return;
    const previousActive = state.choices[active]?.value;
    state = next; label.textContent = state.choices.find(choice => choice.value === state.value)?.label ?? ""; trigger.value = state.value;
    if (disabled() || !enabled().length) { close(); return; }
    if (popup) {
      renderOptions();
      const index = state.choices.findIndex(choice => choice.value === previousActive && !choice.disabled);
      selectActive(index >= 0 ? index : enabled()[0], false); position();
    }
  };
  update(options);
  return { update, close, dispose() {
    if (disposed) return;
    close(); disposed = true; events.abort(); sheet.remove(); trigger.classList.remove("orbit-ui-select-trigger");
    for (const [name, value] of originals) { if (value === null) trigger.removeAttribute(name); else trigger.setAttribute(name, value); }
    trigger.replaceChildren(...originalNodes); trigger.value = originalValue;
  } };
}
