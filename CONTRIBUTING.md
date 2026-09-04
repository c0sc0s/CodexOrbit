# Contributing

## Development loop

1. Change source only under `runtime/src/`, `scripts/`, or `skills/`.
2. Run syntax checks and unit tests.
3. Install the candidate runtime with `node scripts/manage.mjs install`.
4. Hot-apply only when `node scripts/manage.mjs status` reports an active Codex CDP endpoint.
5. Run `node runtime/qa-runtime.mjs` against the real app.
6. Update `CHANGELOG.md` for user-visible, protocol, installer, or compatibility changes.

## Release rules

- Increment the plugin version for every published package.
- Increment the injected runtime version for every runtime behavior change.
- Keep controller/runtime protocol changes backward compatible within a major version.
- Record the tested Codex application build in release notes.
- Do not publish private Session content, logs, local paths, or generated runtime state.

## Compatibility changes

All native Codex selectors belong in the DOM adapter boundary. A missing required selector must disable the affected enhancement and preserve the native interface; do not add broad DOM guesses or global CSS overrides.

