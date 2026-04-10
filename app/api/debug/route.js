import { NextResponse } from "next/server";
import { get, all } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = 'force-dynamic'

// Debug endpoint to check database state
export async function GET() {
  try {
    const { session, error } = await requireAdmin()
    if (error) return error
    const peopleCount = await get("SELECT COUNT(*) as count FROM people");
    const schoolsCount = await get("SELECT COUNT(*) as count FROM schools");
    const companiesCount = await get("SELECT COUNT(*) as count FROM companies");

    // Check for old person_types table
    let personTypesCount = { count: "table not found" };
    try {
      personTypesCount = await get("SELECT COUNT(*) as count FROM person_types");
    } catch (e) {
      // table doesn't exist
    }

    // Check for new roles table
    let rolesCount = { count: "table not found" };
    try {
      rolesCount = await get("SELECT COUNT(*) as count FROM roles");
    } catch (e) {
      // table doesn't exist
    }

    // Check for engagement_stages table
    let stagesCount = { count: "table not found" };
    try {
      stagesCount = await get("SELECT COUNT(*) as count FROM engagement_stages");
    } catch (e) {
      // table doesn't exist
    }

    // Sample people
    const samplePeople = await all(
      "SELECT id, first_name, last_name, email FROM people LIMIT 5"
    );

    return NextResponse.json({
      counts: {
        people: peopleCount.count,
        schools: schoolsCount.count,
        companies: companiesCount.count,
        person_types: personTypesCount.count,
        roles: rolesCount.count,
        engagement_stages: stagesCount.count,
      },
      samplePeople: samplePeople,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
