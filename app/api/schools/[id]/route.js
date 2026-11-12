import { NextResponse } from "next/server";
import { all, run, get } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params;
    const school = await get("SELECT * FROM schools WHERE id = ?", [id]);

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    // family_only: connected to Fight Club only as a parent or student (that
    // role, or a student/parent in a group), with no other role and leading no
    // group. The school page hides these from its People list, so a teacher who
    // is also a parent still shows.
    const people = await all(
      `SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.title, p.address, p.city, p.state, p.zip,
              ((EXISTS (SELECT 1 FROM person_roles pr JOIN roles r ON r.id = pr.role_id
                         WHERE pr.person_id = p.id AND LOWER(TRIM(r.name)) IN ('parent', 'student'))
                OR EXISTS (SELECT 1 FROM group_students gs WHERE gs.person_id = p.id)
                OR EXISTS (SELECT 1 FROM group_parents gp WHERE gp.person_id = p.id))
               AND NOT EXISTS (SELECT 1 FROM person_roles pr JOIN roles r ON r.id = pr.role_id
                                WHERE pr.person_id = p.id AND LOWER(TRIM(r.name)) NOT IN ('parent', 'student'))
               AND NOT EXISTS (SELECT 1 FROM group_leaders gl WHERE gl.person_id = p.id)
               AND NOT EXISTS (SELECT 1 FROM groups g WHERE g.primary_leader_id = p.id)
              ) AS family_only
       FROM people p
       JOIN person_schools ps ON p.id = ps.person_id
       WHERE ps.school_id = ?
       ORDER BY p.last_name, p.first_name`,
      [id]
    );

    const notes = await all(
      `SELECT * FROM notes
       WHERE entity_type = 'school' AND entity_id = ?
       ORDER BY date DESC`,
      [id]
    );

    return NextResponse.json({ ...school, people, notes });
  } catch (error) {
    console.error("Error fetching school:", error);
    return NextResponse.json(
      { error: "Failed to fetch school" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params;
    const body = await request.json();
    const { name, address, city, state, zip, phone } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await run(
      "UPDATE schools SET name = ?, address = ?, city = ?, state = ?, zip = ?, phone = ? WHERE id = ?",
      [
        name,
        address || null,
        city || null,
        state || null,
        zip || null,
        phone || null,
        id,
      ]
    );

    const school = await get("SELECT * FROM schools WHERE id = ?", [id]);

    return NextResponse.json(school);
  } catch (error) {
    console.error("Error updating school:", error);
    return NextResponse.json(
      { error: "Failed to update school" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { session, error } = await requireAuth()
    if (error) return error

    const { id } = await params;
    await run("DELETE FROM person_schools WHERE school_id = ?", [id]);
    await run("DELETE FROM notes WHERE entity_type = ? AND entity_id = ?", [
      "school",
      id,
    ]);
    await run("DELETE FROM schools WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Failed to delete school" },
      { status: 500 }
    );
  }
}
