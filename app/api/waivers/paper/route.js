import { NextResponse } from "next/server";
import { put, head } from "@vercel/blob";
import { get, run } from "@/lib/db";
import { requireAdmin } from "@/lib/api-auth";
import { generateUniqueFilename } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Records a waiver that was signed on paper: the uploaded scan/photo IS the
// signed document. No token, no email — the record is born signed.
export async function POST(request) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    let personId
    let blob

    if (request.headers.get("content-type")?.includes("application/json")) {
      // Direct-to-storage flow: the browser already uploaded via a token from
      // /api/uploads/token; this call records the resulting pathname.
      const body = await request.json();
      personId = body.person_id;
      const pathname = body.pathname;
      if (!personId) {
        return NextResponse.json({ error: "person_id required" }, { status: 400 });
      }
      if (!pathname?.startsWith("waivers/paper-")) {
        return NextResponse.json({ error: "Invalid document path" }, { status: 400 });
      }
      const person = await get(`SELECT id FROM people WHERE id = ?`, [personId]);
      if (!person) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
      }
      try {
        await head(pathname);
      } catch {
        return NextResponse.json({ error: "Uploaded file not found in storage" }, { status: 400 });
      }
      blob = { pathname };
    } else {
      const formData = await request.formData();
      personId = formData.get("person_id");
      const file = formData.get("file");

      if (!personId) {
        return NextResponse.json({ error: "person_id required" }, { status: 400 });
      }
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const person = await get(`SELECT id FROM people WHERE id = ?`, [personId]);
      if (!person) {
        return NextResponse.json({ error: "Person not found" }, { status: 404 });
      }

      const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
      const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png"];
      const ext = "." + file.name.split(".").pop().toLowerCase();
      if (!allowedTypes.includes(file.type) || !allowedExtensions.includes(ext)) {
        return NextResponse.json(
          { error: "Invalid file type. Allowed: PDF, JPG, PNG" },
          { status: 400 }
        );
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      if (buffer.length > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "File too large. Maximum size is 10MB" }, { status: 400 });
      }

      const filename = generateUniqueFilename(file.name);
      blob = await put(`waivers/paper-${filename}`, buffer, { access: "private" });
    }

    const inserted = await run(
      `INSERT INTO waivers (person_id, status, source, signed_at, signed_pdf_path)
       VALUES (?, 'signed', 'paper', CURRENT_TIMESTAMP, ?)`,
      [personId, blob.pathname]
    );

    return NextResponse.json({ ok: true, waiver_id: inserted.lastInsertRowid }, { status: 201 });
  } catch (error) {
    console.error("Error recording paper waiver:", error);
    return NextResponse.json({ error: "Failed to record paper waiver" }, { status: 500 });
  }
}
