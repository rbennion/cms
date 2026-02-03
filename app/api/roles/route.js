import { NextResponse } from "next/server";
import { all, run, get } from "@/lib/db";

export async function GET() {
  try {
    const roles = await all("SELECT * FROM roles ORDER BY sort_order, name");
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Check for duplicate
    const existing = await get("SELECT * FROM roles WHERE name = ?", [name]);
    if (existing) {
      return NextResponse.json(
        { error: "A role with this name already exists" },
        { status: 400 }
      );
    }

    // Get max sort_order
    const maxOrder = await get(
      "SELECT MAX(sort_order) as max_order FROM roles"
    );
    const sortOrder = (maxOrder?.max_order || 0) + 1;

    const result = await run(
      "INSERT INTO roles (name, sort_order) VALUES (?, ?)",
      [name, sortOrder]
    );

    const role = await get("SELECT * FROM roles WHERE id = ?", [
      result.lastInsertRowid,
    ]);

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 }
    );
  }
}
