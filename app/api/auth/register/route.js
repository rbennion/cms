import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Check if this is the first user - make them admin and active
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const isFirstUser = parseInt(userCount.rows[0].count) === 0;

    // Create user
    const result = await sql`
      INSERT INTO users (email, password_hash, name, is_active, is_admin)
      VALUES (${email}, ${passwordHash}, ${name}, ${isFirstUser}, ${isFirstUser})
      RETURNING id, email, name, is_active, is_admin
    `;

    const user = result.rows[0];

    return NextResponse.json(
      {
        message: isFirstUser
          ? "Account created and activated as admin"
          : "Account created. Pending admin approval.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isActive: user.is_active,
          isAdmin: user.is_admin,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
