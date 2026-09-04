# Codex Tags

Codex Tags is a reversible local enhancement for the official Codex desktop app. It recognizes structured session names such as `[Bug][09-04] Fix sidebar`, renders the tag separately, and adds a Tags dashboard for filtering, sorting, and local conversation search.

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

## Documentation

- [Local development and debugging](docs/development.md)
- [Distribution and user installation](docs/distribution.md)
- [Architecture](docs/architecture.md)
- [Runtime protocol](docs/protocol.md)
- [Compatibility policy](docs/compatibility.md)

## Local development

```bash
npm ci
npm run build
npm run typecheck
npm test
node scripts/manage.mjs install
node scripts/manage.mjs status
node scripts/manage.mjs enable
node scripts/manage.mjs restore
```

The injected UI is authored in TypeScript and Preact, then bundled into a single browser IIFE. `install` writes that checked-in build artifact into the user Application Support directory and creates the launcher. `enable` applies it to an already debuggable Codex process; if Codex needs to be relaunched with CDP, the command performs a graceful quit and relaunch.

For the complete edit-and-preview loop and real-app QA, follow [Local development and debugging](docs/development.md). For current and future installation channels, follow [Distribution and user installation](docs/distribution.md).
