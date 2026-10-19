# Shared plugin UI

Plugins that add sidebar icons and hover hints need to follow the same host sizes, theme colors, spacing and cleanup rules. Orbit provides browser-only DOM helpers through `@c0sc0s/orbit/ui`, so each plugin can supply its icon and action without copying those rules. Tags uses this public entry point.

## Sidebar buttons

```ts
import { createSidebarButton } from "@c0sc0s/orbit/ui";
import type { RendererContext } from "@c0sc0s/orbit/sdk";

export function mountLauncher(
  context: RendererContext,
  anchor: HTMLButtonElement,
  icon: SVGSVGElement,
  openPanel: () => void,
) {
  const control = createSidebarButton({
    id: `${context.id}-launcher`,
    label: "Example",
    ariaLabel: "Open Example",
    template: anchor,
    icon,
    onClick: openPanel,
  });
  anchor.insertAdjacentElement("afterend", control.element);
  context.onDispose(control.dispose);
  return control;
}
```

The template supplies native button classes, presentation attributes and icon dimensions. Its navigation, popup and selection identities are discarded. The supplied SVG retains its own `viewBox`, while inheriting the template's icon box and theme color through `currentColor`. Without a template, the helper renders a themed icon-and-label button with a 20px icon, hover state and keyboard focus outline.

IDs must be unique across plugins in the same document; prefix them with the plugin ID. `dispose()` removes the button, tooltip, event handlers and any fallback stylesheet owned by that control. Call it before replacing a control during rendering, and register it with `context.onDispose` for unload. It does not remove peer controls or native buttons.

Set `tooltip: false` to omit the hint, or pass `tooltip: { label, side, offset, delay }` to customize it. The default label is the button label. Use `ariaLabel` for a separate accessible action label.

## Tooltips on existing controls

```ts
import { mountTooltip } from "@c0sc0s/orbit/ui";

const dispose = mountTooltip(button, {
  label: "Refresh",
  side: "bottom",
});
context.onDispose(dispose);
```

Tooltips use Codex's tooltip theme variables for typography, colors, padding, corners, shadows and window zoom. Defaults match the sidebar's native placement: right side, centered, 2 viewport pixels from the button and a 200ms hover delay. The offset stays constant when the window zoom changes. Supported sides are `top`, `right`, `bottom` and `left`; placement flips at viewport edges and stays within an 8px margin.

Keyboard focus shows the hint immediately. Pointer leave, blur, click, Escape, scrolling an ancestor of the trigger and resizing dismiss it. Unrelated conversation auto-scroll preserves the hint. Touch hover is ignored, pending timers are cancelled on disposal, and existing `aria-describedby` references are preserved. Tooltip IDs are generated unless explicitly provided. Styles are local to the tooltip element; a plugin does not install or remove another plugin's shared stylesheet.

## Boundaries

The UI entry point has no Node, CDP, storage, framework or business-package dependencies. Bundle it into the plugin's local renderer assets. It never searches the host's private navigation DOM: the caller supplies a validated native template and mounting location. Tags keeps that lookup in its host adapter. These helpers do not allocate sidebar slots or coordinate plugin ordering.
