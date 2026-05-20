-- 004-cert-additions.sql
-- v0.8.0 Round 6 — Certification additions
--
-- FCC024: New QPR Certificate attachment slot (separate from QPR Training attachment)
-- FCC022: Explicit Background Check "Passed" boolean (replaces the dropped upload UI)

ALTER TABLE certifications ADD COLUMN IF NOT EXISTS qpr_certificate_attachment_path TEXT;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS background_check_passed BOOLEAN DEFAULT FALSE;
