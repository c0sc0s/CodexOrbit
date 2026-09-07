---
name: doctor
description: Diagnose Codex Tags installation, background startup, UI injection, search, settings, and naming-hook health when users ask whether Tags is working or why it is missing.
---

# Codex Tags Doctor

Resolve the plugin root as two directories above this file. Run the bundled read-only diagnostic, quoting the resolved path:

```sh
node "<plugin-root>/scripts/manage.mjs" doctor
```

Inspect the entire JSON result, not just the exit code. Check runtime installation, the launch supervisor, official plugin registration and payload, owned loopback CDP, and injected versions. Also inspect `runtime.tagSettingsError`, `runtime.searchIndex.error`, and `runtime.searchIndex.indexedSessions`; an empty index is not by itself a failure for a new user. A registered hook is not proof that the user trusted it or that it executed.

Distinguish an uninstalled or intentionally disabled installation from a broken one. If Codex is closed, explain that live UI and CDP cannot be verified. If needed, read only recent relevant controller/supervisor logs in the installation directory; do not print transcripts or authentication data. Report what is healthy, what failed, what remains unverified, and the smallest useful next action in a short answer.

This is a diagnostic skill. Do not install, enable, restart, rename sessions, or change trust/configuration unless the user also requests a fix. For an authorized repair use the bundled manager's `enable`, then repeat `doctor`; warn before any required Codex restart. Never bypass hook trust or terminate an unrelated process on the CDP port. CLI lifecycle commands are documented in the plugin's `README.md`.
