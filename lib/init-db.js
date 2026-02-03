const { sql } = require("@vercel/postgres");

async function initDatabase() {
  console.log("Initializing database...");

  // Create engagement_stages table (for pipeline stages like Lead, Prospect, Active, Inactive)
  await sql`
    CREATE TABLE IF NOT EXISTS engagement_stages (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    )
  `;

  // Create roles table (for what a person is: Board Member, Volunteer, Staff, etc.)
  await sql`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    )
  `;

  // Create people table
  await sql`
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
      is_donor BOOLEAN DEFAULT FALSE,
      is_fc_certified BOOLEAN DEFAULT FALSE,
      stage_id INTEGER REFERENCES engagement_stages(id) ON DELETE SET NULL,
      children TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create companies table
  await sql`
    CREATE TABLE IF NOT EXISTS companies (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      website TEXT,
      is_donor BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create schools table
  await sql`
    CREATE TABLE IF NOT EXISTS schools (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create person_roles junction table (many-to-many: people can have multiple roles)
  await sql`
    CREATE TABLE IF NOT EXISTS person_roles (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
      UNIQUE(person_id, role_id)
    )
  `;

  // Create person_companies table
  await sql`
    CREATE TABLE IF NOT EXISTS person_companies (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      is_primary BOOLEAN DEFAULT FALSE,
      UNIQUE(person_id, company_id)
    )
  `;

  // Create person_schools table
  await sql`
    CREATE TABLE IF NOT EXISTS person_schools (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      UNIQUE(person_id, school_id)
    )
  `;

  // Create donations table
  await sql`
    CREATE TABLE IF NOT EXISTS donations (
      id SERIAL PRIMARY KEY,
      amount DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      note TEXT,
      person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create certifications table
  await sql`
    CREATE TABLE IF NOT EXISTS certifications (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
      background_check_status TEXT CHECK(background_check_status IN ('pending', 'approved', 'denied', 'expired')),
      application_received BOOLEAN DEFAULT FALSE,
      application_attachment_path TEXT,
      training_complete BOOLEAN DEFAULT FALSE,
      training_attachment_path TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create notes table
  await sql`
    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      title TEXT,
      content TEXT NOT NULL,
      date DATE DEFAULT CURRENT_DATE,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('person', 'company')),
      entity_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create users table for authentication
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT FALSE,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create password reset tokens table
  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create user permissions table
  await sql`
    CREATE TABLE IF NOT EXISTS user_permissions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('people', 'companies', 'donations', 'certifications', 'notes', 'schools')),
      can_create BOOLEAN DEFAULT FALSE,
      can_read BOOLEAN DEFAULT TRUE,
      can_update BOOLEAN DEFAULT FALSE,
      can_delete BOOLEAN DEFAULT FALSE,
      UNIQUE(user_id, entity_type)
    )
  `;

  // Create saved_views table
  await sql`
    CREATE TABLE IF NOT EXISTS saved_views (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('people', 'companies', 'schools', 'donations')),
      filter_state JSONB NOT NULL DEFAULT '{}',
      is_shared BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create app_settings table for global application settings
  await sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      id SERIAL PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_saved_views_user ON saved_views(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_people_email ON people(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_people_last_name ON people(last_name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_people_stage ON people(stage_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_person_roles_person ON person_roles(person_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_person_roles_role ON person_roles(role_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_donations_person ON donations(person_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_donations_company ON donations(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id)`;

  // Seed default engagement stages (sales-style pipeline)
  await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Lead', 1) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Prospect', 2) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Active', 3) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Inactive', 4) ON CONFLICT (name) DO NOTHING`;

  // Seed default roles
  await sql`INSERT INTO roles (name, sort_order) VALUES ('Board Member', 1) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO roles (name, sort_order) VALUES ('Volunteer', 2) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO roles (name, sort_order) VALUES ('Staff', 3) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO roles (name, sort_order) VALUES ('Parent', 4) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO roles (name, sort_order) VALUES ('Teacher', 5) ON CONFLICT (name) DO NOTHING`;
  await sql`INSERT INTO roles (name, sort_order) VALUES ('Community Partner', 6) ON CONFLICT (name) DO NOTHING`;

  console.log("Database initialized successfully!");
  console.log(
    "Default engagement stages created: Lead, Prospect, Active, Inactive"
  );
  console.log(
    "Default roles created: Board Member, Volunteer, Staff, Parent, Teacher, Community Partner"
  );
}

initDatabase().catch(console.error);
