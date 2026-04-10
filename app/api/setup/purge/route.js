import { NextResponse } from "next/server";
import { run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const { session, error } = await requireAdmin()
    if (error) return error

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
    await run("DELETE FROM person_type_assignments");
    await run("DELETE FROM person_companies");
    await run("DELETE FROM person_schools");
    await run("DELETE FROM certifications");
    await run("DELETE FROM notes");
    await run("DELETE FROM donations");

    // Then delete main tables
    await run("DELETE FROM people");
    await run("DELETE FROM companies");
    await run("DELETE FROM schools");

    // Keep person_types but reset to defaults
    await run("DELETE FROM person_types");
    await run("INSERT INTO person_types (name) VALUES (?) ON CONFLICT (name) DO NOTHING", ['Lead']);
    await run("INSERT INTO person_types (name) VALUES (?) ON CONFLICT (name) DO NOTHING", ['Interested']);

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
