-- Migration: add image_url to platform_products
ALTER TABLE platform_products ADD COLUMN IF NOT EXISTS image_url text;
