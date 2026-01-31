import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Find valid token
    const tokenResult = await sql`
      SELECT id, user_id, expires_at
      FROM password_reset_tokens
      WHERE token = ${token}
      AND used = false
      AND expires_at > NOW()
    `;

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset link" },
        { status: 400 }
      );
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update user password
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${resetToken.user_id}
    `;

    // Mark token as used
    await sql`
      UPDATE password_reset_tokens
      SET used = true
      WHERE id = ${resetToken.id}
    `;

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
