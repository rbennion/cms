-- 005-group-membership.sql
-- v0.8.0 Round 6 — Group membership beyond leaders
--
-- FCC015: Allow adding students to Groups
-- FCC016: Allow adding parents to Groups
--
-- Mirrors the existing group_leaders junction (separate-table pattern A).

CREATE TABLE IF NOT EXISTS group_students (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(group_id, person_id)
);

CREATE TABLE IF NOT EXISTS group_parents (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(group_id, person_id)
);

CREATE INDEX IF NOT EXISTS idx_group_students_group ON group_students(group_id);
CREATE INDEX IF NOT EXISTS idx_group_parents_group ON group_parents(group_id);
