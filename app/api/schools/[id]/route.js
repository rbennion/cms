import { NextResponse } from "next/server";
import { all, run, get } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const school = await get("SELECT * FROM schools WHERE id = ?", [params.id]);

    if (!school) {
      return NextResponse.json({ error: "School not found" }, { status: 404 });
    }

    const people = await all(
      `SELECT p.id, p.first_name, p.last_name, p.email, p.phone, p.title
       FROM people p
       JOIN person_schools ps ON p.id = ps.person_id
       WHERE ps.school_id = ?
       ORDER BY p.last_name, p.first_name`,
      [params.id]
    );

    const notes = await all(
      `SELECT * FROM notes
       WHERE entity_type = 'school' AND entity_id = ?
       ORDER BY date DESC`,
      [params.id]
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
    const body = await request.json();
    const { name, address, city, state, zip } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    await run(
      "UPDATE schools SET name = ?, address = ?, city = ?, state = ?, zip = ? WHERE id = ?",
      [
        name,
        address || null,
        city || null,
        state || null,
        zip || null,
        params.id,
      ]
    );

    const school = await get("SELECT * FROM schools WHERE id = ?", [params.id]);

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
    await run("DELETE FROM person_schools WHERE school_id = ?", [params.id]);
    await run("DELETE FROM notes WHERE entity_type = ? AND entity_id = ?", [
      "school",
      params.id,
    ]);
    await run("DELETE FROM schools WHERE id = ?", [params.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting school:", error);
    return NextResponse.json(
      { error: "Failed to delete school" },
      { status: 500 }
    );
  }
}
