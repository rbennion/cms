-- 013-users-email-case-insensitive.sql
-- A login email is one account however it is capitalized. The original
-- UNIQUE on users.email compared case-sensitively, so Brad@x.com and
-- brad@x.com could both be created. This makes the database refuse that.
--
-- If two existing accounts already differ only by case, this fails (and the
-- deploy with it) until one of them is removed.

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_key ON users (LOWER(email));
