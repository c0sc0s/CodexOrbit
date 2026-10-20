# Release notes

## npm installation candidate: Orbit 0.5.4, Tags 0.9.1, Todo 0.1.0 and Home 0.1.0

- Independent Home and Todo plugins install from npm through Orbit's plugin manager.
- Home composes an optional running-session list, scrollable tasks and tag counts, with local display preferences.
- Shared UI exports provide Home module registration and themed selectors; business plugins remain optional.
- Tags contributes live running sessions and tag summaries to Home while retaining its search, navigation and naming capabilities.
- Pinned package versions support installation acceptance; clean-account launch and hook authorization remain manual checks.

## Orbit 0.5.2

- Detect missing or disabled Codex extension registrations and missing plugin payloads during platform diagnostics.
- Repair registration drift when installing Orbit again or enabling an already enabled plugin.
- Preserve plugin data and Codex hook trust boundaries during recovery.

## Orbit 0.5.1

- Platform uninstall with preview, explicit confirmation, optional owned-data cleanup and residual-process protection.
- FIGlet wordmark, Ora progress, styled responsive help and readable platform results.
- Explicit JSON and plain output modes with script-compatible defaults.
- Compatible with Orbit Tags 0.9.0; renderer and SDK contracts are unchanged.

## OrbitAI candidate: Orbit 0.5.0 and Orbit Tags 0.9.0

- Independently installed Orbit platform with its own application icon and optional plugins.
- Versioned runtime snapshots, plugin manifests, ownership checks, serialized mutations and activation recovery.
- Orbit Tags module `orbit-tags`: local search, configurable tags, sidebar controls and naming hooks; runtime 6.5.1.
- Strict TypeScript workspaces, ESM/declarations and public SDK boundaries.
- Packed-consumer, real official CLI onboarding, failure recovery and live UI verification.

Npm publication, clean-account cold launch and manual hook acceptance are release gates. See [distribution](docs/distribution.md) and [compatibility](docs/compatibility.md).
