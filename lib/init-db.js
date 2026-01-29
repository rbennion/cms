const { sql } = require('@vercel/postgres')

async function initDatabase() {
  console.log('Initializing database...')

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
      is_board_member BOOLEAN DEFAULT FALSE,
      children TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `

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
  `

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
  `

  // Create person_types table
  await sql`
    CREATE TABLE IF NOT EXISTS person_types (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `

  // Create person_type_assignments table
  await sql`
    CREATE TABLE IF NOT EXISTS person_type_assignments (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      type_id INTEGER NOT NULL REFERENCES person_types(id) ON DELETE CASCADE,
      UNIQUE(person_id, type_id)
    )
  `

  // Create person_companies table
  await sql`
    CREATE TABLE IF NOT EXISTS person_companies (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      is_primary BOOLEAN DEFAULT FALSE,
      UNIQUE(person_id, company_id)
    )
  `

  // Create person_schools table
  await sql`
    CREATE TABLE IF NOT EXISTS person_schools (
      id SERIAL PRIMARY KEY,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      UNIQUE(person_id, school_id)
    )
  `

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
  `

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
  `

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
  `

  // Create indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_people_email ON people(email)`
  await sql`CREATE INDEX IF NOT EXISTS idx_people_last_name ON people(last_name)`
  await sql`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)`
  await sql`CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date)`
  await sql`CREATE INDEX IF NOT EXISTS idx_donations_person ON donations(person_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_donations_company ON donations(company_id)`
  await sql`CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id)`

  // Seed default person types
  await sql`INSERT INTO person_types (name) VALUES ('Lead') ON CONFLICT (name) DO NOTHING`
  await sql`INSERT INTO person_types (name) VALUES ('Interested') ON CONFLICT (name) DO NOTHING`

  console.log('Database initialized successfully!')
  console.log('Default person types created: Lead, Interested')
}

initDatabase().catch(console.error)
