export interface TooltipOptions {
  label: string;
  id?: string;
  side?: "top" | "right" | "bottom" | "left";
  offset?: number;
  delay?: number;
}

const tooltipStyles = `
  position: fixed; z-index: 10000; width: max-content; max-width: min(20rem, calc(100vw - 16px));
  padding: var(--tooltip-padding-block, 5px) var(--tooltip-padding-inline, 12px);
  border: 1px solid var(--tooltip-border-color, var(--color-border-tooltip, #8883));
  border-radius: var(--tooltip-border-radius, 16px); corner-shape: var(--tooltip-corner-shape, round);
  background: var(--tooltip-background-color, var(--color-background-tooltip, Canvas));
  color: var(--tooltip-text-color, var(--color-text-tooltip, CanvasText));
  box-shadow: var(--tooltip-box-shadow, var(--shadow-tooltip, 0 8px 18px #0f172a33));
  font-size: var(--tooltip-font-size, 13px); font-weight: var(--tooltip-font-weight, 400);
  line-height: var(--tooltip-line-height, 18px); letter-spacing: var(--tooltip-letter-spacing, -.15px);
  zoom: var(--codex-window-zoom, 1); overflow-wrap: break-word; text-align: center; pointer-events: none; user-select: none;
`;

export function mountTooltip(trigger: HTMLElement, options: TooltipOptions): () => void {
  const doc = trigger.ownerDocument;
  const view = doc.defaultView;
  if (!view) throw new Error("Tooltips require a browser document");
  const events = new view.AbortController();
  const id = options.id ?? `orbit-tooltip-${view.crypto.randomUUID()}`;
  let timer: number | null = null;
  let tooltip: HTMLElement | null = null;

  const hide = (): void => {
    if (timer !== null) view.clearTimeout(timer);
    timer = null;
    tooltip?.remove();
    tooltip = null;
    const describedBy = trigger.getAttribute("aria-describedby")?.split(/\s+/).filter((value) => value !== id).join(" ");
    if (describedBy) trigger.setAttribute("aria-describedby", describedBy);
    else trigger.removeAttribute("aria-describedby");
  };
  const show = (): void => {
    hide();
    if (!trigger.isConnected || trigger.getAttribute("aria-expanded") === "true") return;
    tooltip = doc.createElement("div");
    tooltip.id = id;
    tooltip.className = "orbit-ui-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.textContent = options.label;
    tooltip.style.cssText = tooltipStyles;
    doc.body.appendChild(tooltip);
    trigger.setAttribute("aria-describedby", [trigger.getAttribute("aria-describedby"), id].filter(Boolean).join(" "));

    const anchor = trigger.getBoundingClientRect();
    const zoom = Number.parseFloat(view.getComputedStyle(tooltip).zoom) || 1;
    const offset = options.offset ?? 2;
    const padding = 8;
    tooltip.style.maxWidth = `min(20rem, ${Math.max(0, view.innerWidth - padding * 2) / zoom}px)`;
    const bounds = tooltip.getBoundingClientRect();
    let side = options.side ?? "right";
    if (side === "right" && anchor.right + offset + bounds.width > view.innerWidth - padding) side = "left";
    else if (side === "left" && anchor.left - offset - bounds.width < padding) side = "right";
    else if (side === "bottom" && anchor.bottom + offset + bounds.height > view.innerHeight - padding) side = "top";
    else if (side === "top" && anchor.top - offset - bounds.height < padding) side = "bottom";
    const left = side === "right" ? anchor.right + offset : side === "left" ? anchor.left - offset - bounds.width
      : anchor.left + (anchor.width - bounds.width) / 2;
    const top = side === "bottom" ? anchor.bottom + offset : side === "top" ? anchor.top - offset - bounds.height
      : anchor.top + (anchor.height - bounds.height) / 2;
    // Native tooltip offsets use viewport pixels; only portaled CSS coordinates need zoom compensation.
    tooltip.style.left = `${Math.max(padding, Math.min(left, view.innerWidth - padding - bounds.width)) / zoom}px`;
    tooltip.style.top = `${Math.max(padding, Math.min(top, view.innerHeight - padding - bounds.height)) / zoom}px`;
    tooltip.dataset.side = side;
  };
  const listenerOptions = { signal: events.signal };
  trigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "touch" || event.buttons) return;
    hide();
    timer = view.setTimeout(show, options.delay ?? 200);
  }, listenerOptions);
  trigger.addEventListener("pointerleave", hide, listenerOptions);
  trigger.addEventListener("focus", show, listenerOptions);
  trigger.addEventListener("blur", hide, listenerOptions);
  trigger.addEventListener("click", hide, listenerOptions);
  doc.addEventListener("pointerdown", hide, { ...listenerOptions, capture: true });
  doc.addEventListener("keydown", (event) => { if (event.key === "Escape") hide(); }, listenerOptions);
  doc.addEventListener("scroll", (event) => {
    // Conversation auto-scroll does not move a sidebar anchor or invalidate its hint.
    if (event.target === doc || event.target instanceof view.Element && event.target.contains(trigger)) hide();
  }, { ...listenerOptions, capture: true });
  view.addEventListener("resize", hide, listenerOptions);
  view.addEventListener("blur", hide, listenerOptions);
  return () => { hide(); events.abort(); };
}
