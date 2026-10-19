import { getHomeSections, subscribeHomeSections, mountTooltip } from "@c0sc0s/orbit/ui";
import type { HomeSectionFailure } from "@c0sc0s/orbit/ui";
import type { RendererContext } from "@c0sc0s/orbit/sdk";
import { defaultPreferences, parsePreferences } from "../shared/preferences.js";
import type { HomePreferences, HomePreferencePatch } from "../shared/preferences.js";
import { createSectionHost } from "./section-host.js";

export function mountHomePage(container: HTMLElement, context: RendererContext, onError: (failure: HomeSectionFailure) => void): () => void {
  const document = container.ownerDocument;
  const create = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
  };
  const root = create("div", "home-content"), header = create("header", "home-header"), intro = create("div"), greeting = create("h1", "home-greeting");
  const clock = create("div", "home-clock"), time = create("time"), date = create("span");
  clock.append(time, date); intro.append(greeting, clock);
  const customize = create("button", "home-customize"); customize.type = "button"; customize.setAttribute("aria-label", "首页设置");
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24"); icon.setAttribute("fill", "none"); icon.setAttribute("stroke", "currentColor"); icon.setAttribute("stroke-width", "1.5"); icon.setAttribute("stroke-linecap", "round"); icon.setAttribute("aria-hidden", "true");
  const lines = document.createElementNS(icon.namespaceURI, "path"); lines.setAttribute("d", "M4 7h7m4 0h5M4 17h3m4 0h9"); icon.append(lines);
  for (const [x, y] of [[13, 7], [9, 17]]) {
    const knob = document.createElementNS(icon.namespaceURI, "circle"); knob.setAttribute("cx", String(x)); knob.setAttribute("cy", String(y)); knob.setAttribute("r", "2"); icon.append(knob);
  }
  customize.append(icon);
  customize.setAttribute("aria-expanded", "false"); customize.setAttribute("aria-controls", "home-customization");
  header.append(intro, customize);
  const settings = create("section", "home-settings"); settings.id = "home-customization"; settings.hidden = true; settings.setAttribute("aria-label", "自定义首页");
  const nameLabel = create("label", "home-name", "称呼"), name = create("input"); name.type = "text"; name.maxLength = 80; name.placeholder = "你的称呼";
  nameLabel.append(name);
  const choices = create("fieldset"), legend = create("legend", "", "显示内容"), options = create("div", "home-module-options"); choices.append(legend, options);
  settings.append(nameLabel, choices);
  const notice = create("div", "home-notice"), message = create("span"), retry = create("button", "", "重试"); retry.type = "button";
  message.setAttribute("role", "alert"); notice.append(message, retry); notice.hidden = true;
  const modules = create("div"); root.append(header, settings, notice, modules); container.append(root);
  const sectionHost = createSectionHost(modules, onError);
  let preferences = defaultPreferences(), ready = false, busy = false, disposed = false;
  let pending: HomePreferencePatch | undefined;
  let errorOperation: (() => void) | undefined;
  const checkboxes = new Map<string, HTMLInputElement>();
  const checkbox = (id: string, label: string, onChange: (value: boolean) => void) => {
    const wrapper = create("label", "home-module-option"), input = create("input"); input.type = "checkbox";
    input.addEventListener("change", () => onChange(input.checked)); wrapper.append(input, document.createTextNode(label)); options.append(wrapper); checkboxes.set(id, input);
  };
  const showError = (text: string, operation: () => void) => { message.textContent = text; notice.hidden = false; errorOperation = operation; };
  const refresh = () => {
    const sections = getHomeSections(document);
    const shown = { ...preferences, displayName: pending?.displayName ?? preferences.displayName, clockVisible: pending?.clockVisible ?? preferences.clockVisible,
      moduleVisibility: { ...preferences.moduleVisibility, ...(pending?.module ? { [pending.module.id]: pending.module.visible } : {}) } };
    greeting.textContent = shown.displayName ? `Hello, ${shown.displayName}` : "Hello World";
    clock.hidden = !shown.clockVisible;
    if (container.getRootNode() instanceof ShadowRoot ? (container.getRootNode() as ShadowRoot).activeElement !== name : document.activeElement !== name) name.value = shown.displayName;
    name.disabled = !ready || busy;
    for (const [id, input] of checkboxes) {
      input.disabled = !ready || busy;
      const saved = Object.hasOwn(shown.moduleVisibility, id) ? shown.moduleVisibility[id] : undefined;
      input.checked = id === "$clock" ? shown.clockVisible : saved ?? sections.find(section => section.id === id)?.defaultVisible ?? true;
    }
    if (ready) sectionHost.update(sections, shown);
  };
  const apply = (value: unknown) => {
    const next = parsePreferences(value);
    if (disposed || next.revision < preferences.revision) return;
    preferences = next; refresh();
  };
  const save = async (patch: HomePreferencePatch) => {
    if (busy || disposed) return;
    pending = patch; busy = true; notice.hidden = true; refresh();
    try { apply(await context.rpc.call("updatePreferences", patch, { signal: context.signal })); }
    catch { if (!disposed) showError("设置未保存", () => { void save(patch); }); }
    finally { pending = undefined; busy = false; if (!disposed) refresh(); }
  };
  const buildOptions = () => {
    const focusedId = [...checkboxes].find(([, input]) => input === (input.getRootNode() as ShadowRoot).activeElement || input === document.activeElement)?.[0];
    options.replaceChildren(); checkboxes.clear();
    checkbox("$clock", "时间", visible => { void save({ clockVisible: visible }); });
    for (const section of getHomeSections(document)) checkbox(section.id, section.title || section.id, visible => { void save({ module: { id: section.id, visible } }); });
    refresh(); if (focusedId) checkboxes.get(focusedId)?.focus({ preventScroll: true });
  };
  const load = async () => {
    try {
      const value = await context.rpc.call("getPreferences", undefined, { signal: context.signal });
      if (disposed) return;
      ready = true; notice.hidden = true; apply(value); refresh();
    } catch {
      if (disposed) return;
      ready = true; showError("无法读取首页设置", () => { void load(); }); refresh();
    }
  };
  customize.addEventListener("click", () => {
    settings.hidden = !settings.hidden; customize.setAttribute("aria-expanded", String(!settings.hidden));
    if (!settings.hidden) name.focus();
  });
  settings.addEventListener("keydown", event => {
    if (event.key === "Escape" && !event.isComposing) { event.preventDefault(); settings.hidden = true; customize.setAttribute("aria-expanded", "false"); customize.focus(); }
  });
  name.addEventListener("blur", () => { if (name.value.trim() !== preferences.displayName) void save({ displayName: name.value.trim() }); });
  name.addEventListener("keydown", event => { if (event.key === "Enter" && !event.isComposing) { event.preventDefault(); name.blur(); } });
  retry.addEventListener("click", () => errorOperation?.());
  const tick = () => {
    const now = new Date(); time.dateTime = now.toISOString(); time.textContent = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
    date.textContent = now.toLocaleDateString(undefined, { month: "long", day: "numeric", weekday: "long" });
  };
  tick(); const timer = setInterval(tick, 30_000);
  const unsubscribeSections = subscribeHomeSections(buildOptions, document);
  const unsubscribePreferences = context.events.subscribe("preferences", value => { try { apply(value); } catch { showError("首页设置更新无效", () => { void load(); }); } });
  const disposeTooltip = mountTooltip(customize, { label: "首页设置", side: "bottom" });
  buildOptions(); void load();
  return () => { disposed = true; clearInterval(timer); unsubscribeSections(); unsubscribePreferences(); disposeTooltip(); sectionHost.dispose(); root.remove(); };
}
