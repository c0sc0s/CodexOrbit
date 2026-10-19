import type { HomeSectionFailure } from "@c0sc0s/orbit/ui";
import { getHomeSections } from "@c0sc0s/orbit/ui";
import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { findContentRegion, findHomeControl, isElementVisible, isHomeControl, isNewConversationControl } from "./navigation.js";
import { mountHomePage } from "./home-page.js";
import { homeStyles } from "./styles.js";
import { mountGreetingFonts } from "./greeting-fonts.js";

const runtimeVersion = "0.2.6";
interface HiddenContent { display: string; priority: string; inert: boolean; ariaHidden: string | null }

export function activate(context: RendererContext) {
  const document = window.document;
  const disposeFonts = mountGreetingFonts(document);
  const hidden = new Map<HTMLElement, HiddenContent>();
  let requested = false, settling = false, location = "", frame = 0, settleFrame = 0;
  let host: HTMLElement | null = null, region: HTMLElement | null = null, viewport: HTMLElement | null = null;
  let disposeSections: (() => void) | undefined, lastError: HomeSectionFailure | null = null;
  const restore = () => {
    disposeSections?.(); disposeSections = undefined;
    host?.remove(); host = null; region = null; viewport = null;
    for (const [element, state] of hidden) {
      if (state.display) element.style.setProperty("display", state.display, state.priority);
      else element.style.removeProperty("display");
      element.inert = state.inert;
      if (state.ariaHidden === null) element.removeAttribute("aria-hidden"); else element.setAttribute("aria-hidden", state.ariaHidden);
    }
    hidden.clear();
  };
  const hide = () => {
    requested = false; settling = false;
    observer.disconnect();
    cancelAnimationFrame(frame); cancelAnimationFrame(settleFrame); frame = 0; settleFrame = 0;
    restore();
  };
  const reconcile = () => {
    frame = 0;
    if (!requested) return;
    if (!settling && location !== window.location.href) { hide(); return; }
    if (region?.isConnected && !isElementVisible(region)) {
      if (!settling) { hide(); return; }
      restore();
    }
    const target = region?.isConnected && host?.isConnected ? region : findContentRegion(document);
    if (!target) { if (host && !host.isConnected) restore(); return; }
    if (target !== region || !host?.isConnected) {
      restore(); region = target;
      host = document.createElement("div"); host.id = "orbit-home-root";
      const shadow = host.attachShadow({ mode: "open" }), style = document.createElement("style");
      style.textContent = homeStyles;
      viewport = document.createElement("div"); viewport.className = "orbit-home-page";
      viewport.setAttribute("role", "region"); viewport.setAttribute("aria-label", "Home"); viewport.tabIndex = -1;
      shadow.append(style, viewport); target.append(host);
      disposeSections = mountHomePage(viewport, context, failure => { lastError = failure; });
    }
    for (const element of target.children) {
      if (!(element instanceof HTMLElement) || element === host || hidden.has(element)) continue;
      hidden.set(element, { display: element.style.getPropertyValue("display"), priority: element.style.getPropertyPriority("display"), inert: element.inert, ariaHidden: element.getAttribute("aria-hidden") });
      element.style.setProperty("display", "none", "important"); element.inert = true; element.setAttribute("aria-hidden", "true");
    }
  };
  const schedule = () => { if (requested && !frame) frame = requestAnimationFrame(reconcile); };
  const observer = new MutationObserver(schedule);
  const show = () => {
    requested = true; settling = true; lastError = null;
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "inert", "aria-hidden", "style", "class"] });
    schedule(); cancelAnimationFrame(settleFrame);
    settleFrame = requestAnimationFrame(() => {
      settleFrame = requestAnimationFrame(() => {
        settleFrame = 0; settling = false; location = window.location.href; reconcile(); viewport?.focus({ preventScroll: true });
      });
    });
  };
  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target;
    if (!(target instanceof Element) || host?.contains(target)) return;
    const control = target.closest<HTMLElement>("button, a, [role='button']");
    if (!control) return;
    if (isHomeControl(control)) { show(); return; }
    // Project creation can reuse Home's URL; restore the composer before native handlers run.
    if (isNewConversationControl(control)) hide();
    else if (control.matches("a[href]") && control.getAttribute("target") !== "_blank" && !control.getAttribute("href")?.startsWith("#")) hide();
    else schedule();
  };
  const onKey = (event: KeyboardEvent) => {
    if (!event.isComposing && (event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "n") hide();
  };
  document.addEventListener("click", onClick, true);
  document.addEventListener("keydown", onKey, true);
  const onPopState = () => {
    // Native SPA navigation may emit popstate synchronously inside the Home click.
    if (settling) { schedule(); return; }
    if (location && window.location.href === location) show(); else hide();
  };
  window.addEventListener("popstate", onPopState);
  window.addEventListener("hashchange", schedule);
  context.onDispose(() => {
    const scope = host?.shadowRoot, focused = Boolean(scope?.activeElement);
    hide(); document.removeEventListener("click", onClick, true); document.removeEventListener("keydown", onKey, true);
    disposeFonts();
    window.removeEventListener("popstate", onPopState); window.removeEventListener("hashchange", schedule);
    if (focused) findHomeControl(document)?.focus({ preventScroll: true });
  });
  return { status: () => ({ version: runtimeVersion, modules: getHomeSections(document).map(({ id }) => id), homeAvailable: Boolean(findHomeControl(document)), requested, contentAvailable: Boolean(region ?? findContentRegion(document)), visible: Boolean(host && isElementVisible(host)), lastError }) };
}
