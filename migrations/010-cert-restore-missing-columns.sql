-- 010-cert-restore-missing-columns.sql
-- The certifications table predates the baseline migration. Because 001 creates
-- it with CREATE TABLE IF NOT EXISTS, the baseline was a no-op wherever the
-- legacy table already existed, so two columns the code writes were never
-- added there. Every certification save issues a single UPDATE listing all of
-- them, so the missing qpr_training_date failed the whole statement — the
-- Application, Background Check, and QPR sections all errored with "Could not
-- save certification", while reading a record still worked because SELECT *
-- simply returned fewer columns.
--
-- Additive only: adds the columns where absent, no-ops where already present.

ALTER TABLE certifications ADD COLUMN IF NOT EXISTS qpr_training_date DATE;

-- Written by the background check document upload route.
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS background_check_attachment_path TEXT;
