# Codex Tags engineering rules

- `runtime/src/` is the only source of the installed enhancement. Never edit the installed copy under `~/Library/Application Support/Codex Sidebar Tags` directly.
- Keep the official Codex application bundle, `app.asar`, code signature, tasks, and authentication data untouched.
- The injected runtime must remain self-contained and must not load remote scripts, styles, or assets.
- Treat Codex DOM selectors as versioned adapters. Prefer stable `data-*` attributes and fail closed when required anchors are unavailable.
- Keep session content local. Never log conversation bodies or send them to a remote service.
- Use semantic versioning for the plugin and increment the runtime version after every visible or protocol change.
- Run `node --test runtime/test/*.test.mjs` and the real-app runtime QA before publishing an update.

