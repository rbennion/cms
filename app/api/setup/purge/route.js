import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    // Check for SETUP_SECRET if configured
    const setupSecret = process.env.SETUP_SECRET;
    if (setupSecret) {
      const authHeader = request.headers.get("authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");
      if (providedSecret !== setupSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    // Delete in order respecting foreign key constraints
    // First delete junction tables and dependent tables
    await sql`DELETE FROM person_type_assignments`;
    await sql`DELETE FROM person_companies`;
    await sql`DELETE FROM person_schools`;
    await sql`DELETE FROM certifications`;
    await sql`DELETE FROM notes`;
    await sql`DELETE FROM donations`;

    // Then delete main tables
    await sql`DELETE FROM people`;
    await sql`DELETE FROM companies`;
    await sql`DELETE FROM schools`;

    // Keep person_types but reset to defaults
    await sql`DELETE FROM person_types`;
    await sql`INSERT INTO person_types (name) VALUES ('Lead') ON CONFLICT (name) DO NOTHING`;
    await sql`INSERT INTO person_types (name) VALUES ('Interested') ON CONFLICT (name) DO NOTHING`;

    return NextResponse.json({
      success: true,
      message: "All data purged successfully. Default person types restored.",
    });
  } catch (error) {
    console.error("Purge error:", error);
    return NextResponse.json(
      { error: "Failed to purge data", details: error.message },
      { status: 500 }
    );
  }
}
