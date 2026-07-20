-- 008-paper-waivers.sql
-- Support waivers signed on paper: staff upload a scan/photo of the signed
-- form. Paper waivers have no signing token and no email, so those columns
-- become nullable; `source` distinguishes 'email' (e-sign flow) from 'paper'.

ALTER TABLE waivers ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'email';
ALTER TABLE waivers ALTER COLUMN token_hash DROP NOT NULL;
ALTER TABLE waivers ALTER COLUMN sent_to_email DROP NOT NULL;
