export const styles = `
:host {
  --ot-surface: var(--color-background-elevated-primary-opaque, var(--color-background-elevated-base, var(--color-token-dropdown-background, Canvas)));
  --ot-menu-surface: var(--color-background-elevated-secondary-opaque, var(--color-background-elevated-high, var(--color-token-dropdown-background, Canvas)));
  --ot-control: var(--color-background-control, var(--color-background-secondary-soft, var(--color-token-input-background, #8881)));
  --ot-text: var(--color-text-foreground, var(--color-text-primary, var(--color-token-text-primary, CanvasText)));
  --ot-secondary: var(--color-text-secondary, var(--color-token-text-secondary, var(--ot-text)));
  --ot-muted: var(--color-text-tertiary, var(--color-token-text-tertiary, #888));
  --ot-line: var(--color-border-light, var(--color-token-border-light, #8883));
  --ot-hover: var(--color-token-list-hover-background, #8882);
  --ot-selected: var(--color-token-list-active-selection-background, var(--color-background-secondary-soft-alpha-hover, #8883));
  --ot-primary: var(--color-background-primary-solid, var(--ot-text));
  --ot-on-primary: var(--color-text-primary-solid, var(--ot-surface));
  --ot-focus: var(--color-border-focus, var(--color-token-focus-border, #4b8cff));
  --ot-danger: var(--color-text-danger, #d95c5c);
  color: var(--ot-text); font: inherit; font-size: 13px; line-height: 1.5; color-scheme: inherit;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
button, input, textarea { color: inherit; font: inherit; }
button { padding: 0; border: 0; border-radius: 6px; background: transparent; cursor: pointer; transition: background 100ms ease, color 100ms ease; }
button:disabled { opacity: .5; cursor: default; }
button:hover:not(:disabled) { background: var(--ot-hover); }
button:focus-visible, summary:focus-visible, a:focus-visible { outline: 2px solid var(--ot-focus); outline-offset: 2px; }
svg { display: block; width: 16px; height: 16px; flex: none; }
a { color: var(--color-text-link, var(--ot-secondary)); text-underline-offset: 3px; }
input, textarea { min-width: 0; padding: 7px 9px; border: 1px solid var(--ot-line); border-radius: 8px; background: var(--ot-control); }
input:focus-visible, textarea:focus-visible { outline: 0; border-color: var(--ot-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ot-focus) 18%, transparent); }
input::placeholder, textarea::placeholder { color: var(--ot-muted); }
.ot-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px; background: #0006; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); animation: ot-fade-in 140ms ease-out; }
.ot-panel { position: relative; display: flex; flex-direction: column; width: min(680px, calc(100vw - 48px)); height: min(680px, calc(100vh - 48px)); max-height: calc(100vh - 48px); border: 1px solid var(--ot-line); border-radius: 16px; background: var(--ot-surface); color: var(--ot-text); box-shadow: 0 24px 70px #0007, 0 4px 18px #0003; overflow: hidden; outline: none; animation: ot-dialog-in 180ms cubic-bezier(.2,.8,.2,1); }
.ot-panel.has-detail { width: min(960px, calc(100vw - 48px)); }
.ot-header { display: flex; align-items: center; gap: 12px; padding: 15px 16px 12px; border-bottom: 1px solid var(--ot-line); }
.ot-header h2 { margin: 0; font-size: 17px; font-weight: 650; }
.ot-header-actions { display: flex; gap: 4px; margin-left: auto; }
.ot-header-actions button { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 7px; color: var(--ot-muted); }
.ot-header-actions button:hover { color: var(--ot-text); }
.ot-workspace { display: grid; grid-template-columns: minmax(0, 1fr); flex: 1; min-height: 0; }
.has-detail .ot-workspace { grid-template-columns: minmax(320px, .85fr) minmax(360px, 1.15fr); }
.ot-list { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.has-detail .ot-list { border-right: 1px solid var(--ot-line); }
.ot-list-tools { padding: 12px 16px 8px; }
.ot-list-toolbar { display: flex; align-items: center; gap: 8px; }
.ot-search-field { display: flex; flex: 1; align-items: center; min-width: 0; height: 36px; padding: 0 9px; border: 1px solid transparent; border-radius: 8px; background: var(--ot-control); color: var(--ot-muted); }
.ot-search-field:focus-within { border-color: var(--ot-focus); }
.ot-search { width: 100%; height: 100%; padding: 0 7px; border: 0; background: transparent; color: var(--ot-text); }
.ot-search:focus-visible { box-shadow: none; }
.ot-search-field button { display: grid; flex: none; width: 22px; height: 22px; place-items: center; }
.ot-search-field button svg { width: 13px; height: 13px; }
.ot-new-task { display: flex; flex: none; align-items: center; gap: 5px; height: 36px; padding: 0 10px; border: 1px solid var(--ot-line); border-radius: 8px; font-size: 12px; font-weight: 500; white-space: nowrap; }
.ot-new-task[aria-expanded="true"] { background: var(--ot-control); }
.ot-filter-count { margin-left: 5px; color: var(--ot-muted); font-size: 11px; font-weight: 400; font-variant-numeric: tabular-nums; }
.ot-filters { display: flex; gap: 4px; margin-top: 10px; }
.ot-filters button { height: 28px; padding: 0 9px; color: var(--ot-secondary); font-size: 12px; white-space: nowrap; }
.ot-filters button.is-active { color: var(--ot-text); background: var(--ot-control); font-weight: 500; }
.ot-filters button.is-active .ot-filter-count { color: var(--ot-secondary); }
.ot-quick-add { margin-top: 10px; }
.ot-capture-field { display: flex; align-items: center; gap: 4px; padding: 4px; border: 1px solid var(--ot-line); border-radius: 8px; }
.ot-capture-field:focus-within { border-color: var(--ot-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--ot-focus) 12%, transparent); }
.ot-capture-field input { flex: 1; width: 100%; height: 30px; padding: 4px 7px; border: 0; border-radius: 4px; background: transparent; }
.ot-capture-field input:focus-visible { box-shadow: none; }
.ot-capture-field button { flex: none; height: 28px; font-size: 12px; }
.ot-create-submit { padding: 0 10px; }
.ot-create-submit:disabled { background: var(--ot-control); color: var(--ot-muted); opacity: 1; }
.ot-capture-cancel { display: grid; width: 28px; place-items: center; color: var(--ot-muted); }
.ot-capture-hint { margin: 5px 2px 0; color: var(--ot-muted); font-size: 11px; }
.ot-tree-scroll { flex: 1; overflow: auto; padding: 0 12px 20px; overscroll-behavior: contain; }
.ot-tree, .ot-children { margin: 0; padding: 0; list-style: none; }
.ot-children { margin-left: 20px; padding-left: 3px; border-left: 1px solid var(--ot-line); }
.ot-row { display: grid; grid-template-columns: 18px 26px minmax(0, 1fr) auto 24px; align-items: center; min-height: 40px; column-gap: 2px; margin: 1px 0; padding: 3px 4px; border-radius: 8px; }
.ot-row:hover { background: var(--ot-hover); }
.ot-row.is-selected { background: var(--ot-selected); }
.ot-expand, .ot-expand-space { display: grid; width: 18px; height: 28px; place-items: center; color: var(--ot-muted); }
.ot-expand svg { width: 14px; height: 14px; }
.ot-expand.is-expanded svg { transform: rotate(90deg); }
.ot-check { display: grid; width: 26px; height: 28px; place-items: center; }
.ot-check svg { width: 20px; height: 20px; color: var(--ot-muted); }
.ot-check.is-doing svg, .ot-check[aria-pressed="true"] svg { color: var(--ot-text); }
.ot-task-name { min-width: 0; padding: 6px 4px; text-align: left; overflow-wrap: anywhere; line-height: 1.5; }
.ot-tree > .ot-branch > .ot-row .ot-task-name { font-weight: 500; }
.ot-task-path { display: block; margin-top: 3px; color: var(--ot-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 400; }
.ot-draft-dot { color: var(--ot-focus); }
.ot-task-name:hover, .ot-child-title:hover { background: transparent !important; }
.is-done .ot-task-name > span:first-child, .is-done .ot-child-title { color: var(--ot-muted); text-decoration: line-through; }
.ot-row-meta { padding: 0 4px; color: var(--ot-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
.ot-row-meta time { display: block; }
.ot-row-meta .is-overdue { color: var(--ot-danger); }
.ot-row-delete { display: grid; width: 24px; height: 28px; place-items: center; color: var(--ot-muted); opacity: 0; }
.ot-row:hover .ot-row-delete, .ot-row:focus-within .ot-row-delete, .ot-row.is-selected .ot-row-delete, .ot-detail-child:hover .ot-row-delete, .ot-detail-child:focus-within .ot-row-delete { opacity: 1; }
.ot-row-delete:hover:not(:disabled), .ot-delete:hover:not(:disabled) { color: var(--ot-danger); background: color-mix(in srgb, var(--ot-danger) 9%, transparent); }
.ot-detail { min-width: 0; overflow: auto; overscroll-behavior: contain; }
.ot-detail-content { padding: 16px 20px 56px; }
.ot-detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.ot-detail-actions { display: flex; align-items: center; gap: 6px; }
.ot-detail-close { display: grid; width: 28px; height: 28px; place-items: center; color: var(--ot-muted); }
.ot-status-select.orbit-ui-select-trigger { width: auto; min-height: 30px; padding: 4px 8px; border-color: transparent; background: var(--ot-control); color: var(--ot-secondary); font-size: 12px; }
.ot-delete { display: flex; align-items: center; gap: 5px; padding: 5px 7px; color: var(--ot-muted); font-size: 12px; }
.ot-deleted-label { color: var(--ot-muted); font-size: 12px; }
.ot-parent-link { display: block; max-width: 100%; margin: -2px 0 10px; color: var(--ot-muted); font-size: 12px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; text-align: left; }
.ot-title-input { display: block; width: 100%; min-height: 30px; padding: 0 2px; border: 1px solid transparent; border-radius: 4px; background: transparent; font-size: 18px; font-weight: 650; line-height: 1.5; resize: none; overflow: hidden; }
.ot-title-input:disabled { opacity: 1; }
.ot-description { position: relative; margin: 16px 0 10px; }
.ot-description-text { padding-right: 24px; color: var(--ot-secondary); white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.7; }
.ot-description-text a { color: var(--color-text-link, var(--ot-text)); }
.ot-edit-description { position: absolute; top: -2px; right: -2px; display: grid; width: 28px; height: 28px; place-items: center; color: var(--ot-muted); }
.ot-add-description { padding: 4px 2px; color: var(--ot-muted); }
.ot-description textarea { width: 100%; min-height: 88px; max-height: 300px; padding: 8px; line-height: 1.7; resize: vertical; }
.ot-links { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; }
.ot-links:empty { display: none; }
.ot-links a { text-decoration: none; }
.ot-links a:hover { text-decoration: underline; }
.ot-links button { color: var(--ot-secondary); }
.ot-metadata { margin: 16px 0; }
.ot-metadata summary { display: flex; align-items: center; gap: 6px; padding: 8px 0; color: var(--ot-muted); font-size: 12px; list-style: none; cursor: pointer; }
.ot-metadata summary::-webkit-details-marker { display: none; }
.ot-metadata summary svg { width: 12px; height: 12px; }
.ot-metadata[open] summary svg { transform: rotate(90deg); }
.ot-metadata-preview { margin-left: auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
.ot-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; padding: 8px 0; border: 0; }
.ot-fields label { display: flex; flex-direction: column; gap: 6px; color: var(--ot-muted); font-size: 12px; }
.ot-fields input, .ot-fields .orbit-ui-select-trigger { width: 100%; color: var(--ot-text); font-size: 13px; }
.ot-field-wide { grid-column: 1 / -1; }
.ot-save-bar { display: flex; justify-content: flex-end; gap: 6px; margin: 12px 0 16px; font-size: 12px; }
.ot-save-bar button { padding: 6px 12px; border: 1px solid var(--ot-line); border-radius: 7px; }
.ot-primary { background: var(--ot-primary); color: var(--ot-on-primary); }
.ot-primary:hover:not(:disabled) { background: var(--color-background-primary-solid-hover, var(--ot-primary)); }
.ot-subtasks { padding-top: 16px; border-top: 1px solid var(--ot-line); }
.ot-subtask-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; color: var(--ot-muted); font-size: 12px; font-variant-numeric: tabular-nums; }
.ot-subtask-heading > span:first-child { margin-right: auto; color: var(--ot-secondary); font-weight: 600; }
.ot-detail-child { display: flex; align-items: center; gap: 6px; min-height: 40px; margin: 0 -6px; padding: 4px 2px; border-radius: 6px; }
.ot-detail-child:hover { background: var(--ot-hover); }
.ot-child-title { flex: 1; min-width: 0; padding: 5px 0; text-align: left; overflow-wrap: anywhere; }
.ot-add-child { min-height: 36px; margin: 6px 0 0; padding-left: 3px; }
.ot-add-child { display: flex; align-items: center; gap: 7px; }
.ot-add-child > svg { color: var(--ot-muted); }
.ot-add-child input { width: 100%; padding: 8px 0; border: 0; border-radius: 0; background: transparent; }
.ot-add-child button { flex: none; padding: 4px 6px; font-size: 12px; }
.ot-add-child input:focus-visible { box-shadow: none; }
.ot-add-child:focus-within { border-radius: 6px; box-shadow: 0 0 0 1px var(--ot-focus); }
.ot-toast { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; width: max-content; max-width: calc(100% - 32px); padding: 8px 10px 8px 14px; border: 1px solid var(--ot-line); border-radius: 10px; background: var(--ot-menu-surface); box-shadow: 0 4px 18px #0003; font-size: 12px; }
.ot-toast > button { flex: none; padding: 4px; }
.ot-toast > button:not(.ot-toast-close) { font-weight: 600; }
.ot-toast-close { color: var(--ot-muted); }
.ot-empty { padding: 52px 16px; color: var(--ot-muted); text-align: center; font-size: 13px; }
.ot-error { padding: 10px 16px; border-bottom: 1px solid var(--ot-line); background: color-mix(in srgb, var(--ot-danger) 8%, transparent); color: var(--ot-danger); font-size: 12px; }
.ot-conflict { margin-bottom: 12px; padding: 10px; border: 1px solid var(--ot-line); border-radius: 8px; background: var(--ot-control); color: var(--ot-secondary); font-size: 12px; }
.ot-conflict button { margin-left: 6px; text-decoration: underline; }
.ot-confirm { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--ot-line); background: var(--ot-menu-surface); font-size: 12px; }
.ot-confirm > div { flex: 1; min-width: 0; }
.ot-confirm strong { display: block; overflow-wrap: anywhere; font-weight: 600; }
.ot-confirm p { margin: 4px 0 0; color: var(--ot-secondary); }
.ot-confirm > button { flex: none; padding: 6px 10px; border: 1px solid var(--ot-line); }
@keyframes ot-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ot-dialog-in { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (hover: none) { .ot-row-delete { opacity: 1; } }
@media (max-width: 720px) {
  .ot-overlay { padding: 10px; }
  .ot-panel, .ot-panel.has-detail { width: calc(100vw - 20px); height: min(680px, calc(100vh - 20px)); max-height: calc(100vh - 20px); }
  .has-detail .ot-workspace { grid-template-columns: minmax(0, 1fr); }
  .has-detail .ot-list { display: none; }
  .ot-detail-content { padding: 16px 14px 56px; }
  .ot-detail-close { width: auto; padding: 0 7px; gap: 5px; display: flex; }
  .ot-detail-close::after { content: "返回列表"; font-size: 12px; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
}
`;
