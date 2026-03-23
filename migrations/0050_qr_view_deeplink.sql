-- QR View Deep-Link
-- Adds view_id to qr_routes so a QR scan can land directly on a specific menu view
-- inside the ConciergePanel canvas (e.g. booking, payments, intake).
ALTER TABLE qr_routes ADD COLUMN IF NOT EXISTS view_id text;
