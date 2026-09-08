import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { generateToken, hashToken } from "@/lib/tokens";
import { buildSigningUrl } from "@/lib/email";
import { IN_PERSON_EXPIRY_MS } from "@/lib/waivers";

export const dynamic = "force-dynamic";

// Re-opens an unsigned in-person waiver: rotates the link (only its hash is
// stored, so the old one cannot be shown again) and hands back a fresh one.
export async function POST(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const waiver = await get(`SELECT id, status, source FROM waivers WHERE id = ?`, [id]);
  if (!waiver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (waiver.source !== "in_person") {
    return NextResponse.json({ error: "Not an in-person waiver" }, { status: 400 });
  }
  if (waiver.status === "signed") {
    return NextResponse.json({ error: "Waiver already signed" }, { status: 409 });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + IN_PERSON_EXPIRY_MS);

  await run(
    `UPDATE waivers
     SET token_hash = ?, status = 'pending', sent_at = CURRENT_TIMESTAMP,
         expires_at = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [hashToken(token), expiresAt, id]
  );

  return NextResponse.json({ ok: true, waiver_id: waiver.id, signing_url: buildSigningUrl(token), expires_at: expiresAt });
}
