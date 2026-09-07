# Codex Tags

Codex Tags is a reversible local enhancement for the official Codex desktop app. It recognizes structured session names such as `[Bug][09-04] Fix sidebar`, renders the tag separately, adds a lightweight Tags filter above Pinned, and provides a dashboard for sorting and local conversation search.

It does not modify the signed Codex application bundle or `app.asar`. A small local controller starts Codex with a loopback-only Chrome DevTools Protocol endpoint and injects a self-contained UI runtime into the active renderer.

## Status

The current release is a macOS productization preview. The plugin packages installation and management workflows; Codex does not currently expose a documented native-sidebar extension API, so the sidebar UI still uses a local CDP adapter.

## Naming protocol

```text
[Tag][Time]Title
[Tag]Title
【Tag】【Time】Title
```

`Time` is optional. Untagged sessions remain visible as uncategorized sessions.

Each tag has a name, a freely selected color, and an optional classification description. The settings view offers six curated color presets plus the system color picker. For newly created sessions, the plugin's lifecycle hook supplies every configured tag name and non-empty description to the Codex agent on the first prompt. Colors remain UI-only; the hook does not rename sessions or edit transcript files itself.

The injected interface supports English and Simplified Chinese and follows the language selected in Codex, including live language changes. User-created tag names, descriptions, session titles, and conversation content are data and are never translated automatically.

## Documentation

- [Local development and debugging](docs/development.md)
- [Distribution and user installation](docs/distribution.md)
- [Architecture](docs/architecture.md)
- [Architecture roadmap and engineering TODO](docs/roadmap.md)
- [Runtime protocol](docs/protocol.md)
- [Compatibility policy](docs/compatibility.md)

## Local development

```bash
npm ci
npm run verify
node scripts/manage.mjs install
node scripts/manage.mjs status
node scripts/manage.mjs enable
node scripts/manage.mjs restore
```

During UI development, `npm run dev:apply` performs build → atomic install → hot apply against an already debuggable Codex process. `npm run qa:app` runs the named real-app smoke scenarios and writes screenshots to the private Application Support preview directory.

The injected UI is authored in TypeScript and Preact, then bundled into a single browser IIFE. Conversation bodies are incrementally indexed in a local SQLite FTS5 database and searched asynchronously; only bounded matching snippets enter the renderer. `install` writes the checked-in browser artifact and SQLite runtime into the user Application Support directory and creates the launcher. `enable` applies it to an already debuggable Codex process; if Codex needs to be relaunched with CDP, the command performs a graceful quit and relaunch.

For the complete edit-and-preview loop and real-app QA, follow [Local development and debugging](docs/development.md). For current and future installation channels, follow [Distribution and user installation](docs/distribution.md).
