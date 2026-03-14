import { NextResponse } from "next/server";
import { all, run, get } from "@/lib/db";

export async function GET() {
  try {
    const stages = await all(
      "SELECT * FROM engagement_stages ORDER BY sort_order, name"
    );
    return NextResponse.json(stages);
  } catch (error) {
    console.error("Error fetching engagement stages:", error);
    return NextResponse.json(
      { error: "Failed to fetch engagement stages" },
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
    const existing = await get(
      "SELECT * FROM engagement_stages WHERE name = ?",
      [name]
    );
    if (existing) {
      return NextResponse.json(
        { error: "A stage with this name already exists" },
        { status: 400 }
      );
    }

    // Get max sort_order
    const maxOrder = await get(
      "SELECT MAX(sort_order) as max_order FROM engagement_stages"
    );
    const sortOrder = (maxOrder?.max_order || 0) + 1;

    const result = await run(
      "INSERT INTO engagement_stages (name, sort_order) VALUES (?, ?)",
      [name, sortOrder]
    );

    const stage = await get("SELECT * FROM engagement_stages WHERE id = ?", [
      result.lastInsertRowid,
    ]);

    return NextResponse.json(stage, { status: 201 });
  } catch (error) {
    console.error("Error creating engagement stage:", error);
    return NextResponse.json(
      { error: "Failed to create engagement stage" },
      { status: 500 }
    );
  }
}
