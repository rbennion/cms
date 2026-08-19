import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { renderSignedWaiver } from "@/lib/waiver-pdf";
import { get as blobGet } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// POST regenerates the signed PDF for an already-signed waiver.
// Called internally by the public sign route and manually by admins via the UI.
export async function POST(request, { params }) {
  const { id } = await params;
  const isInternal = request.headers.get("x-internal-trigger") === "sign";

  if (!isInternal) {
    const { requireAdmin } = await import("@/lib/api-auth");
    const { error } = await requireAdmin();
    if (error) return error;
  }

  const waiver = await get(
    `SELECT * FROM waivers WHERE id = ?`,
    [id]
  );
  if (!waiver) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (waiver.status !== "signed") {
    return NextResponse.json({ error: "Waiver not signed yet" }, { status: 409 });
  }

  const { path: pdfPath, sha256 } = await renderSignedWaiver({
    waiverId: waiver.id,
    participantName: waiver.participant_name,
    signerName: waiver.signer_name,
    liabilityChoice: waiver.liability_release_choice,
    photoChoice: waiver.photo_release_choice,
    signaturePngDataUrl: waiver.signature_png,
    signedAt: waiver.signed_at,
    ipAddress: waiver.ip_address,
    userAgent: waiver.user_agent,
  });

  await run(
    `UPDATE waivers
     SET signed_pdf_path = ?, signed_pdf_sha256 = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [pdfPath, sha256, id]
  );

  return NextResponse.json({ ok: true, signed_pdf_path: pdfPath, signed_pdf_sha256: sha256 });
}

// GET streams the signed PDF from Vercel Blob (private store) to an
// authenticated user. If the PDF hasn't been generated yet, it is generated
// on the fly and served in the same request — there is no separate
// "generate" step in the UI.
export async function GET(request, { params }) {
  const { requireAuth } = await import("@/lib/api-auth");
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const waiver = await get(`SELECT * FROM waivers WHERE id = ?`, [id]);
  if (!waiver) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const safeName = (waiver.participant_name || `waiver-${id}`).replace(/[^a-z0-9-_]+/gi, "_");
  const pdfHeaders = (extra = {}) => ({
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${safeName}-waiver.pdf"`,
    "Cache-Control": "private, max-age=0, no-cache",
    ...extra,
  });

  if (!waiver.signed_pdf_path) {
    if (waiver.status !== "signed") {
      return NextResponse.json({ error: "Waiver not signed yet" }, { status: 409 });
    }

    const { path: pdfPath, sha256, buffer } = await renderSignedWaiver({
      waiverId: waiver.id,
      participantName: waiver.participant_name,
      signerName: waiver.signer_name,
      liabilityChoice: waiver.liability_release_choice,
      photoChoice: waiver.photo_release_choice,
      signaturePngDataUrl: waiver.signature_png,
      signedAt: waiver.signed_at,
      ipAddress: waiver.ip_address,
      userAgent: waiver.user_agent,
    });

    await run(
      `UPDATE waivers
       SET signed_pdf_path = ?, signed_pdf_sha256 = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [pdfPath, sha256, id]
    );

    return new Response(buffer, {
      headers: pdfHeaders({ "Content-Length": String(buffer.length) }),
    });
  }

  const { stream, headers } = await blobGet(waiver.signed_pdf_path, { access: "private" });

  // Paper waivers may be image scans, not PDFs — honor the stored content type.
  const storedType = headers?.["content-type"];
  const ext = waiver.signed_pdf_path.split(".").pop().toLowerCase();
  return new Response(stream, {
    headers: pdfHeaders({
      ...(storedType ? { "Content-Type": storedType } : {}),
      "Content-Disposition": `inline; filename="${safeName}-waiver.${ext || "pdf"}"`,
      ...(headers?.["content-length"] ? { "Content-Length": headers["content-length"] } : {}),
    }),
  });
}
