# Project identity

`logo.png` is the shared Codex Tags project mark: a cobalt-blue background with a white dot-and-ring ASCII-style tag. It is independent of OpenAI's branding.

`banner.png` is the wide README masthead shared by both languages. It pairs the project name and tagline with the approved tag artwork; the square App icon remains unchanged. The READMEs include localized alt text and separate language/navigation links.

`icon.icns` is the macOS launcher asset derived from the same image, containing 16, 32, 128, 256 and 512-point representations at 1× and 2×. Convert with macOS `sips` and `iconutil`; do not generate the app and README marks independently.

The final source is the user's explicitly selected image. Preserve it without regenerating or changing the composition. Install updated assets with `node scripts/manage.mjs install`; this does not restart the app.

## Visual direction

A diagonal tag with a punched hole, finely detailed white and pale-blue rings, tonal shading and a cobalt background. Use this same approved artwork across project and launcher surfaces.

## Banner generation

Created with the built-in image generation tool, using `logo.png` as the edit reference. Final prompt:

Use case: compositing. Asset: finished GitHub README hero banner, panoramic 3:1 ratio, 1536x512. Extend the supplied approved cobalt-blue dot-matrix tag artwork into a refined horizontal project masthead. Preserve the tag's fine white rings, diagonal shape, punched hole, brightness and original blue palette faithfully; place it on the RIGHT third, fully visible with comfortable padding, seamless blue background edge-to-edge (no square image tile or seam). LEFT side: precise large white modern sans-serif typography reading exactly 'Codex Tags'. Beneath it, smaller pale-blue text exactly 'Less scrolling. More finding.' Left text aligned with generous margins, vertically centered. Overall composition left 60% quiet typography, right 40% detailed tag art. Restrained editorial technology identity; minimal, polished, crisp readable typography at 800px display width. No additional words, badges, icons, UI, borders, cards, buttons, watermark, textures or decoration. Keep strong contrast and ample negative space. Output one complete banner, not a mockup.
