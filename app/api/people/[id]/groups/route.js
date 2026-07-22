import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAuth } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

// Person-side group membership. The primary leader is set on the group
// itself, so only the three junction-table roles are managed here.
const ROLE_TABLES = {
  support_leader: "group_leaders",
  student: "group_students",
  parent: "group_parents",
};

export async function POST(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const body = await request.json();
    const { group_id, role } = body;

    const table = ROLE_TABLES[role];
    if (!group_id || !table) {
      return NextResponse.json(
        { error: "group_id and a valid role (support_leader, student, parent) are required" },
        { status: 400 }
      );
    }

    const person = await get("SELECT id FROM people WHERE id = ?", [id]);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    const group = await get("SELECT id FROM groups WHERE id = ?", [group_id]);
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    await run(
      `INSERT INTO ${table} (group_id, person_id) VALUES (?, ?)
       ON CONFLICT (group_id, person_id) DO NOTHING`,
      [group_id, id]
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Error adding group membership:", error);
    return NextResponse.json({ error: "Failed to add group" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { error } = await requireAuth();
    if (error) return error;

    const { id } = await params;
    const url = new URL(request.url);
    const groupId = url.searchParams.get("group_id");
    const role = url.searchParams.get("role");

    const table = ROLE_TABLES[role];
    if (!groupId || !table) {
      return NextResponse.json(
        { error: "group_id and a valid role (support_leader, student, parent) are required" },
        { status: 400 }
      );
    }

    await run(`DELETE FROM ${table} WHERE group_id = ? AND person_id = ?`, [groupId, id]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error removing group membership:", error);
    return NextResponse.json({ error: "Failed to remove group" }, { status: 500 });
  }
}
