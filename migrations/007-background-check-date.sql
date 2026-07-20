-- 007-background-check-date.sql
-- Background checks are re-run on a policy cadence (default every 2 years).
-- Store the date the check was completed; expiration is derived from
-- app_settings.background_check_valid_years, so a policy change updates
-- every record without touching data.

ALTER TABLE certifications ADD COLUMN IF NOT EXISTS background_check_date DATE;

INSERT INTO app_settings (key, value)
VALUES ('background_check_valid_years', '2')
ON CONFLICT (key) DO NOTHING;
