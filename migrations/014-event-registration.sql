-- 014-event-registration.sql
-- Event registration: a group's QR code opens a public sign-up form that
-- works only during a window staff set (four hours at most).
--
-- One row per group. The code in a scanned link is found by its hash; the
-- server rebuilds the code itself from token_salt plus AUTH_SECRET, so the
-- database alone never holds a working link. Resetting the code replaces both.

CREATE TABLE IF NOT EXISTS event_registrations (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL UNIQUE REFERENCES groups(id) ON DELETE CASCADE,
  token_salt TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  set_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Who came in through registration, and in which window. needs_review holds a
-- note for staff when a registration could not be matched cleanly (e.g. a
-- student typed an email that already belongs to someone else).
CREATE TABLE IF NOT EXISTS event_registration_entries (
  id SERIAL PRIMARY KEY,
  registration_id INTEGER NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'parent')),
  window_starts_at TIMESTAMPTZ,
  needs_review TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_registration_entries_registration
  ON event_registration_entries(registration_id);
