-- 003-waivers.sql
-- Parental liability + photo/name release waivers.
-- Adds guardian_email to people and creates the waivers table.

ALTER TABLE people ADD COLUMN IF NOT EXISTS guardian_email TEXT;

CREATE TABLE IF NOT EXISTS waivers (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,

  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_to_email TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,

  liability_release_choice TEXT,
  photo_release_choice TEXT,
  participant_name TEXT,
  signer_name TEXT,
  signature_png TEXT,
  signed_at TIMESTAMP,

  ip_address TEXT,
  user_agent TEXT,
  signed_pdf_path TEXT,
  signed_pdf_sha256 TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_waivers_person_id ON waivers(person_id);
CREATE INDEX IF NOT EXISTS idx_waivers_token_hash ON waivers(token_hash);
CREATE INDEX IF NOT EXISTS idx_waivers_status ON waivers(status);
