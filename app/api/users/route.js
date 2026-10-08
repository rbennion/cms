import { NextResponse } from "next/server";
import { get, all, run } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { normalizeEmail, emailTaken } from "@/lib/users";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const rows = await all(
      "SELECT id, email, name, is_active, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC"
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const session = await auth();

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, password, is_active, is_admin } = body;
    const email = normalizeEmail(body.email);

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (await emailTaken(email)) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const row = await get(
      "INSERT INTO users (email, password_hash, name, is_active, is_admin) VALUES (?, ?, ?, ?, ?) RETURNING id, email, name, is_active, is_admin, created_at",
      [email, passwordHash, name, is_active || false, is_admin || false]
    );

    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
