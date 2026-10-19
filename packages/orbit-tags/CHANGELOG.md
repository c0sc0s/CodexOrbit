# Release notes

## 0.9.1 — npm next

- Add optional Home modules for live running sessions and tag counts.
- Require Orbit >=0.5.4 <0.6.0 for the public Home module contract.
- Use runtime 6.5.13 and refresh the official extension cache version.

## 0.9.0 — candidate

- Orbit module `orbit-tags`, compatible with Orbit >=0.5.0 <0.6.0.
- Runtime 6.5.1: configurable tags, local search, sidebar filtering/sorting and naming guidance.
- Platform-managed installation and updates; Tags owns its business data and renderer/service logic.
- Strict TypeScript contracts, isolated service process and locally bundled Preact UI.
- Packed dependency, native SQLite, naming context and official extension lifecycle verification.

Registry publication and manual hook/cold-launch acceptance are required before release.
