# Project identity

`logo.png` is the shared Codex Tags project mark: a cobalt-blue background with a white dot-and-ring ASCII-style tag. Both README languages display it at 128px. It is independent of OpenAI's branding.

`icon.icns` is the macOS launcher asset derived from the same image, containing 16, 32, 128, 256 and 512-point representations at 1× and 2×. Convert with macOS `sips` and `iconutil`; do not generate the app and README marks independently.

The final source is the user's explicitly selected image. Preserve it without regenerating or changing the composition. Install updated assets with `node scripts/manage.mjs install`; this does not restart the app.

## Visual direction

A diagonal tag with a punched hole, finely detailed white and pale-blue rings, tonal shading and a cobalt background. Use this same approved artwork across project and launcher surfaces.
