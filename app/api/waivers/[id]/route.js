import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { error } = await requireAuth();
  if (error) return error;
  const { id } = await params;

  const waiver = await get(
    `SELECT w.*, p.first_name, p.last_name
     FROM waivers w
     JOIN people p ON p.id = w.person_id
     WHERE w.id = ?`,
    [id]
  );
  if (!waiver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Don't leak the token hash externally
  delete waiver.token_hash;
  return NextResponse.json({ waiver });
}

export async function DELETE(request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;
  const { id } = await params;

  const result = await run(`DELETE FROM waivers WHERE id = ?`, [id]);
  if (!result.changes) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
