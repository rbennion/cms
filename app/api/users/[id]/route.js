import { NextResponse } from "next/server";
import { get, all, run } from "@/lib/db";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const user = await get(
      "SELECT id, email, name, is_active, is_admin, created_at, updated_at FROM users WHERE id = ?",
      [id]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user permissions
    const permissions = await all(
      "SELECT entity_type, can_create, can_read, can_update, can_delete FROM user_permissions WHERE user_id = ?",
      [id]
    );

    return NextResponse.json({
      ...user,
      permissions,
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
    const user = await get(
      "UPDATE users SET name = ?, email = ?, is_active = ?, is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, email, name, is_active, is_admin, created_at, updated_at",
      [name, email, is_active, is_admin, id]
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update permissions if provided
    if (permissions && Array.isArray(permissions)) {
      // Delete existing permissions
      await run("DELETE FROM user_permissions WHERE user_id = ?", [id]);

      // Insert new permissions
      for (const perm of permissions) {
        await run(
          "INSERT INTO user_permissions (user_id, entity_type, can_create, can_read, can_update, can_delete) VALUES (?, ?, ?, ?, ?, ?)",
          [id, perm.entity_type, perm.can_create, perm.can_read, perm.can_update, perm.can_delete]
        );
      }
    }

    return NextResponse.json(user);
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

    await run("DELETE FROM users WHERE id = ?", [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
