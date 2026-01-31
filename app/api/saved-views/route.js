import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");

    const userId = parseInt(session.user.id);

    let result;
    if (entityType) {
      // Get views for specific entity type (user's own + shared)
      result = await sql`
        SELECT id, user_id, name, entity_type, filter_state, is_shared, created_at
        FROM saved_views
        WHERE entity_type = ${entityType}
        AND (user_id = ${userId} OR is_shared = true)
        ORDER BY name
      `;
    } else {
      // Get all views for current user
      result = await sql`
        SELECT id, user_id, name, entity_type, filter_state, is_shared, created_at
        FROM saved_views
        WHERE user_id = ${userId} OR is_shared = true
        ORDER BY entity_type, name
      `;
    }

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching saved views:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved views" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, entity_type, filter_state, is_shared } = await request.json();

    if (!name || !entity_type) {
      return NextResponse.json(
        { error: "Name and entity type are required" },
        { status: 400 }
      );
    }

    const userId = parseInt(session.user.id);

    const result = await sql`
      INSERT INTO saved_views (user_id, name, entity_type, filter_state, is_shared)
      VALUES (${userId}, ${name}, ${entity_type}, ${JSON.stringify(filter_state || {})}, ${is_shared || false})
      RETURNING id, user_id, name, entity_type, filter_state, is_shared, created_at
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating saved view:", error);
    return NextResponse.json(
      { error: "Failed to create saved view" },
      { status: 500 }
    );
  }
}
