import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const role = await get("SELECT * FROM roles WHERE id = ?", [id]);

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { error: "Failed to fetch role" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, sort_order } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const existing = await get("SELECT * FROM roles WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    // Check for duplicate name
    const duplicate = await get(
      "SELECT * FROM roles WHERE name = ? AND id != ?",
      [name, id]
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 400 }
      );
    }

    await run("UPDATE roles SET name = ?, sort_order = ? WHERE id = ?", [
      name,
      sort_order ?? existing.sort_order,
      id,
    ]);

    const role = await get("SELECT * FROM roles WHERE id = ?", [id]);

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { error: "Failed to update role" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await get("SELECT * FROM roles WHERE id = ?", [id]);
    if (!existing) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }

    await run("DELETE FROM roles WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { error: "Failed to delete role" },
      { status: 500 }
    );
  }
}
