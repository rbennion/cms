import { NextResponse } from "next/server";
import { get, run, all } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const person = await get("SELECT id FROM people WHERE id = ?", [id]);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const roles = await all(
      `
      SELECT r.*
      FROM roles r
      JOIN person_roles pr ON r.id = pr.role_id
      WHERE pr.person_id = ?
      ORDER BY r.sort_order, r.name
    `,
      [id]
    );

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching person roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch person roles" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { role_id } = body;

    if (!role_id) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    const person = await get("SELECT id FROM people WHERE id = ?", [id]);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const role = await get("SELECT id FROM roles WHERE id = ?", [role_id]);
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check if already assigned
    const existing = await get(
      "SELECT id FROM person_roles WHERE person_id = ? AND role_id = ?",
      [id, role_id]
    );
    if (existing) {
      return NextResponse.json(
        { error: "Role already assigned to this person" },
        { status: 400 }
      );
    }

    await run("INSERT INTO person_roles (person_id, role_id) VALUES (?, ?)", [
      id,
      role_id,
    ]);

    // Return updated roles list
    const roles = await all(
      `
      SELECT r.*
      FROM roles r
      JOIN person_roles pr ON r.id = pr.role_id
      WHERE pr.person_id = ?
      ORDER BY r.sort_order, r.name
    `,
      [id]
    );

    return NextResponse.json(roles, { status: 201 });
  } catch (error) {
    console.error("Error adding role to person:", error);
    return NextResponse.json({ error: "Failed to add role" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const roleId = searchParams.get("role_id");

    if (!roleId) {
      return NextResponse.json(
        { error: "Role ID is required" },
        { status: 400 }
      );
    }

    const person = await get("SELECT id FROM people WHERE id = ?", [id]);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    await run("DELETE FROM person_roles WHERE person_id = ? AND role_id = ?", [
      id,
      roleId,
    ]);

    // Return updated roles list
    const roles = await all(
      `
      SELECT r.*
      FROM roles r
      JOIN person_roles pr ON r.id = pr.role_id
      WHERE pr.person_id = ?
      ORDER BY r.sort_order, r.name
    `,
      [id]
    );

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error removing role from person:", error);
    return NextResponse.json(
      { error: "Failed to remove role" },
      { status: 500 }
    );
  }
}
