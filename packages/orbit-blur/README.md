# @c0sc0s/orbit-blur

Renderer-only Orbit plugin. Injects transparent page backgrounds and `backdrop-filter` Gaussian blur on Codex chrome.

```sh
npm run build -w @c0sc0s/orbit-blur
orbit plugin add ./packages/orbit-blur
orbit plugin enable orbit-blur
```

Bump `runtimeVersion` in `orbit-plugin.json` (and `RUNTIME_VERSION` in source) after injected changes, then rebuild and re-add/apply. The tracked bundle is `runtime/dist/injected.js`.
