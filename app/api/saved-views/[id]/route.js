import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);

    const view = await get(
      "SELECT id, user_id, name, entity_type, filter_state, is_shared, created_at FROM saved_views WHERE id = ? AND (user_id = ? OR is_shared = true)",
      [id, userId]
    );

    if (!view) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json(view);
  } catch (error) {
    console.error("Error fetching saved view:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved view" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);
    const { name, filter_state, is_shared } = await request.json();

    // Check ownership
    const existing = await get(
      "SELECT user_id FROM saved_views WHERE id = ?",
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    if (existing.user_id !== userId && !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const view = await get(
      "UPDATE saved_views SET name = ?, filter_state = ?, is_shared = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, user_id, name, entity_type, filter_state, is_shared, created_at, updated_at",
      [name, JSON.stringify(filter_state), is_shared, id]
    );

    return NextResponse.json(view);
  } catch (error) {
    console.error("Error updating saved view:", error);
    return NextResponse.json(
      { error: "Failed to update saved view" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = parseInt(session.user.id);

    // Check ownership
    const existing = await get(
      "SELECT user_id FROM saved_views WHERE id = ?",
      [id]
    );

    if (!existing) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    if (existing.user_id !== userId && !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await run("DELETE FROM saved_views WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved view:", error);
    return NextResponse.json(
      { error: "Failed to delete saved view" },
      { status: 500 }
    );
  }
}
