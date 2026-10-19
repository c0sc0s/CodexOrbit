export const homeStyles = `
:host { display:flex; flex:1 1 auto; align-self:stretch; width:100%; height:100%; min-width:0; min-height:0; font:inherit; color-scheme:inherit; }
* { box-sizing:border-box; }
[hidden] { display:none !important; }
.orbit-home-page { --home-text:var(--color-text-foreground,var(--color-token-text-primary,CanvasText)); --home-muted:var(--color-text-secondary,var(--color-token-text-secondary,GrayText)); --home-line:var(--color-border,var(--color-token-border-light,#8883)); --home-hover:var(--color-background-primary-hover,var(--color-token-main-surface-secondary,#8881)); flex:1; min-width:0; min-height:0; height:100%; overflow:auto; overscroll-behavior:contain; background:var(--color-background-primary,var(--color-token-main-surface-primary,Canvas)); color:var(--home-text); outline:none; }
button,input { font:inherit; color:inherit; }
button { cursor:pointer; border:0; background:transparent; border-radius:8px; }
button:hover { background:var(--home-hover); }
button:focus-visible,input:focus-visible { outline:2px solid var(--color-border-focused,#6b9eff); outline-offset:3px; }
button:disabled,input:disabled { opacity:.5; cursor:default; }
.home-content { width:min(980px,100%); margin:0 auto; padding:32px 36px 48px; }
.home-header { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; margin-bottom:32px; }
.home-header > div { min-width:0; }
.home-greeting { margin:0; font-family:"Orbit Home Dots","Orbit Home CJK Dots",ui-monospace,monospace; font-size:36px; font-weight:650; font-variation-settings:"ROND" 100; font-synthesis:none; line-height:1.35; letter-spacing:0; overflow-wrap:anywhere; }
.home-clock { display:flex; align-items:baseline; flex-wrap:wrap; gap:10px; margin-top:8px; color:var(--home-muted); font-size:12px; line-height:1.5; }
.home-clock time { font-variant-numeric:tabular-nums; }
.home-customize { display:grid; place-items:center; flex:none; width:30px; height:30px; margin-top:8px; padding:6px; color:var(--home-muted); opacity:.55; }
.home-customize:hover,.home-customize:focus-visible,.home-customize[aria-expanded="true"] { opacity:1; }
.home-customize svg { width:18px; height:18px; }
.home-settings { padding:20px; margin-bottom:28px; border:1px solid var(--home-line); border-radius:12px; }
.home-name { display:flex; align-items:center; flex-wrap:wrap; gap:14px; font-size:13px; }
.home-name input { width:min(240px,100%); padding:8px 10px; border:1px solid var(--home-line); border-radius:8px; background:var(--home-hover); }
.home-settings fieldset { border:0; padding:0; margin:20px 0 0; }
.home-settings legend { padding:0; font-size:12px; color:var(--home-muted); margin-bottom:12px; }
.home-module-options { display:flex; flex-wrap:wrap; gap:12px 24px; }
.home-module-option { display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; }
.home-module-option input { accent-color:var(--color-text-foreground,var(--color-token-text-primary,#888)); width:15px; height:15px; margin:0; }
.home-notice { display:flex; align-items:center; gap:16px; padding:12px 0; color:var(--home-muted); font-size:12px; }
.home-notice button { padding:6px 10px; }
.home-overview { display:grid; gap:24px; margin-top:24px; }
.home-main[hidden] + .home-overview { margin-top:0; }
.home-section { min-width:0; }
.home-section-header { display:flex; align-items:center; gap:8px; min-height:24px; margin-bottom:10px; }
.home-section-header h2 { margin:0; font-size:14px; font-weight:600; letter-spacing:-.015em; }
.home-section-summary { color:var(--home-muted); font-size:12px; font-variant-numeric:tabular-nums; }
.home-section-summary:empty,.home-section-actions:empty { display:none; }
.home-section-actions { margin-left:auto; display:flex; align-items:center; gap:8px; }
.home-section-actions button,.home-section-summary button { display:inline-flex; align-items:center; gap:5px; padding:3px 0; color:var(--home-muted); font-size:12px; }
.home-section-summary strong { font-weight:400; }
.home-overview > .home-section { padding-top:20px; border-top:1px solid var(--home-line); }
.home-main { display:grid; grid-template-columns:minmax(0,1fr); gap:24px; }
.home-main > .home-section + .home-section { padding-top:20px; border-top:1px solid var(--home-line); }
.home-main > .is-compact { display:flex; align-items:center; flex-wrap:wrap; gap:12px 24px; }
.home-main > .is-compact .home-section-header { margin:0; }
.home-main > .is-compact .home-section-body { margin-left:auto; }
@media(max-width:760px) { .home-content { padding:28px 24px 40px; } }
@media(max-width:480px) { .home-content { padding:24px 18px 40px; } .home-header { gap:12px; margin-bottom:28px; } .home-greeting { font-size:30px; } .home-customize { margin-top:4px; } }
`;
