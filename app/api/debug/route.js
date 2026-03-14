import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// Debug endpoint to check database state
export async function GET() {
  try {
    const peopleCount = await sql`SELECT COUNT(*) as count FROM people`;
    const schoolsCount = await sql`SELECT COUNT(*) as count FROM schools`;
    const companiesCount = await sql`SELECT COUNT(*) as count FROM companies`;

    // Check for old person_types table
    let personTypesCount = { rows: [{ count: "table not found" }] };
    try {
      personTypesCount = await sql`SELECT COUNT(*) as count FROM person_types`;
    } catch (e) {
      // table doesn't exist
    }

    // Check for new roles table
    let rolesCount = { rows: [{ count: "table not found" }] };
    try {
      rolesCount = await sql`SELECT COUNT(*) as count FROM roles`;
    } catch (e) {
      // table doesn't exist
    }

    // Check for engagement_stages table
    let stagesCount = { rows: [{ count: "table not found" }] };
    try {
      stagesCount = await sql`SELECT COUNT(*) as count FROM engagement_stages`;
    } catch (e) {
      // table doesn't exist
    }

    // Sample people
    const samplePeople =
      await sql`SELECT id, first_name, last_name, email FROM people LIMIT 5`;

    return NextResponse.json({
      counts: {
        people: peopleCount.rows[0].count,
        schools: schoolsCount.rows[0].count,
        companies: companiesCount.rows[0].count,
        person_types: personTypesCount.rows[0].count,
        roles: rolesCount.rows[0].count,
        engagement_stages: stagesCount.rows[0].count,
      },
      samplePeople: samplePeople.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
