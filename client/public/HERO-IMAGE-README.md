# Hero background images

The platform uses static hero images from `client/public/` so the homepage can reference stable public URLs and later allow admin-managed rotation.

## Current structure

- `hero-storefront-lovely-lashes.png`
- `hero-bg-gateway.png`
- `hero-qr-demo.png`
- `hero-joint-demo.png`
- `hero-carousel/`
  - `nail-salon-mock-large.png`
  - `target-qr.jpeg`
  - `joint.jpeg`
  - `mcdonalds-qr.png`

## Current usage

- `client/src/pages/public/PlatformEntryPage.tsx`
  - Rotates the `hero-carousel/` images as faded background slides for the public homepage hero.
- `client/src/pages/customer/BusinessPage.tsx`
  - Uses a single storefront hero image via `HERO_BG_URL`.

## Management guidance

1. Add new PNG/JPEG files to `client/public/hero-carousel/`.
2. Reference them via public URL paths like `/hero-carousel/my-image.png`.
3. For admin-managed rotation later, keep this folder as the canonical source for homepage hero slides.
4. Recommended size: at least 1920x1080 for full-width hero usage; 2400x1350 or larger is better for retina displays.

Do **not** run hero images through automated compression pipelines. They are intentionally served unchanged so the hero stays sharp.
