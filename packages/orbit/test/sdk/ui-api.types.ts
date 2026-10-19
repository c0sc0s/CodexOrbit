import { createSidebarButton, mountSelect, mountTooltip, registerHomeSection, getHomeSections } from "@c0sc0s/orbit/ui";
import type { RendererContext } from "@c0sc0s/orbit/sdk";

export function addControl(context: RendererContext, template: HTMLButtonElement, icon: SVGSVGElement) {
  const control = createSidebarButton({ id: `${context.id}-launcher`, label: "Example", template, icon });
  context.onDispose(control.dispose);
  context.onDispose(mountTooltip(template, { label: "Example", side: "bottom", offset: 2 }));
  // @ts-expect-error Placement is restricted to supported sides.
  mountTooltip(template, { label: "Example", side: "diagonal" });
  return control.element;
}

export function addSelect(trigger: HTMLButtonElement) {
  const control = mountSelect(trigger, { value: "todo", choices: [{ value: "todo", label: "Todo" }], onChange: value => { trigger.value = value; } });
  control.update({ value: "done", choices: [{ value: "done", label: "Done" }] });
  // @ts-expect-error Choice values must be strings.
  control.update({ value: 1, choices: [] });
  return control.dispose;
}

export function addHomeSection() {
  const unregister = registerHomeSection({ id: "example.overview", title: "Example", slot: "overview", order: 100, defaultVisible: false, mount(container, header) {
    if (header) { header.summary.textContent = "2"; header.actions.append(document.createElement("button")); header.setCompact(false); }
    return () => { container.replaceChildren(); };
  } });
  // @ts-expect-error Home slots are restricted to the host's supported layout regions.
  registerHomeSection({ id: "invalid", title: "Invalid", slot: "sidebar", mount() { return () => {}; } });
  return { unregister, sections: getHomeSections() };
}
