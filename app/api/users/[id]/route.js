import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const result = await sql`
      SELECT id, email, name, is_active, is_admin, created_at, updated_at
      FROM users
      WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user permissions
    const permissions = await sql`
      SELECT entity_type, can_create, can_read, can_update, can_delete
      FROM user_permissions
      WHERE user_id = ${id}
    `;

    return NextResponse.json({
      ...result.rows[0],
      permissions: permissions.rows,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const { name, email, is_active, is_admin, permissions } =
      await request.json();

    // Update user
    const result = await sql`
      UPDATE users
      SET name = ${name}, email = ${email}, is_active = ${is_active}, is_admin = ${is_admin}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING id, email, name, is_active, is_admin, created_at, updated_at
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions
      await sql`DELETE FROM user_permissions WHERE user_id = ${id}`;

      // Insert new permissions
      for (const perm of permissions) {
        await sql`
          INSERT INTO user_permissions (user_id, entity_type, can_create, can_read, can_update, can_delete)
          VALUES (${id}, ${perm.entity_type}, ${perm.can_create}, ${perm.can_read}, ${perm.can_update}, ${perm.can_delete})
        `;
      }
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await sql`DELETE FROM users WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
