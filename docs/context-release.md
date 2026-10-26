# Orbit Context 0.1.0 release candidate

## Scope

- npm package: `@c0sc0s/orbit-context@0.1.0`, renderer runtime `0.1.2`, MIT license.
- Compatible platform: Orbit `>=0.5.4 <0.6.0`; the npm runtime dependency is pinned to the published `0.5.4`.
- First publication channel: `next`. The package was absent from the npm registry on 2026-10-26.
- Compact context-ring hover card, ranked category estimates, source details, used-context treemap, measured request totals and cache statistics.
- Local rollout access only. No session writes, conversation bodies in RPC, remote assets, SQLite or Tags runtime dependency.

## Acceptance record

The live card was checked on macOS with Codex `26.1021.31345` (build `21828`, bundle ID `com.openai.codex`). Native hover, current-session resolution, measured local RPC, source drilldown, treemap switching and pointer dismissal passed. The six-category overview measured approximately 352 × 319 CSS pixels.

Repository Tags live QA has the previously documented sort-menu / element availability failure. It is separate from the passing Context live check. Context cold launch in a clean user configuration, post-publication registry installation and additional Codex builds still require acceptance. Context ships no hooks; it does not require naming-hook trust.

## Prepared artifact

The 2026-10-26 candidate passed `npm run verify`, every workspace tarball smoke test, `git diff --check` and npm publish dry-run. The Context renderer is byte-identical to the live-verified runtime 0.1.2. Clean dependency installation on the validation machine used `SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci` to select the pinned prebuilt sharp package instead of its global libvips installation.

- Artifact: `c0sc0s-orbit-context-0.1.0.tgz` (17,725 bytes, nine files).
- SHA-256: `68a357b34d1acb688b8b91977691e797ebdd171cd955662ddd18d6ba9c0ecaa3`.
- Publication state: prepared and dry-run verified; no npm publication or tag promotion has been performed.

## Candidate verification

Run from a clean checkout:

```sh
npm ci
npm run verify
npm run test:package
node packages/orbit-context/scripts/qa-runtime.mjs
git diff --check
npm pack -w @c0sc0s/orbit-context
npm publish ./c0sc0s-orbit-context-0.1.0.tgz --dry-run --access public --tag next
```

The live command requires the candidate runtime installed in an already running Orbit-enabled app, a local conversation with token counts and a closed Context card. Register the built package with `node packages/orbit/dist/cli.js plugin add ./packages/orbit-context` and attach with `node scripts/manage.mjs apply`. Do not restart a user's active Codex for acceptance.

The package smoke checks the actual tarball, MIT license, payload allowlist, service activation, lifecycle and absence of a Tags runtime dependency. CI also checks that the committed Context renderer matches its source. Keep the generated tarball and its SHA-256 together for release review.

## Publication

After the candidate checks and release decision, publish the verified tarball:

```sh
npm publish ./c0sc0s-orbit-context-0.1.0.tgz --access public --tag next
```

Then verify installation from a fresh npm cache and isolated Orbit/Codex configuration:

```sh
npm view @c0sc0s/orbit-context@0.1.0 version dist.integrity --json
orbit plugin install @c0sc0s/orbit-context@0.1.0
orbit plugin list
orbit doctor
```

Confirm the card after a clean launch and a local request, then promote the same immutable package when stable-channel acceptance is complete:

```sh
npm dist-tag add @c0sc0s/orbit-context@0.1.0 latest
```

Git push, a pull request and a dry run do not publish the npm package or change its registry tags.
