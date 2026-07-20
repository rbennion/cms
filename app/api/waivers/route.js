import { NextResponse } from "next/server";
import { get, all, run } from "@/lib/db";
import { requireAdmin, requireAuth } from "@/lib/api-auth";
import { generateToken, hashToken } from "@/lib/tokens";
import { sendWaiverRequest, buildSigningUrl } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { error } = await requireAuth();
  if (error) return error;

  const url = new URL(request.url);
  const personId = url.searchParams.get("person_id");

  const rows = personId
    ? await all(
        `SELECT w.id, w.person_id, w.status, w.source, w.sent_to_email, w.sent_at,
                w.expires_at, w.signed_at, w.liability_release_choice,
                w.photo_release_choice, w.signed_pdf_path, w.signed_pdf_sha256,
                w.participant_name, w.signer_name
         FROM waivers w
         WHERE w.person_id = ?
         ORDER BY w.sent_at DESC`,
        [personId]
      )
    : await all(
        `SELECT w.id, w.person_id, w.status, w.source, w.sent_to_email, w.sent_at,
                w.expires_at, w.signed_at, w.liability_release_choice,
                w.photo_release_choice, w.signed_pdf_path, w.signer_name,
                p.first_name, p.last_name
         FROM waivers w
         JOIN people p ON p.id = w.person_id
         ORDER BY w.sent_at DESC
         LIMIT 200`
      );

  return NextResponse.json({ waivers: rows });
}

export async function POST(request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await request.json();
  const { person_id, email } = body;

  if (!person_id) {
    return NextResponse.json({ error: "person_id required" }, { status: 400 });
  }

  const person = await get(
    `SELECT id, first_name, last_name, email, guardian_email FROM people WHERE id = ?`,
    [person_id]
  );
  if (!person) {
    return NextResponse.json({ error: "Person not found" }, { status: 404 });
  }

  const sendTo = email || person.guardian_email || person.email;
  if (!sendTo) {
    return NextResponse.json(
      { error: "No email available — provide one or set guardian_email on the person" },
      { status: 400 }
    );
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const inserted = await run(
    `INSERT INTO waivers (person_id, token_hash, status, sent_to_email, expires_at)
     VALUES (?, ?, 'pending', ?, ?)`,
    [person_id, tokenHash, sendTo, expiresAt]
  );

  const participantName = [person.first_name, person.last_name].filter(Boolean).join(" ");
  const signingUrl = buildSigningUrl(token);

  try {
    await sendWaiverRequest({ to: sendTo, participantName, signingUrl });
  } catch (e) {
    console.error("Failed to send waiver email:", e);
    return NextResponse.json(
      { waiver_id: inserted.lastInsertRowid, warning: "Waiver created but email failed", error: String(e.message || e) },
      { status: 201 }
    );
  }

  return NextResponse.json(
    {
      waiver_id: inserted.lastInsertRowid,
      sent_to: sendTo,
      signing_url: process.env.NODE_ENV === "production" ? undefined : signingUrl,
    },
    { status: 201 }
  );
}
