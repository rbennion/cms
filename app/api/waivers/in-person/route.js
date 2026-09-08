import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { generateToken, hashToken } from "@/lib/tokens";
import { buildSigningUrl } from "@/lib/email";
import { IN_PERSON_EXPIRY_MS } from "@/lib/waivers";

export const dynamic = "force-dynamic";

// Starts a waiver to be signed on the spot: same signing page as the emailed
// flow, but no email goes out. The link comes back so staff can open it on
// their own device or show it as a QR code for the parent's phone.
export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { person_id } = body;
  if (!person_id) {
    return NextResponse.json({ error: "person_id required" }, { status: 400 });
  }

  const person = await get(`SELECT id FROM people WHERE id = ?`, [person_id]);
  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + IN_PERSON_EXPIRY_MS);

  const inserted = await run(
    `INSERT INTO waivers (person_id, token_hash, status, source, expires_at)
     VALUES (?, ?, 'pending', 'in_person', ?)`,
    [person_id, hashToken(token), expiresAt]
  );

  return NextResponse.json(
    { waiver_id: inserted.lastInsertRowid, signing_url: buildSigningUrl(token), expires_at: expiresAt },
    { status: 201 }
  );
}
