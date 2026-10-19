export const homeStyles = `
:host { display:block; width:100%; }
.oth-home { position:relative; width:100%; }
.oth-header { display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:12px; }
.oth-header > span { color:var(--ot-muted); font-size:12px; }
.oth-header > button { flex:none; padding:3px 0; color:var(--ot-secondary); font-size:12px; }
.oth-task-scroll { max-height:min(300px,44vh); overflow-y:auto; overscroll-behavior:contain; scrollbar-width:thin; scrollbar-color:var(--ot-line) transparent; scrollbar-gutter:stable; padding:2px 4px 2px 0; border-radius:7px; }
.oth-task-scroll:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:3px; }
.oth-group { margin:0 0 16px; }
.oth-group:last-of-type { margin-bottom:0; }
.oth-group h3 { display:flex; align-items:center; gap:8px; margin:0 0 8px; color:var(--ot-secondary); font-size:12px; font-weight:600; }
.oth-group h3 > span { color:var(--ot-muted); font-weight:400; font-variant-numeric:tabular-nums; }
.oth-group.is-overdue h2, .oth-task-row time.is-overdue { color:var(--ot-danger); }
.oth-group ul { list-style:none; margin:0; padding:0; }
.oth-task-group { padding:0; }
.oth-task-row { display:grid; grid-template-columns:16px 24px minmax(0,1fr) auto auto; align-items:center; gap:4px; min-height:36px; padding:2px 6px; border-radius:7px; }
.oth-home .ot-check { width:24px; height:28px; }
.oth-home .ot-check svg { width:16px; height:16px; }
.oth-home .ot-expand,.oth-home .ot-expand-space { width:16px; }
.oth-home .ot-expand svg { width:12px; height:12px; }
.oth-task-row:hover { background:var(--ot-hover); }
.oth-task-title { min-width:0; padding:5px 4px; text-align:left; font-size:13px; line-height:1.5; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; overflow-wrap:anywhere; }
.oth-task-title:hover { background:transparent !important; }
.oth-task-row time { padding:0 8px; color:var(--ot-muted); font-size:12px; font-variant-numeric:tabular-nums; }
.oth-group .oth-children { margin-left:20px; }
.oth-children .oth-task-title { font-size:13px; color:var(--ot-secondary); }
.oth-project { max-width:160px; color:var(--ot-muted); font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
@media(max-width:620px) { .oth-project { display:none; } }
.oth-empty { display:flex; align-items:center; gap:8px; padding:4px 0; color:var(--ot-muted); }
.oth-empty > svg { width:18px; height:18px; }
.oth-empty h3 { margin:0; font-size:12px; font-weight:400; color:var(--ot-secondary); }
.oth-error { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; padding:12px; border:1px solid var(--ot-line); border-radius:8px; color:var(--ot-danger); font-size:12px; }
.oth-error button { padding:4px 8px; flex:none; color:var(--ot-text); }
.oth-confirm { position:sticky; z-index:1; top:12px; padding:16px; border:1px solid var(--ot-line); border-radius:10px; background:var(--ot-surface); box-shadow:0 4px 16px #0002; }
.oth-confirm p { margin:0 0 12px; }
.oth-confirm > div { display:flex; justify-content:flex-end; gap:8px; }
.oth-confirm button { padding:6px 12px; border:1px solid var(--ot-line); }
.oth-toast { position:sticky; bottom:16px; display:flex; align-items:center; gap:14px; width:max-content; max-width:100%; margin:20px auto 0; padding:8px 10px 8px 14px; border:1px solid var(--ot-line); border-radius:10px; background:var(--ot-menu-surface); box-shadow:0 4px 18px #0003; font-size:12px; }
.oth-toast button { flex:none; padding:4px; font-weight:600; }
.oth-toast-close { color:var(--ot-muted); }
`;
