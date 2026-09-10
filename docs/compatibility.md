# Compatibility and verification

Orbit integrates with private Codex renderer DOM and local metadata. Every Codex update requires renewed adapter and lifecycle checks.

## Verification baseline

The candidate is Orbit 0.5.0, Orbit Tags 0.9.0 and injected runtime 6.5.1 on macOS. Automated checks cover build, types, architecture boundaries, service isolation, ownership, recovery and independently installed tarballs.

| Scenario | Coverage |
| --- | --- |
| Empty Orbit installation | Packed runtime and launcher with icon |
| Tags lifecycle | Real official CLI in an isolated user configuration; add, disable, enable and uninstall |
| Missing marketplace | Owned-path recovery and foreign-source protection |
| Failed activation | Configuration restoration and independent runtime recovery |
| Live UI | Navigation/dialog, themes, Chinese IME, search/menu, unsaved editor and highlighting |
| Clean-account cold launch | Manual acceptance required |
| First-turn naming and hook trust | Manual acceptance required |
| Never-expanded session navigation | Manual acceptance required |
| Registry onboarding | Requires publication and registry acceptance |

`npm run qa:app` exercises an injected app without restarting Codex, renaming tasks or saving tag edits. It does not validate hook authorization. Record the exact Codex version and build during release acceptance.

## Adapter requirements

Validate host anchors before DOM changes, preserve native content and attributes, and disable the affected enhancement when checks fail. Private selectors belong in Tags' `codex-dom-adapter.ts`. Diagnostics expose capabilities and bounded errors, never session bodies.

The official bundle, signature, authentication and session files must remain untouched.

## Limits

- Installation is supported on macOS; Windows and Linux installation are not verified.
- The catalog uses schema-checked private local metadata; remote-only tasks use best-effort native-row discovery.
- Search caps fields at 24,000 characters and sessions at 500,000, excludes tool output and returns at most 100 unique sessions.
- Settings use last-writer-wins across windows.
- Runtime rollback does not undo business data migrations. Snapshot garbage collection and power-loss journaling are not implemented.
- Renderers share the DOM and main thread; services have the user's Node privileges.
- Doctor cannot grant or certify hook trust.
