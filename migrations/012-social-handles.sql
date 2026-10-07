-- 012-social-handles.sql
-- Instagram and Facebook handles on a person. Free text, both optional:
-- stored exactly as entered.

ALTER TABLE people ADD COLUMN IF NOT EXISTS instagram_handle TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS facebook_handle TEXT;
