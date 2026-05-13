import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendWaiverRequest, buildSigningUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const waiver = await get(
    `SELECT w.id, w.person_id, w.status, w.sent_to_email,
            p.first_name, p.last_name
     FROM waivers w
     JOIN people p ON p.id = w.person_id
     WHERE w.id = ?`,
    [id]
  );
  if (!waiver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (waiver.status === "signed") {
    return NextResponse.json({ error: "Waiver already signed" }, { status: 409 });
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await run(
    `UPDATE waivers
     SET token_hash = ?, status = 'pending', sent_at = CURRENT_TIMESTAMP,
         expires_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [tokenHash, expiresAt, id]
  );

  const participantName = [waiver.first_name, waiver.last_name].filter(Boolean).join(" ");
  const signingUrl = buildSigningUrl(token);

  try {
    await sendWaiverRequest({ to: waiver.sent_to_email, participantName, signingUrl });
  } catch (e) {
    return NextResponse.json(
      { ok: true, warning: "Token rotated but email failed", error: String(e.message || e) },
      { status: 200 }
    );
  }

  return NextResponse.json({
    ok: true,
    signing_url: process.env.NODE_ENV === "production" ? undefined : signingUrl,
  });
}
