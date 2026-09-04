# Runtime protocol

## Title protocol

The portable fallback metadata lives in the session title:

```text
[Tag][Optional time]Title
```

Both ASCII and Chinese brackets are accepted. Tags are case-insensitive for color lookup but retain their original display spelling.

## New-session naming hook

The plugin bundles `SessionStart`, `UserPromptSubmit`, and `SessionEnd` lifecycle hooks. A `startup` event arms one session ID, and the first prompt for that ID consumes the marker and receives a compact developer-context naming policy. Resumed sessions and later prompts receive no context. `SessionEnd` removes an unused marker.

The hook never edits a transcript or session file. It instructs the Codex agent to use Codex's own task naming capability and select exactly one configured tag. The controller mirrors the renderer's tag definitions to the versioned local `settings.json` file; the hook reads that file and falls back to the built-in definitions when it is unavailable.

```json
{
  "schemaVersion": 1,
  "tags": [{ "name": "Bug", "tone": "red" }]
}
```

## Controller/runtime protocol

The injected runtime exposes `window.__codexSidebarTags` as a deliberately small compatibility surface:

- `setSearchResult(result)`: accept a bounded result for the current request ID
- `tagDefinitions()`: return a defensive snapshot for local settings synchronization
- `contentThreadIds()`: enumerate sessions currently mapped by the DOM adapter
- `status()`: report runtime version, enhanced rows, search state, and render counters
- `debug()`: return the bounded local interaction trace
- `dispose()`: restore native DOM and remove injected UI and listeners

The runtime sends `searchRequest` messages through the CDP `Runtime.addBinding` bridge. The controller searches the local SQLite FTS5 index and returns `searchResult` messages through evaluated expressions. Request IDs make stale responses safe to ignore. Only matching snippets are transferred; full conversation bodies remain outside the renderer. The browser bundle is loaded from the installed runtime directory, and no remote script is fetched.

Future controller/runtime messages must carry independent protocol and runtime versions.

Current message families:

- `searchRequest`: query, known thread IDs, result limit, and request ID
- `searchResult`: matching thread IDs, roles, snippets, scores, index status, and request ID

Planned message families:

- `hello`: negotiate protocol, runtime, and detected Codex build
- `catalogSnapshot`: replace the known session catalog after startup or recovery
- `catalogDelta`: add, update, archive, or remove individual sessions
- `navigateToThread`: request navigation through the current Codex DOM adapter
- `settingsGet` / `settingsUpdate`: versioned local settings
- `runtimeStatus`: health, compatibility, indexing progress, and the last recoverable error

Unknown message types must be ignored. Unsupported protocol majors must fail closed without modifying native Codex DOM.
