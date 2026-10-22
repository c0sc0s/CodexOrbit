export const feedStyles = `
:host { display:block; min-width:0; color:var(--color-text-foreground,CanvasText); font:inherit; color-scheme:inherit; }
* { box-sizing:border-box; } [hidden] { display:none !important; }
.feed { --muted:var(--color-text-secondary,GrayText); --line:var(--color-border,#8883); --hover:var(--color-background-primary-hover,#8881); font-size:12px; }
.feed-list { display:grid; gap:4px; margin:0; padding:0; list-style:none; max-height:320px; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; }
.feed-row { display:flex; align-items:center; gap:8px; padding-right:12px; border:1px solid transparent; border-radius:9px; }
.feed-row:hover { background:var(--hover); }
.feed-link { display:block; flex:1; min-width:0; border-radius:8px; padding:10px 12px; color:inherit; text-decoration:none; }
.feed-link:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:-3px; }
.feed-remove { display:grid; place-items:center; flex:none; width:28px; height:28px; padding:6px; border:0; border-radius:6px; background:transparent; color:var(--muted); cursor:pointer; opacity:0; }
.feed-row:hover .feed-remove,.feed-row:focus-within .feed-remove,.feed-remove:disabled { opacity:1; }
.feed-remove:hover { background:color-mix(in srgb,var(--color-text-danger,#cf6666) 12%,transparent); color:var(--color-text-danger,#cf6666); }
.feed-remove:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:2px; }
.feed-remove:disabled { opacity:.45; cursor:wait; }
.feed-title { display:flex; align-items:center; flex-wrap:wrap; gap:5px 8px; }
.feed-name { min-width:0; font-weight:500; line-height:1.6; overflow-wrap:anywhere; }
.feed-status { --status-color:var(--muted); display:inline-flex; align-items:center; flex:none; gap:4px; padding:1px 6px; border-radius:5px; background:color-mix(in srgb,var(--status-color) 10%,transparent); color:var(--status-color); font-size:10px; line-height:1.6; white-space:nowrap; }
.feed-status::before { content:""; width:4px; height:4px; border-radius:50%; background:currentColor; }
.feed-status[data-tone=positive] { --status-color:var(--color-text-success,color-mix(in srgb,CanvasText 35%,#4eab83)); }
.feed-status[data-tone=warning] { --status-color:var(--color-text-warning,color-mix(in srgb,CanvasText 35%,#b18a45)); }
.feed-status[data-tone=info] { --status-color:var(--color-text-info,color-mix(in srgb,CanvasText 35%,#6299cf)); }
.feed-meter { --meter-color:var(--color-text-foreground,CanvasText); position:relative; display:inline-flex; align-items:center; justify-content:center; flex:none; width:86px; height:20px; overflow:hidden; border-radius:5px; background:color-mix(in srgb,var(--meter-color) 5%,transparent); font-size:10px; font-variant-numeric:tabular-nums; line-height:1; white-space:nowrap; }
.feed-meter-fill { position:absolute; inset:0 auto 0 0; background:color-mix(in srgb,var(--meter-color) 13%,transparent); }
.feed-meter-label { position:relative; }
.feed-details { display:flex; align-items:baseline; flex-wrap:wrap; gap:2px 12px; color:var(--muted); font-size:11px; line-height:1.6; margin-top:3px; }
.feed-detail { overflow-wrap:anywhere; }
.feed-detail:first-child { font-variant-numeric:tabular-nums; }
.feed-notice { margin:4px 0 10px; color:var(--muted); line-height:1.7; overflow-wrap:anywhere; }
.feed-command { display:block; margin-top:4px; font-size:11px; user-select:all; }
.feed-empty { padding:8px 0; color:var(--muted); }
.feed-footer { margin-top:8px; padding:0 12px; color:var(--muted); font-size:11px; }
.feed-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
button,a { font:inherit; }
@media(hover:none) { .feed-remove { opacity:.7; } }
@media(max-width:480px) { .feed-row { gap:2px; padding-right:9px; } .feed-link { padding:9px; } .feed-meter { width:76px; } .feed-details { column-gap:10px; } }
`;

export const toolbarStyles = `
:host { display:inline-flex; min-width:0; font:inherit; color-scheme:inherit; color:var(--color-text-secondary,GrayText); }
* { box-sizing:border-box; } [hidden] { display:none!important; }
.feed-toolbar { display:flex; align-items:center; gap:4px; }
.feed-updated { font-size:10px; font-variant-numeric:tabular-nums; white-space:nowrap; margin-right:6px; }
button,a { display:inline-flex; align-items:center; justify-content:center; flex:none; gap:5px; height:28px; margin:0; padding:5px 7px; border:0; border-radius:6px; background:transparent; color:inherit; font:inherit; font-size:11px; line-height:1; text-decoration:none; cursor:pointer; }
button { width:28px; padding:6px; }
button:hover,a:hover { background:var(--color-background-primary-hover,#8881); color:var(--color-text-foreground,CanvasText); }
button:focus-visible,a:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:2px; }
button:disabled { opacity:.45; cursor:wait; }
.feed-platform svg { width:12px; height:12px; opacity:.7; }
.is-loading svg { animation:feed-spin 1s linear infinite; }
@keyframes feed-spin { to { transform:rotate(360deg); } }
@media(max-width:600px) { .feed-updated { display:none; } }
@media(prefers-reduced-motion:reduce) { .is-loading svg { animation:none; } }
`;
