import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
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

    const result = await sql`
      SELECT id, user_id, name, entity_type, filter_state, is_shared, created_at
      FROM saved_views
      WHERE id = ${id}
      AND (user_id = ${userId} OR is_shared = true)
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
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
    const existing = await sql`
      SELECT user_id FROM saved_views WHERE id = ${id}
    `;

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    if (existing.rows[0].user_id !== userId && !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const result = await sql`
      UPDATE saved_views
      SET name = ${name}, filter_state = ${JSON.stringify(filter_state)}, is_shared = ${is_shared}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, user_id, name, entity_type, filter_state, is_shared, created_at, updated_at
    `;

    return NextResponse.json(result.rows[0]);
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
    const existing = await sql`
      SELECT user_id FROM saved_views WHERE id = ${id}
    `;

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    if (existing.rows[0].user_id !== userId && !session.user.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await sql`DELETE FROM saved_views WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved view:", error);
    return NextResponse.json(
      { error: "Failed to delete saved view" },
      { status: 500 }
    );
  }
}
