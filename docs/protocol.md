# Runtime protocol

## Title protocol

The portable fallback metadata lives in the session title:

```text
[Tag][Optional time]Title
```

Both ASCII and Chinese brackets are accepted. Tags are case-insensitive for color lookup but retain their original display spelling.

## Controller/runtime protocol

The legacy runtime currently exposes `window.__codexSidebarTags`. New controller/runtime messages must carry independent protocol and runtime versions.

Planned message families:

- `hello`: negotiate protocol, runtime, and detected Codex build
- `catalogSnapshot`: replace the known session catalog after startup or recovery
- `catalogDelta`: add, update, archive, or remove individual sessions
- `searchRequest`: query, tag filters, sort mode, limit, and request ID
- `searchResult`: matching sessions, snippets, and highlight ranges
- `navigateToThread`: request navigation through the current Codex DOM adapter
- `settingsGet` / `settingsUpdate`: versioned local settings
- `runtimeStatus`: health, compatibility, indexing progress, and the last recoverable error

Unknown message types must be ignored. Unsupported protocol majors must fail closed without modifying native Codex DOM.

