-- 015-company-school-phone.sql
-- A main phone number on companies and schools. Free text, optional: stored
-- exactly as entered, same as people.phone.

ALTER TABLE companies ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone TEXT;
