import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const stage = await get("SELECT * FROM engagement_stages WHERE id = ?", [
      id,
    ]);

    if (!stage) {
      return NextResponse.json(
        { error: "Engagement stage not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(stage);
  } catch (error) {
    console.error("Error fetching engagement stage:", error);
    return NextResponse.json(
      { error: "Failed to fetch engagement stage" },
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

    const existing = await get("SELECT * FROM engagement_stages WHERE id = ?", [
      id,
    ]);
    if (!existing) {
      return NextResponse.json(
        { error: "Engagement stage not found" },
        { status: 404 }
      );
    }

    // Check for duplicate name
    const duplicate = await get(
      "SELECT * FROM engagement_stages WHERE name = ? AND id != ?",
      [name, id]
    );
    if (duplicate) {
      return NextResponse.json(
        { error: "A stage with this name already exists" },
        { status: 400 }
      );
    }

    await run(
      "UPDATE engagement_stages SET name = ?, sort_order = ? WHERE id = ?",
      [name, sort_order ?? existing.sort_order, id]
    );

    const stage = await get("SELECT * FROM engagement_stages WHERE id = ?", [
      id,
    ]);

    return NextResponse.json(stage);
  } catch (error) {
    console.error("Error updating engagement stage:", error);
    return NextResponse.json(
      { error: "Failed to update engagement stage" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await get("SELECT * FROM engagement_stages WHERE id = ?", [
      id,
    ]);
    if (!existing) {
      return NextResponse.json(
        { error: "Engagement stage not found" },
        { status: 404 }
      );
    }

    await run("DELETE FROM engagement_stages WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting engagement stage:", error);
    return NextResponse.json(
      { error: "Failed to delete engagement stage" },
      { status: 500 }
    );
  }
}
