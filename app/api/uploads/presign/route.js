import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { generateUniqueFilename, MAX_UPLOAD_BYTES } from "@/lib/utils";
import { uploadKind } from "@/lib/uploads";
import { presignUpload, usingS3 } from "@/lib/storage";

export const dynamic = "force-dynamic";

// Hands the browser a short-lived link it can upload one file to, directly to
// the storage service. The link is tied to a single path and content type and
// expires in ten minutes. Used only when storage is self-hosted; on Vercel the
// equivalent handshake lives in ../token.
export async function POST(request) {
  const { error } = await requireAuth();
  if (error) return error;

  if (!usingS3()) {
    return NextResponse.json(
      { error: "Direct upload links are not available on this storage backend" },
      { status: 400 }
    );
  }

  const { kind, filename, contentType, size } = await request.json();

  const config = uploadKind(kind);
  if (!config) {
    return NextResponse.json({ error: "Unknown upload kind" }, { status: 400 });
  }
  if (!filename) {
    return NextResponse.json({ error: "Filename is required" }, { status: 400 });
  }
  if (!config.allowedContentTypes.includes(contentType)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX" },
      { status: 400 }
    );
  }
  if (typeof size === "number" && size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is over the size limit" }, { status: 400 });
  }

  // The client never chooses its own path — the server builds it, so a caller
  // cannot write outside the prefix its upload kind allows.
  const pathname = `${config.prefix}${generateUniqueFilename(filename)}`;

  try {
    const url = await presignUpload(pathname, contentType);
    return NextResponse.json({ url, pathname });
  } catch (err) {
    console.error("Presign error:", err);
    return NextResponse.json({ error: "Could not prepare the upload" }, { status: 500 });
  }
}
