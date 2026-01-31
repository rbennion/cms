import { auth } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export async function checkPermission(entityType, action) {
  const session = await auth();

  if (!session?.user) {
    return { allowed: false, error: "Not authenticated" };
  }

  // Admins have full access
  if (session.user.isAdmin) {
    return { allowed: true, user: session.user };
  }

  const userId = parseInt(session.user.id);

  // Check user-specific permissions
  const result = await sql`
    SELECT can_create, can_read, can_update, can_delete
    FROM user_permissions
    WHERE user_id = ${userId} AND entity_type = ${entityType}
  `;

  const permission = result.rows[0];

  if (!permission) {
    // Default: read-only access if no specific permissions set
    if (action === "read") {
      return { allowed: true, user: session.user };
    }
    return {
      allowed: false,
      error: "Permission denied",
      user: session.user,
    };
  }

  const actionMap = {
    create: permission.can_create,
    read: permission.can_read,
    update: permission.can_update,
    delete: permission.can_delete,
  };

  if (actionMap[action]) {
    return { allowed: true, user: session.user };
  }

  return {
    allowed: false,
    error: "Permission denied",
    user: session.user,
  };
}

export async function requirePermission(entityType, action) {
  const result = await checkPermission(entityType, action);

  if (!result.allowed) {
    throw new Error(result.error);
  }

  return result.user;
}

export async function getUserPermissions(userId) {
  const result = await sql`
    SELECT entity_type, can_create, can_read, can_update, can_delete
    FROM user_permissions
    WHERE user_id = ${userId}
  `;

  const permissions = {};
  for (const row of result.rows) {
    permissions[row.entity_type] = {
      create: row.can_create,
      read: row.can_read,
      update: row.can_update,
      delete: row.can_delete,
    };
  }

  return permissions;
}
