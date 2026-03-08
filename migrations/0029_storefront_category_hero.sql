-- Optional reference/fallback hero image URL per category (e.g. /storefront-hero-nail-salons.jpg or full URL).
-- When set, used when no Flux-generated images exist yet. Add your reference images to client/public and set path here.
ALTER TABLE storefront_categories
  ADD COLUMN IF NOT EXISTS hero_image_url TEXT DEFAULT NULL;
