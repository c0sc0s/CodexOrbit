# Orbit platform ownership

## Product boundary

Orbit is the installed product and Codex launch entry. It supports zero plugins. Business packages supply manifests, local renderer bundles, services and optional official Codex naming extensions. They do not own shared infrastructure.

## Resources and lifecycle

Orbit owns the installation root, launcher, versioned runtime, configuration lock and plugin registrations. Each plugin has a package snapshot and an assigned persistent data directory. Disabling keeps files and data; uninstalling retains data unless a supported purge is requested.

`loader.json` records active runtime and package ownership. Mutations use its installation lock. Snapshots contain resolved production dependencies, not links into the checkout. Compatibility checks precede activation.

Module changes restart a running Orbit daemon without restarting Codex. Failed activation restores configuration and attempts recovery of the runtime independently from extension recovery. Retained runtime snapshots support rollback; business data is not rolled back.

## Plugin identity

A plugin declares its canonical ID, version, compatibility interval and entries in `orbit-plugin.json`. Tags uses `orbit-tags`. Official extension names are a separate contract: Tags registers `codex-tags@codex-tags-cli`.

An optional `legacyIds` declaration allows same-package identity resolution. Ownership and ambiguity checks apply to every identity; data and enabled state are retained. External data is not recursively purged.

Official extension registration uses Codex commands without editing trust records. Recovery may remove only a missing marketplace with an exact declared name and platform-owned path. Foreign or malformed existing sources require inspection.

## Interfaces

`orbit install/start/status/doctor/update/rollback` manage Orbit. `orbit plugin add/install/list/enable/disable/uninstall/update` manage capabilities. See [distribution](distribution.md) for executable examples.

The stable application entry resolves the active runtime. Explicit `--config` commands support unmanaged development manifests; low-level writers cannot mutate platform-managed configuration.

## Acceptance

- A standalone Orbit tarball installs a zero-plugin platform and application icon.
- Independent plugins can register, disable and uninstall without affecting peers or the platform.
- Invalid paths, conflicting ownership and incompatible versions fail safely.
- Activation recovery restores configuration and attempts to restart the owned runtime.
- Packed Tags installs with native SQLite and official naming payloads.
- Real CLI onboarding runs in an isolated user directory; live UI acceptance uses a debug-enabled Codex.

Cross-plugin RPC, shared business databases, a plugin store and UI-slot arbitration are outside the implemented contract.
