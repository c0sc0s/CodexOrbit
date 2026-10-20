export const feedStyles = `
:host { display:block; min-width:0; color:var(--color-text-foreground,CanvasText); font:inherit; color-scheme:inherit; }
* { box-sizing:border-box; } [hidden] { display:none !important; }
.feed { --muted:var(--color-text-secondary,GrayText); --line:var(--color-border,#8883); font-size:12px; }
.feed-list { display:grid; gap:2px; margin:0; padding:0; list-style:none; max-height:300px; overflow:auto; overscroll-behavior:contain; scrollbar-width:thin; }
.feed-link { display:block; border-radius:8px; padding:9px 10px; color:inherit; text-decoration:none; }
.feed-link:hover { background:var(--color-background-primary-hover,#8881); }
.feed-link:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:-2px; }
.feed-title { display:flex; align-items:baseline; gap:12px; }
.feed-name { flex:1; min-width:0; line-height:1.6; overflow-wrap:anywhere; }
.feed-status { flex:none; color:var(--muted); font-size:11px; }
.feed-details { color:var(--muted); font-size:11px; line-height:1.6; margin-top:3px; overflow-wrap:anywhere; }
.feed-notice { margin:4px 0 10px; color:var(--muted); line-height:1.7; overflow-wrap:anywhere; }
.feed-command { display:block; margin-top:4px; font-size:11px; user-select:all; }
.feed-empty { padding:8px 0; color:var(--muted); }
.feed-footer { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; color:var(--muted); font-size:11px; }
.feed-actions { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
button,a { font:inherit; } .feed-actions button,.feed-actions a { border:0; padding:3px 0; color:var(--muted); background:transparent; text-decoration:none; cursor:pointer; }
@media(max-width:480px) { .feed-title { flex-wrap:wrap; gap:2px 8px; } }
`;
