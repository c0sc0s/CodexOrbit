# Orbit application assets

- `logo.png`: cobalt-blue pixel planet, stepped white orbit and lime-green star.
- `app-icon.png`: square application composition emphasizing the complete silhouette.
- `icon.icns`: packaged macOS icon, including 16, 32, 128, 256 and 512-point representations at 1× and 2×.

These assets belong to Orbit and ship without requiring Tags.

Run `npm run build:icon -w @c0sc0s/orbit` on macOS to convert `app-icon.png` with `sips` and `iconutil`. Consumers use the prebuilt ICNS and need no conversion tools.
