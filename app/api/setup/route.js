import { sql } from "@vercel/postgres";
import { NextResponse } from "next/server";

export async function GET(request) {
  // Check for setup secret to prevent unauthorized access
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const reset = searchParams.get("reset") === "true";

  if (process.env.SETUP_SECRET && secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // If reset=true, drop all tables first
    if (reset) {
      console.log("Dropping all tables...");
      await sql`DROP TABLE IF EXISTS notes CASCADE`;
      await sql`DROP TABLE IF EXISTS certifications CASCADE`;
      await sql`DROP TABLE IF EXISTS donations CASCADE`;
      await sql`DROP TABLE IF EXISTS person_schools CASCADE`;
      await sql`DROP TABLE IF EXISTS person_companies CASCADE`;
      await sql`DROP TABLE IF EXISTS person_type_assignments CASCADE`;
      await sql`DROP TABLE IF EXISTS person_types CASCADE`;
      await sql`DROP TABLE IF EXISTS schools CASCADE`;
      await sql`DROP TABLE IF EXISTS companies CASCADE`;
      await sql`DROP TABLE IF EXISTS people CASCADE`;
      console.log("All tables dropped!");
    }

    // Create tables
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
        is_donor INTEGER DEFAULT 0,
        is_fc_certified INTEGER DEFAULT 0,
        is_board_member INTEGER DEFAULT 0,
        children TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
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
      )
    `;

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

    await sql`
      CREATE TABLE IF NOT EXISTS person_types (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS person_type_assignments (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        type_id INTEGER NOT NULL REFERENCES person_types(id) ON DELETE CASCADE,
        UNIQUE(person_id, type_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS person_companies (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        is_primary INTEGER DEFAULT 0,
        UNIQUE(person_id, company_id)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS person_schools (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        UNIQUE(person_id, school_id)
      )
    `;

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

    await sql`
      CREATE TABLE IF NOT EXISTS certifications (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL UNIQUE REFERENCES people(id) ON DELETE CASCADE,
        background_check_status TEXT CHECK(background_check_status IN ('pending', 'approved', 'denied', 'expired')),
        application_received INTEGER DEFAULT 0,
        application_attachment_path TEXT,
        training_complete INTEGER DEFAULT 0,
        training_attachment_path TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

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

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_people_email ON people(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_people_last_name ON people(last_name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_donations_date ON donations(date)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_donations_person ON donations(person_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_donations_company ON donations(company_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id)`;

    // Seed default person types
    await sql`INSERT INTO person_types (name) VALUES ('Lead') ON CONFLICT (name) DO NOTHING`;
    await sql`INSERT INTO person_types (name) VALUES ('Interested') ON CONFLICT (name) DO NOTHING`;

    return NextResponse.json({
      success: true,
      message:
        "Database initialized successfully! Visit /api/setup?seed=true to add sample data.",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
