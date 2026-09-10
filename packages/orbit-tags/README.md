# Orbit Tags

Optional session tags, local search and naming guidance for Orbit.

Install Orbit first. From a built OrbitAI checkout:

```sh
orbit plugin add ./packages/orbit-tags
orbit start
orbit plugin list
orbit doctor
```

Use `~/Applications/Orbit.app` for subsequent launches. Review SessionStart, UserPromptSubmit and SessionEnd in Codex Plugins; commands do not grant hook trust.

```sh
orbit plugin disable orbit-tags
orbit plugin enable orbit-tags
orbit plugin uninstall orbit-tags
```

Tags owns its renderer, service and business data. Orbit owns runtime installation, launcher, registrations and shared configuration. The manifest declares Orbit >=0.5.0 <0.6.0 and module ID `orbit-tags`. Its official naming extension is `codex-tags@codex-tags-cli`.

Disable preserves files/data; uninstall retains data by default and leaves Orbit and peers intact. Naming hooks read the assigned data directory. Settings and search content stay local; official application, authentication and session files are not modified.

Version 0.9.0 is an unpublished npm candidate. Registry installation uses `orbit plugin install @c0sc0s/orbit-tags` after publication; registry updates use `orbit plugin update orbit-tags`.

See [installation](../../docs/distribution.md), [service structure](../../docs/source-layout.md) and [verification](../../docs/compatibility.md).
