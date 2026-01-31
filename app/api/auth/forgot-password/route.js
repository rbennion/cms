import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import crypto from "crypto";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user
    const userResult = await sql`
      SELECT id, email, name FROM users WHERE email = ${email}
    `;

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link will be sent",
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await sql`
      UPDATE password_reset_tokens
      SET used = true
      WHERE user_id = ${user.id} AND used = false
    `;

    // Create new token
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES (${user.id}, ${token}, ${expiresAt.toISOString()})
    `;

    // In production, send email here
    // For development, return the link directly
    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    return NextResponse.json({
      success: true,
      message: "Reset link generated",
      // Only include resetLink in development
      resetLink:
        process.env.NODE_ENV !== "production" ? resetLink : undefined,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
