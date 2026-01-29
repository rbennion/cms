const initSqlJs = require('sql.js')
const fs = require('fs')
const path = require('path')

const DB_PATH = path.join(process.cwd(), 'database.sqlite')

async function initDatabase() {
  console.log('Initializing database...')

  const SQL = await initSqlJs()
  const db = new SQL.Database()

  db.run('PRAGMA foreign_keys = ON')

  // Create people table
  db.run(`
    CREATE TABLE IF NOT EXISTS people (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      is_donor INTEGER DEFAULT 0,
      is_fc_certified INTEGER DEFAULT 0,
      is_board_member INTEGER DEFAULT 0,
      children TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create companies table
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      website TEXT,
      is_donor INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create schools table
  db.run(`
    CREATE TABLE IF NOT EXISTS schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create person_types table
  db.run(`
    CREATE TABLE IF NOT EXISTS person_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `)

  // Create person_type_assignments table
  db.run(`
    CREATE TABLE IF NOT EXISTS person_type_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      type_id INTEGER NOT NULL REFERENCES person_types(id) ON DELETE CASCADE,
      UNIQUE(person_id, type_id)
    )
  `)

  // Create person_companies table
  db.run(`
    CREATE TABLE IF NOT EXISTS person_companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      is_primary INTEGER DEFAULT 0,
      UNIQUE(person_id, company_id)
    )
  `)

  // Create person_schools table
  db.run(`
    CREATE TABLE IF NOT EXISTS person_schools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
      school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
      UNIQUE(person_id, school_id)
    )
  `)

  // Create donations table
  db.run(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount DECIMAL(10,2) NOT NULL,
      date DATE NOT NULL,
      note TEXT,
      person_id INTEGER REFERENCES people(id) ON DELETE SET NULL,
      company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create certifications table
  db.run(`
    CREATE TABLE IF NOT EXISTS certifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
      background_check_status TEXT CHECK(background_check_status IN ('pending', 'approved', 'denied', 'expired')),
      application_received INTEGER DEFAULT 0,
      application_attachment_path TEXT,
      training_complete INTEGER DEFAULT 0,
      training_attachment_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      content TEXT NOT NULL,
      date DATE DEFAULT CURRENT_DATE,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('person', 'company')),
      entity_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_people_email ON people(email)')
  db.run('CREATE INDEX IF NOT EXISTS idx_people_last_name ON people(last_name)')
  db.run('CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)')
  db.run('CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date)')
  db.run('CREATE INDEX IF NOT EXISTS idx_donations_person ON donations(person_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_donations_company ON donations(company_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id)')

  // Seed default person types
  db.run("INSERT OR IGNORE INTO person_types (name) VALUES ('Lead')")
  db.run("INSERT OR IGNORE INTO person_types (name) VALUES ('Interested')")

  // Save database to file
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)

  console.log('Database initialized successfully!')
  console.log('Default person types created: Lead, Interested')
}

initDatabase().catch(console.error)
