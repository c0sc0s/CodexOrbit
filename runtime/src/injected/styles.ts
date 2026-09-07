export interface RuntimeStyleOptions {
  enhancedAttribute: string;
  toolbarId: string;
  filterBarId: string;
  filteredAttribute: string;
  rowAttribute: string;
}

export function buildRuntimeStyles({
  enhancedAttribute,
  toolbarId,
  filterBarId,
  filteredAttribute,
  rowAttribute,
}: RuntimeStyleOptions): string {
  const ENHANCED = enhancedAttribute;
  const TOOLBAR_ID = toolbarId;
  const FILTER_BAR_ID = filterBarId;
  const FILTERED = filteredAttribute;
  const ROW = rowAttribute;
  return `

    [${ENHANCED}] { min-width: 0; }
    .codex-sidebar-tag-layout { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 6px; min-width: 0; max-width: 100%; vertical-align: middle; }
    .codex-sidebar-filter-chip {
      display: inline-flex; flex: 0 0 auto; align-items: center; border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
      border-radius: 999px; font-weight: 650; letter-spacing: .01em;
    }
    .codex-sidebar-tag-chip, .codex-sidebar-result-tag {
      display: inline-flex; align-items: center; min-width: 0; height: 18px; padding: 0;
      border: 0; color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-tertiary, #777)) 44%, var(--color-text-tertiary, var(--color-token-text-tertiary, #777)));
      background: transparent; font-size: 10px; font-weight: 600; line-height: 18px; white-space: nowrap; transition: color 120ms ease;
    }
    [${ROW}="true"]:hover .codex-sidebar-tag-chip { color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-secondary, #999)) 68%, var(--color-text-secondary, var(--color-token-text-secondary, #999))); }
    .codex-sidebar-tag-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    #${FILTER_BAR_ID} { min-width: 0; margin: 0 0 6px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); }
    .codex-sidebar-tags-section-heading { min-height: 28px; margin: 0; pointer-events: none; }
    .codex-sidebar-quick-filter-rail {
      display: flex; min-width: 0; gap: 3px; padding: 1px 4px 5px; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none;
    }
    .codex-sidebar-quick-filter-rail::-webkit-scrollbar { display: none; }
    .codex-sidebar-quick-filter {
      display: inline-flex; flex: 0 0 auto; align-items: center; min-height: 26px; gap: 4px; padding: 0 7px; border: 0; border-radius: 6px;
      color: var(--color-text-secondary, var(--color-token-text-secondary, inherit)); background: transparent; font: inherit; font-size: 12px; cursor: pointer;
      transition: color 100ms ease, background 100ms ease, transform 100ms ease;
    }
    .codex-sidebar-quick-filter:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-quick-filter:active { transform: scale(.97); }
    .codex-sidebar-quick-filter:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: -2px; }
    .codex-sidebar-quick-filter:not([data-value="all"]) { color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-secondary, inherit)) 36%, var(--color-text-secondary, var(--color-token-text-secondary, inherit))); }
    .codex-sidebar-quick-filter[aria-pressed="true"] {
      color: color-mix(in srgb, var(--codex-sidebar-tag-color, var(--color-text-foreground, inherit)) 86%, var(--color-text-foreground, var(--color-token-list-active-selection-foreground, inherit)));
      background: color-mix(in srgb, var(--codex-sidebar-tag-color, #888) 9%, var(--color-token-list-active-selection-background, #8883));
    }
    .codex-sidebar-quick-filter-count { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; font-variant-numeric: tabular-nums; }
    [${ROW}="true"][${FILTERED}="true"] { display: none !important; }

    #${TOOLBAR_ID} {
      display: contents; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
    }
    .codex-sidebar-dashboard-entry { display: contents; }
    .codex-sidebar-dashboard-launcher { width: 100%; color: inherit; font: inherit; }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"] {
      display: flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 12px; border: 0; border-radius: 6px;
      background: transparent; text-align: left; cursor: pointer; transition: background 100ms ease, transform 100ms ease;
    }
    .codex-sidebar-dashboard-launcher[data-dashboard-fallback="true"]:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-dashboard-launcher:active { transform: scale(.985); }
    .codex-sidebar-dashboard-launcher:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: -2px; }

    .codex-sidebar-dashboard-overlay {
      --codex-sidebar-surface: var(--color-background-elevated-primary-opaque, var(--color-background-elevated-base, var(--color-token-dropdown-background, Canvas)));
      --codex-sidebar-menu-surface: var(--color-background-elevated-secondary-opaque, var(--color-background-elevated-high, var(--color-token-dropdown-background, Canvas)));
      position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 24px;
      background: #0006; backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px);
    }
    .codex-sidebar-dashboard-dialog {
      display: flex; width: min(680px, calc(100vw - 40px)); max-height: min(720px, calc(100vh - 48px)); flex-direction: column;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 16px;
      color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: var(--codex-sidebar-surface);
      box-shadow: 0 24px 70px #0007, 0 4px 18px #0003; overflow: hidden; transform-origin: 50% 45%;
    }
    .codex-sidebar-dashboard-header { display: flex; align-items: center; gap: 12px; padding: 15px 16px 12px; border-bottom: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); }
    .codex-sidebar-dashboard-heading { margin: 0; font-size: 17px; font-weight: 650; }
    .codex-sidebar-dashboard-subtitle { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-dashboard-tabs { display: flex; gap: 3px; margin-left: auto; padding: 3px; border-radius: 8px; background: var(--color-background-control, var(--color-token-input-background, #8881)); }
    .codex-sidebar-dashboard-tab { height: 29px; padding: 0 11px; border: 0; border-radius: 6px; color: var(--color-text-secondary, inherit); background: transparent; font: inherit; font-size: 12px; cursor: pointer; transition: color 120ms ease, background 120ms ease, box-shadow 120ms ease, transform 100ms ease; }
    .codex-sidebar-dashboard-tab[aria-selected="true"] { color: var(--color-text-foreground, inherit); background: var(--codex-sidebar-menu-surface); box-shadow: 0 1px 2px #0002; }
    .codex-sidebar-dashboard-tab:active, .codex-sidebar-dashboard-close:active, .codex-sidebar-sort-trigger:active, .codex-sidebar-tag-add:active, .codex-sidebar-tag-delete:active { transform: scale(.97); }
    .codex-sidebar-dashboard-close { display: grid; width: 28px; height: 28px; place-items: center; padding: 0; border: 0; border-radius: 7px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; font-size: 17px; cursor: pointer; transition: color 100ms ease, background 100ms ease, transform 100ms ease; }
    .codex-sidebar-dashboard-close:hover { color: var(--color-text-foreground, inherit); background: var(--color-token-toolbar-hover-background, #8882); }
    .codex-sidebar-dashboard-body { min-height: 0; padding: 14px 16px 16px; overflow-y: auto; }
    .codex-sidebar-dashboard-controls { display: flex; align-items: center; gap: 8px; }
    .codex-sidebar-search {
      display: flex; flex: 1 1 auto; align-items: center; min-width: 0; height: 36px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      background: var(--color-background-control, var(--color-token-input-background, #8881)); transition: border-color 120ms ease, background 120ms ease, box-shadow 120ms ease;
    }
    .codex-sidebar-search:focus-within {
      border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff));
      background: var(--color-background-control-opaque, var(--color-token-input-background, #8882));
      box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent);
    }
    .codex-sidebar-search-icon { width: 29px; flex: 0 0 29px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 15px; text-align: center; pointer-events: none; }
    .codex-sidebar-search[data-loading="true"] .codex-sidebar-search-icon { font-size: 0; }
    .codex-sidebar-search[data-loading="true"] .codex-sidebar-search-icon::after {
      display: inline-block; width: 11px; height: 11px; border: 1.5px solid color-mix(in srgb, currentColor 30%, transparent); border-top-color: currentColor; border-radius: 50%; content: ""; animation: codex-sidebar-search-spin 700ms linear infinite;
    }
    @keyframes codex-sidebar-search-spin { to { transform: rotate(360deg); } }
    .codex-sidebar-search-input {
      width: 100%; min-width: 0; border: 0; outline: 0; padding: 0 7px 0 0; color: var(--color-text-foreground, var(--color-token-input-foreground, inherit));
      background: transparent; font: inherit; font-size: 14px;
    }
    .codex-sidebar-search-input::placeholder { color: var(--color-text-tertiary, var(--color-token-input-placeholder-foreground, #888)); }
    .codex-sidebar-sort-control {
      position: relative; display: flex; flex: 0 0 144px; align-items: center; height: 36px;
    }
    .codex-sidebar-sort-trigger {
      display: flex; width: 100%; height: 36px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px;
      color: var(--color-text-foreground, var(--color-token-input-foreground, inherit)); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px; cursor: pointer; transition: border-color 120ms ease, background 100ms ease, box-shadow 120ms ease, transform 100ms ease;
    }
    .codex-sidebar-sort-trigger:hover { background: var(--color-background-control-opaque, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-sort-trigger:focus-visible, .codex-sidebar-sort-trigger[aria-expanded="true"] { outline: 0; border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-sort-label { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); pointer-events: none; }
    .codex-sidebar-sort-value { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .codex-sidebar-sort-chevron { width: 7px; height: 7px; margin: -3px 2px 0 auto; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; opacity: .7; transform: rotate(45deg); transition: transform 120ms ease; }
    .codex-sidebar-sort-trigger[aria-expanded="true"] .codex-sidebar-sort-chevron { margin-top: 3px; transform: rotate(225deg); }
    .codex-sidebar-sort-menu {
      position: absolute; top: calc(100% + 5px); right: 0; z-index: 8; width: 144px; padding: 4px;
      border: 1px solid var(--color-border-light, var(--color-token-menu-border, #8884)); border-radius: 9px;
      color: var(--color-text-foreground, var(--color-token-dropdown-foreground, inherit)); background: var(--codex-sidebar-menu-surface);
      box-shadow: 0 12px 32px #0006, 0 2px 8px #0003; transform-origin: top right;
    }
    .codex-sidebar-sort-option { display: flex; width: 100%; height: 32px; align-items: center; padding: 0 9px; border: 0; border-radius: 6px; color: inherit; background: transparent; font: inherit; font-size: 13px; text-align: left; cursor: pointer; transition: background 100ms ease; }
    .codex-sidebar-sort-option:hover, .codex-sidebar-sort-option:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-sort-option[aria-selected="true"] { background: var(--color-token-list-active-selection-background, #8883); }
    .codex-sidebar-sort-check { width: 14px; margin-left: auto; color: var(--color-text-secondary, inherit); text-align: center; }
    .codex-sidebar-filter-rail { display: flex; gap: 5px; margin-top: 10px; padding: 0 1px 2px; overflow-x: auto; scrollbar-width: none; }
    .codex-sidebar-filter-rail::-webkit-scrollbar { display: none; }
    .codex-sidebar-filter-chip {
      height: 27px; padding: 0 7px; border-color: transparent; color: var(--color-text-secondary, var(--color-token-text-secondary, inherit));
      background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 12px; cursor: pointer; transition: transform 100ms ease, color 100ms ease, background 100ms ease;
    }
    .codex-sidebar-filter-chip:hover { background: var(--color-background-control, var(--color-token-list-hover-background, #8882)); }
    .codex-sidebar-filter-chip:active { transform: scale(.97); }
    .codex-sidebar-filter-chip[aria-pressed="true"] {
      color: var(--color-text-foreground, var(--color-token-list-active-selection-foreground, inherit));
      border-color: var(--color-border-light, var(--color-token-border-light, #8884));
      background: var(--codex-sidebar-surface); box-shadow: 0 1px 2px #0001;
    }
    .codex-sidebar-filter-count { margin-left: 4px; opacity: .62; font-variant-numeric: tabular-nums; }
    .codex-sidebar-results {
      margin-top: 12px; padding: 6px; border: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius: 11px;
      background: var(--color-background-surface, var(--color-token-bg-secondary, #8881)); overflow-anchor: none; transition: opacity 120ms ease;
    }
    .codex-sidebar-results[data-loading="true"] { opacity: .78; }
    .codex-sidebar-results-head { display: flex; align-items: center; justify-content: space-between; min-height: 26px; padding: 0 5px 5px 7px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; }
    .codex-sidebar-results-list { max-height: min(430px, calc(100vh - 250px)); overflow-y: auto; overscroll-behavior: contain; }
    .codex-sidebar-result-group {
      position: sticky; top: 0; z-index: 1; padding: 5px 7px 3px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888));
      background: var(--codex-sidebar-surface); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase;
    }
    .codex-sidebar-result {
      display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 8px; width: 100%; min-height: 40px; padding: 8px;
      border: 0; border-radius: 8px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit)); background: transparent; text-align: left; font: inherit; cursor: pointer; transition: background 100ms ease, transform 100ms ease;
    }
    .codex-sidebar-result:hover, .codex-sidebar-result:focus-visible { outline: 0; background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-result:active { transform: scale(.995); }
    .codex-sidebar-result-tag { font-size: 11px; }
    .codex-sidebar-result-content { min-width: 0; }
    .codex-sidebar-result-title { display: block; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; line-height: 1.4; }
    .codex-sidebar-result-snippet { display: -webkit-box; margin-top: 4px; overflow: hidden; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; line-height: 1.5; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .codex-sidebar-search-mark {
      padding: 0 1px; border-radius: 3px; color: var(--color-text-foreground, var(--color-token-text-primary, inherit));
      background: color-mix(in srgb, var(--color-border-focus, var(--color-token-focus-border, #4b8cff)) 32%, transparent);
      font-weight: 650; box-decoration-break: clone; -webkit-box-decoration-break: clone; animation: codex-sidebar-search-mark-in 180ms ease-out;
    }
    @keyframes codex-sidebar-search-mark-in { from { background-color: transparent; } }
    .codex-sidebar-results-empty { padding: 17px 8px 19px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 13px; text-align: center; }
    .codex-sidebar-tag-settings-note { margin: 0 0 14px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; line-height: 1.45; }
    .codex-sidebar-tag-settings-unconfigured { display: inline-flex; margin-left: 7px; padding: 1px 6px; border-radius: 5px; color: var(--color-text-secondary, inherit); background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-tag-form { display: grid; gap: 9px; margin-bottom: 14px; padding: 0 0 14px; border-bottom: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); }
    .codex-sidebar-tag-form-row { display: grid; grid-template-columns: minmax(130px, .7fr) minmax(220px, 1.5fr) auto; align-items: end; gap: 8px; }
    .codex-sidebar-tag-field { display: grid; min-width: 0; gap: 5px; }
    .codex-sidebar-tag-field-label { color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 11px; font-weight: 600; }
    .codex-sidebar-tag-input, .codex-sidebar-tag-description {
      min-width: 0; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 8px; outline: 0;
      color: var(--color-text-foreground, inherit); background: var(--color-background-control, var(--color-token-input-background, #8881)); font: inherit; font-size: 13px;
    }
    .codex-sidebar-tag-input { height: 34px; padding: 0 9px; }
    .codex-sidebar-tag-description { height: 34px; padding: 0 9px; }
    .codex-sidebar-tag-input:focus, .codex-sidebar-tag-description:focus, .codex-sidebar-tag-color-custom:focus-visible { border-color: var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-border-focus, #4b8cff) 18%, transparent); }
    .codex-sidebar-tag-color-field { display: flex; min-width: 0; align-items: center; gap: 10px; }
    .codex-sidebar-tag-color-field > .codex-sidebar-tag-field-label { flex: 0 0 auto; }
    .codex-sidebar-tag-color-row { display: flex; min-width: 0; align-items: center; gap: 5px; }
    .codex-sidebar-tag-color-presets { display: flex; align-items: center; gap: 3px; }
    .codex-sidebar-tag-color-preset { display: grid; width: 27px; height: 27px; place-items: center; padding: 0; border: 1px solid transparent; border-radius: 7px; background: transparent; cursor: pointer; }
    .codex-sidebar-tag-color-preset::after { display: block; width: 14px; height: 14px; border-radius: 999px; background: var(--preset-color); box-shadow: inset 0 0 0 1px #fff4; content: ""; }
    .codex-sidebar-tag-color-preset:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-tag-color-preset[aria-pressed="true"] { border-color: var(--color-border-light, #8884); background: var(--color-token-list-active-selection-background, #8883); }
    .codex-sidebar-tag-color-preset:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: 1px; }
    .codex-sidebar-tag-color-custom-control { position: relative; display: inline-flex; height: 27px; align-items: center; gap: 6px; margin-left: 3px; padding: 0 8px 0 6px; border: 1px solid var(--color-border-light, var(--color-token-input-border, #8883)); border-radius: 7px; color: var(--color-text-secondary, inherit); background: transparent; font-size: 11px; cursor: pointer; }
    .codex-sidebar-tag-color-custom-control:hover { background: var(--color-token-list-hover-background, #8882); }
    .codex-sidebar-tag-color-custom-preview { width: 12px; height: 12px; border-radius: 3px; background: var(--custom-color); box-shadow: inset 0 0 0 1px #fff4; }
    .codex-sidebar-tag-color-custom { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: pointer; }
    .codex-sidebar-tag-color-custom:focus-visible { outline: 2px solid var(--color-border-focus, var(--color-token-focus-border, #4b8cff)); outline-offset: 1px; }
    .codex-sidebar-tag-add { height: 34px; padding: 0 13px; border: 1px solid var(--color-border-light, #8884); border-radius: 8px; color: var(--color-token-button-foreground, inherit); background: var(--color-token-button-background, #8882); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 100ms ease, transform 100ms ease; }
    .codex-sidebar-tag-add:hover { background: var(--color-token-list-hover-background, #8883); }
    .codex-sidebar-tag-error { color: #c53b3b; font-size: 12px; }
    .codex-sidebar-tag-error:empty { display: none; }
    .codex-sidebar-tag-config-list { overflow: hidden; border: 1px solid var(--color-border-light, var(--color-token-border-light, #8883)); border-radius: 10px; }
    .codex-sidebar-tag-config-header, .codex-sidebar-tag-config-row { display: grid; grid-template-columns: 12px minmax(92px, .55fr) minmax(0, 1.8fr) 28px; align-items: center; gap: 9px; padding: 0 7px 0 11px; }
    .codex-sidebar-tag-config-header { min-height: 30px; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); background: var(--color-background-surface, var(--color-token-bg-secondary, #8881)); font-size: 10px; font-weight: 600; }
    .codex-sidebar-tag-config-row { min-height: 40px; border-top: 1px solid var(--color-border-light, var(--color-token-border-light, #8882)); background: transparent; transition: background 100ms ease; }
    .codex-sidebar-tag-config-row:hover { background: var(--color-token-list-hover-background, #8881); }
    .codex-sidebar-tag-config-swatch { width: 9px; height: 9px; border-radius: 3px; background: var(--codex-sidebar-tag-color); box-shadow: inset 0 0 0 1px #fff3; }
    .codex-sidebar-tag-config-name { min-width: 0; color: var(--color-text-foreground, inherit); font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border: 0; background: transparent; padding: 0; text-align: left; cursor: pointer; }
    .codex-sidebar-tag-config-name:hover { text-decoration: underline; }
    .codex-sidebar-tag-delete[data-confirm="true"] { width: auto; font-size: 10px; }
    .codex-sidebar-tag-config-description { min-width: 0; color: var(--color-text-tertiary, var(--color-token-text-tertiary, #888)); font-size: 12px; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .codex-sidebar-tag-config-description[data-empty="true"] { opacity: .6; font-style: italic; }
    .codex-sidebar-tag-delete { display: grid; width: 26px; height: 26px; place-items: center; padding: 0; border: 0; border-radius: 6px; color: var(--color-text-tertiary, inherit); background: transparent; font: inherit; cursor: pointer; transition: color 100ms ease, background 100ms ease, transform 100ms ease; }
    .codex-sidebar-tag-delete:hover { color: #c53b3b; background: #ef444418; }
    @media (max-width: 760px) {
      .codex-sidebar-dashboard-overlay { padding: 10px; }
      .codex-sidebar-dashboard-dialog { width: calc(100vw - 20px); max-height: calc(100vh - 20px); }
      .codex-sidebar-dashboard-header { flex-wrap: wrap; }
      .codex-sidebar-dashboard-tabs { order: 3; width: 100%; margin-left: 0; }
      .codex-sidebar-dashboard-tab { flex: 1; }
      .codex-sidebar-tag-form-row { grid-template-columns: minmax(0, 1fr) auto; }
      .codex-sidebar-tag-form-row .codex-sidebar-tag-field:nth-child(2) { grid-column: 1 / -1; grid-row: 2; }
      .codex-sidebar-tag-add { grid-column: 2; grid-row: 1; }
      .codex-sidebar-tag-color-field { align-items: flex-start; flex-direction: column; gap: 5px; }
      .codex-sidebar-tag-config-header, .codex-sidebar-tag-config-row { grid-template-columns: 12px minmax(64px, .6fr) minmax(0, 1.4fr) 28px; }
      .codex-sidebar-results-list { max-height: calc(100vh - 300px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .codex-sidebar-dashboard-launcher, .codex-sidebar-dashboard-tab, .codex-sidebar-dashboard-close, .codex-sidebar-search, .codex-sidebar-sort-trigger, .codex-sidebar-sort-chevron, .codex-sidebar-sort-option, .codex-sidebar-filter-chip, .codex-sidebar-quick-filter, .codex-sidebar-results, .codex-sidebar-result, .codex-sidebar-search-mark, .codex-sidebar-tag-add, .codex-sidebar-tag-delete { animation: none; transition: none; }
      .codex-sidebar-search[data-loading="true"] .codex-sidebar-search-icon::after { animation: none; border-color: currentColor; opacity: .65; }
    }
  `;
}
