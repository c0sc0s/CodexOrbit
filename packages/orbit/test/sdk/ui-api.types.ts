import { createSidebarButton, mountTooltip } from "@c0sc0s/orbit/ui";
import type { RendererContext } from "@c0sc0s/orbit/sdk";

export function addControl(context: RendererContext, template: HTMLButtonElement, icon: SVGSVGElement) {
  const control = createSidebarButton({ id: `${context.id}-launcher`, label: "Example", template, icon });
  context.onDispose(control.dispose);
  context.onDispose(mountTooltip(template, { label: "Example", side: "bottom", offset: 2 }));
  // @ts-expect-error Placement is restricted to supported sides.
  mountTooltip(template, { label: "Example", side: "diagonal" });
  return control.element;
}
