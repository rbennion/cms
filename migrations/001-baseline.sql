-- 001-baseline.sql
-- Canonical schema for Fight Club CRM.
-- Safe to run on existing databases (CREATE TABLE IF NOT EXISTS).

-- Core entities
CREATE TABLE IF NOT EXISTS people (
  id SERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  title TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  picture_path TEXT,
  stage_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  website TEXT,
  is_donor INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS schools (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lookup tables
CREATE TABLE IF NOT EXISTS person_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS engagement_stages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0
);

-- Junction tables
CREATE TABLE IF NOT EXISTS person_roles (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  UNIQUE(person_id, role_id)
);

CREATE TABLE IF NOT EXISTS person_type_assignments (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  type_id INTEGER NOT NULL REFERENCES person_types(id) ON DELETE CASCADE,
  UNIQUE(person_id, type_id)
);

CREATE TABLE IF NOT EXISTS person_companies (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_primary INTEGER DEFAULT 0,
  UNIQUE(person_id, company_id)
);

CREATE TABLE IF NOT EXISTS person_schools (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  UNIQUE(person_id, school_id)
);

-- Donations
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
  background_check_status TEXT CHECK(background_check_status IN ('pending', 'approved', 'denied', 'expired')),
  application_received INTEGER DEFAULT 0,
  application_attachment_path TEXT,
  qpr_gatekeeper_training INTEGER DEFAULT 0,
  qpr_training_date DATE,
  qpr_training_renewal_date DATE,
  qpr_training_attachment_path TEXT,
  background_check_attachment_path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Groups (child of schools)
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK(gender IN ('Girls', 'Boys')),
  year INTEGER,
  meeting_location TEXT,
  notes TEXT,
  primary_leader_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
  status TEXT CHECK(status IN ('Active', 'Inactive', 'Alumni')) DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_meeting_locations (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_leaders (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(group_id, person_id)
);

-- Family relationships (self-referential)
CREATE TABLE IF NOT EXISTS family_relationships (
  id SERIAL PRIMARY KEY,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  related_person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  UNIQUE(person_id, related_person_id),
  CHECK(person_id != related_person_id)
);

-- Notes (polymorphic)
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title TEXT,
  content TEXT NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('person', 'company', 'school')),
  entity_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('people', 'companies', 'donations', 'certifications', 'notes', 'schools')),
  can_create BOOLEAN DEFAULT FALSE,
  can_read BOOLEAN DEFAULT TRUE,
  can_update BOOLEAN DEFAULT FALSE,
  can_delete BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, entity_type)
);

CREATE TABLE IF NOT EXISTS saved_views (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('people', 'companies', 'schools', 'donations')),
  filter_state JSONB NOT NULL DEFAULT '{}',
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App settings
CREATE TABLE IF NOT EXISTS app_settings (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
CREATE INDEX IF NOT EXISTS idx_people_last_name ON people(last_name);
CREATE INDEX IF NOT EXISTS idx_people_stage ON people(stage_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date);
CREATE INDEX IF NOT EXISTS idx_donations_person ON donations(person_id);
CREATE INDEX IF NOT EXISTS idx_donations_company ON donations(company_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_groups_school ON groups(school_id);
CREATE INDEX IF NOT EXISTS idx_group_meeting_locations_group ON group_meeting_locations(group_id);
CREATE INDEX IF NOT EXISTS idx_group_leaders_group ON group_leaders(group_id);
CREATE INDEX IF NOT EXISTS idx_family_relationships_person ON family_relationships(person_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_person ON person_roles(person_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_role ON person_roles(role_id);

-- Seed default lookup data
INSERT INTO person_types (name) VALUES ('Lead') ON CONFLICT (name) DO NOTHING;
INSERT INTO person_types (name) VALUES ('Interested') ON CONFLICT (name) DO NOTHING;

INSERT INTO engagement_stages (name, sort_order) VALUES ('Lead', 1) ON CONFLICT (name) DO NOTHING;
INSERT INTO engagement_stages (name, sort_order) VALUES ('Prospect', 2) ON CONFLICT (name) DO NOTHING;
INSERT INTO engagement_stages (name, sort_order) VALUES ('Active', 3) ON CONFLICT (name) DO NOTHING;
INSERT INTO engagement_stages (name, sort_order) VALUES ('Inactive', 4) ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, sort_order) VALUES ('Board Member', 1) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('Volunteer', 2) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('Staff', 3) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('Parent', 4) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('Teacher', 5) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('Community Partner', 6) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('FC Leader', 7) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('Potential Group Leader', 8) ON CONFLICT (name) DO NOTHING;
INSERT INTO roles (name, sort_order) VALUES ('Vendor', 9) ON CONFLICT (name) DO NOTHING;
