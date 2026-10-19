# Shared plugin UI

Plugins that add sidebar icons and hover hints need to follow the same host sizes, theme colors, spacing and cleanup rules. Orbit provides browser-only DOM helpers through `@c0sc0s/orbit/ui`, so each plugin can supply its icon and action without copying those rules. Tags and Todo use this public entry point.

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

## Plugin dialogs

Tags and Todo use centered dialogs with a fixed, full-window overlay at `z-index: 10000`, 24px outer padding, a `#0006` backdrop and 2px blur. Dialogs have a 16px radius, a 1px host-themed border and `0 24px 70px #0007, 0 4px 18px #0003` shadow. Width follows the content: Tags uses 680px; Todo uses 680px for its list and expands to 960px when a task detail is selected. Below 720px, Todo shows list or detail with an explicit return action. Both constrain their dimensions to the viewport and keep content scrolling inside the dialog.

Use the host's `--color-background-elevated-primary-opaque` and `--color-background-elevated-secondary-opaque` surface tokens, with legacy elevated tokens and `Canvas` as fallbacks. Text, borders, controls, hover, selection and focus also use the host's `--color-*` tokens. Inherit font and color scheme; an operating-system theme query must not override the app's chosen theme.

Headers use `15px 16px 12px` padding, a 17px semibold title, a 12px secondary description and a 28px close button. Search and other main controls are 36px tall with 8px corners. Opening focuses search; Tab stays in the dialog; Escape and backdrop press close it and restore focus to the sidebar entry. Opening motion uses a short fade with a 6px translation and `.985` scale; respect reduced-motion preferences. Keep unsaved form state across close/reopen and background data updates.

## Selectors

Use `mountSelect` for themed single-value choices instead of mixing host text colors with an operating-system native option popup. Mount it on a connected, accessibly labeled button; `update({ value, choices })` changes controlled state without firing `onChange`. Choice values must be unique. Dispose before removing the owning view to remove its popup, styles and listeners and restore the supplied button.

```ts
const selector = mountSelect(button, {
  value: "todo",
  choices: [{ value: "todo", label: "Todo" }, { value: "done", label: "Done" }],
  onChange(value) { saveStatus(value); },
});
context.onDispose(selector.dispose);
```

The trigger and listbox use the same host palette even when `color-scheme` differs from the app theme. The listbox stays in its dialog's accessible subtree, uses the browser top layer when available, flips at viewport edges and compensates for window zoom. Arrow keys, Home/End and typeahead preview choices; Enter/Space/Tab commit; Escape cancels without closing the surrounding dialog. Outside pointer/focus, anchor scrolling and window resize dismiss it. Disabled controls and choices cannot commit. Todo's status and parent selectors share this primitive.

## Home sections

The public UI entry point provides registration, snapshots and subscriptions. The Home plugin owns layout, visibility, headings, mount/dispose isolation and its base greeting/clock. Providers keep business data and actions inside their owning plugin.

```ts
import { registerHomeSection } from "@c0sc0s/orbit/ui";

context.onDispose(registerHomeSection({
  id: `${context.id}.summary`,
  title: "Summary",
  slot: "overview",
  order: 100,
  defaultVisible: true,
  mount(container) {
    const view = mountOwnedView(container);
    return () => view.dispose();
  },
}));
```

IDs are stable plugin-owned keys, at most 64 characters using lowercase letters, digits, dots and hyphens. Titles are nonempty and at most 80 characters. `overview` contains compact summaries; `main` contains primary content. The default slot is `main`, order is 100 and visibility is true. Sort order is slot, numeric order, then ID, independent of registration timing. Descriptors are immutable after registration; changing one requires unregistering it first.

Home observes `getHomeSections()` with `subscribeHomeSections(listener)`. Registering may precede Home activation. Unregistering, hiding a module or leaving Home invokes provider cleanup; showing it again mounts a fresh view. Cleanup must stop subscriptions, timers and framework roots, and remove owned nodes. A mount that throws must release resources it allocated before throwing. Provider failures display a local retry control and never expose exception payloads. Providers should preserve their own drafts if needed across unmounts.

The host supplies an accessible section heading and theme. Providers render the body without full-page padding or viewport-height assumptions. An optional second mount argument, `HomeSectionMountContext`, exposes `summary` and `actions` DOM slots in that heading, plus `setCompact(boolean)` to request a compact row, for example when empty. Providers own nodes they add to these slots and release them during cleanup. Single-argument mounts remain supported. Main modules stack vertically above overview summaries. A provider may register only while it has relevant content; unregistering removes its heading and spacing without clearing its visibility preference. A provider may use its own shadow root and locally bundled styles. Actions call back into the owning plugin; Home does not discover or invoke another plugin's internal RPC. Todo opens its task editor and Tags opens its filtered session dashboard this way.

Module visibility, the greeting name and clock visibility belong to Home's local service. Changes are partial, serialized and persisted atomically, with revisioned snapshots broadcast across windows. Visibility is retained when a provider is temporarily disabled or absent. Hiding a view never disables its plugin or deletes business data. See [Home architecture](home.md).

## Boundaries

The UI entry point has no Node, CDP, storage, framework or business-package dependencies. Bundle it into the plugin's local renderer assets. It never searches the host's private navigation DOM: the caller supplies a validated native template and mounting location. Tags keeps that lookup in its host adapter. Sidebar helpers do not allocate sidebar slots or coordinate plugin ordering. Home section order comes from the public descriptor; the Home plugin owns the layout.
