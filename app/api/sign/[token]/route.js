import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const tokenHash = hashToken(token);
  const waiver = await get(
    `SELECT w.id, w.status, w.expires_at, w.signed_at, w.participant_name,
            p.first_name, p.last_name
     FROM waivers w
     JOIN people p ON p.id = w.person_id
     WHERE w.token_hash = ?`,
    [tokenHash]
  );

  if (!waiver) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  if (waiver.status === "signed") {
    return NextResponse.json({ status: "signed", signed_at: waiver.signed_at });
  }
  if (waiver.expires_at && new Date(waiver.expires_at) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  return NextResponse.json({
    status: waiver.status,
    participant_name: [waiver.first_name, waiver.last_name].filter(Boolean).join(" "),
  });
}

export async function POST(request, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const body = await request.json();
  const {
    liability_release_choice,
    photo_release_choice,
    participant_name,
    signer_name,
    signature_png,
  } = body || {};

  if (!liability_release_choice || !photo_release_choice || !signer_name || !signature_png) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["release", "do_not_release"].includes(liability_release_choice)) {
    return NextResponse.json({ error: "Invalid liability_release_choice" }, { status: 400 });
  }
  if (!["allow", "do_not_allow"].includes(photo_release_choice)) {
    return NextResponse.json({ error: "Invalid photo_release_choice" }, { status: 400 });
  }
  if (!signature_png.startsWith("data:image/png;base64,")) {
    return NextResponse.json({ error: "signature_png must be a PNG data URL" }, { status: 400 });
  }

  const tokenHash = hashToken(token);
  const waiver = await get(
    `SELECT w.id, w.status, w.expires_at, p.first_name, p.last_name
     FROM waivers w
     JOIN people p ON p.id = w.person_id
     WHERE w.token_hash = ?`,
    [tokenHash]
  );
  if (!waiver) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  if (waiver.status === "signed") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }
  if (waiver.expires_at && new Date(waiver.expires_at) < new Date()) {
    return NextResponse.json({ error: "Link expired" }, { status: 410 });
  }

  const headers = request.headers;
  const ipAddress =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown";
  const userAgent = headers.get("user-agent") || "unknown";
  const signedAt = new Date();

  const effectiveParticipantName =
    participant_name?.trim() ||
    [waiver.first_name, waiver.last_name].filter(Boolean).join(" ");

  await run(
    `UPDATE waivers
     SET status = 'signed',
         liability_release_choice = ?,
         photo_release_choice = ?,
         participant_name = ?,
         signer_name = ?,
         signature_png = ?,
         signed_at = ?,
         ip_address = ?,
         user_agent = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      liability_release_choice,
      photo_release_choice,
      effectiveParticipantName,
      signer_name,
      signature_png,
      signedAt,
      ipAddress,
      userAgent,
      waiver.id,
    ]
  );

  return NextResponse.json({ ok: true });
}
