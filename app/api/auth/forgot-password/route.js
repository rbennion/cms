import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import crypto from "crypto";
import { sendPasswordReset } from "@/lib/email";

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find user
    const user = await get(
      "SELECT id, email, name FROM users WHERE email = ?",
      [email]
    );

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists, a reset link will be sent",
      });
    }

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await run(
      "UPDATE password_reset_tokens SET used = true WHERE user_id = ? AND used = false",
      [user.id]
    );

    // Create new token
    await run(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt.toISOString()]
    );

    const resetLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    // A failure to send must not tell the caller whether the address exists, and
    // must not lose the token either — it is already stored, so the user can be
    // sent a fresh link. Log it and answer the same way regardless.
    try {
      await sendPasswordReset({ to: user.email, name: user.name, resetUrl: resetLink });
    } catch (sendError) {
      console.error("Failed to send password reset email:", sendError);
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists, a reset link will be sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
