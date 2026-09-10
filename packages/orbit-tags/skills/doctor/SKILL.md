---
name: doctor
description: Diagnose Orbit Tags installation, startup, UI injection, search, settings, and naming-hook health. Do not mutate an installation without an explicit repair request.
---

# Orbit Tags Doctor

Resolve the plugin root as two directories above this file. Run its read-only diagnostic:

```sh
node "<plugin-root>/scripts/manage.mjs" doctor
```

Inspect the entire JSON result. Check Orbit registration, `~/Applications/Orbit.app`, owned loopback CDP, service health, injected versions, `runtime.tagSettingsError`, `runtime.searchIndex.error` and catalog readiness. An empty index alone is not a failure for a new user. A registered naming hook is not proof of trust or execution.

Distinguish a disabled or absent plugin from a broken installation. Report what passed, what failed and what remains unverified. Inspect only relevant bounded diagnostics; never print transcripts or authentication data.

With an explicit repair request, use Orbit's plugin lifecycle commands and repeat diagnostics. The module ID is `orbit-tags`; the official naming extension is `codex-tags@codex-tags-cli`. Use the installed package's assigned data directory, not a guessed path. Do not bypass ownership checks, hook trust or configuration locks. Never edit installed payloads or the official Codex bundle.

If Codex is open without debugging, ask the user to quit it manually and reopen `Orbit.app`. Do not restart Codex automatically or terminate an unrelated process on the CDP port.
