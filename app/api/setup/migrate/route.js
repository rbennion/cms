import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// Migration endpoint that adds new schema WITHOUT deleting existing data
export async function GET() {
  try {
    console.log("Running migration to add new taxonomy tables...");

    // Create engagement_stages table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS engagement_stages (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0
      )
    `;
    console.log("engagement_stages table ready");

    // Create roles table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0
      )
    `;
    console.log("roles table ready");

    // Create person_roles junction table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS person_roles (
        id SERIAL PRIMARY KEY,
        person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        UNIQUE(person_id, role_id)
      )
    `;
    console.log("person_roles table ready");

    // Add stage_id column to people if it doesn't exist
    try {
      await sql`ALTER TABLE people ADD COLUMN IF NOT EXISTS stage_id INTEGER REFERENCES engagement_stages(id) ON DELETE SET NULL`;
      console.log("stage_id column added to people");
    } catch (e) {
      // Column might already exist
      console.log("stage_id column already exists or error:", e.message);
    }

    // Create indexes if they don't exist
    await sql`CREATE INDEX IF NOT EXISTS idx_people_stage ON people(stage_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_person_roles_person ON person_roles(person_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_person_roles_role ON person_roles(role_id)`;

    // Seed default engagement stages if empty
    const stagesCount =
      await sql`SELECT COUNT(*) as count FROM engagement_stages`;
    if (parseInt(stagesCount.rows[0].count) === 0) {
      await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Lead', 1)`;
      await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Prospect', 2)`;
      await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Active', 3)`;
      await sql`INSERT INTO engagement_stages (name, sort_order) VALUES ('Inactive', 4)`;
      console.log("Default engagement stages seeded");
    }

    // Seed default roles if empty
    const rolesCount = await sql`SELECT COUNT(*) as count FROM roles`;
    if (parseInt(rolesCount.rows[0].count) === 0) {
      await sql`INSERT INTO roles (name, sort_order) VALUES ('Board Member', 1)`;
      await sql`INSERT INTO roles (name, sort_order) VALUES ('Volunteer', 2)`;
      await sql`INSERT INTO roles (name, sort_order) VALUES ('Staff', 3)`;
      await sql`INSERT INTO roles (name, sort_order) VALUES ('Parent', 4)`;
      await sql`INSERT INTO roles (name, sort_order) VALUES ('Teacher', 5)`;
      await sql`INSERT INTO roles (name, sort_order) VALUES ('Community Partner', 6)`;
      console.log("Default roles seeded");
    }

    // Migrate is_board_member to Board Member role if the column exists
    try {
      const boardMembers =
        await sql`SELECT id FROM people WHERE is_board_member = true`;
      if (boardMembers.rows.length > 0) {
        const boardMemberRole =
          await sql`SELECT id FROM roles WHERE name = 'Board Member'`;
        if (boardMemberRole.rows.length > 0) {
          const roleId = boardMemberRole.rows[0].id;
          for (const person of boardMembers.rows) {
            await sql`INSERT INTO person_roles (person_id, role_id) VALUES (${person.id}, ${roleId}) ON CONFLICT DO NOTHING`;
          }
          console.log(
            `Migrated ${boardMembers.rows.length} board members to Board Member role`
          );
        }
      }
    } catch (e) {
      console.log(
        "is_board_member column not found or already migrated:",
        e.message
      );
    }

    console.log("Migration completed successfully!");

    return NextResponse.json({
      success: true,
      message:
        "Migration completed! New tables added without deleting existing data.",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
