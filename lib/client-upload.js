import { generateUniqueFilename, MAX_UPLOAD_BYTES, fileTooLargeMessage } from "./utils";

export { MAX_UPLOAD_BYTES, fileTooLargeMessage };

// Which storage the app is talking to. Set to "s3" on the self-hosted
// environments; unset on Vercel. Read at render time so choosing the upload
// path costs no extra round trip.
const SELF_HOSTED = process.env.NEXT_PUBLIC_STORAGE_MODE === "s3";

// Uploads a document from the browser straight to storage, never through the
// app. Returns the stored pathname; the caller then records that pathname via
// the relevant save endpoint.
export async function uploadDocument(file, kind) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(fileTooLargeMessage(file));
  }
  return SELF_HOSTED
    ? uploadToSelfHosted(file, kind)
    : uploadToVercelBlob(file, kind);
}

// Self-hosted: ask for a one-off signed link, then PUT the file at it.
async function uploadToSelfHosted(file, kind) {
  const res = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      filename: file.name,
      contentType: file.type,
      size: file.size,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Could not prepare the upload");
  }
  const { url, pathname } = await res.json();

  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) {
    throw new Error(`Upload failed (HTTP ${put.status})`);
  }
  return pathname;
}

// Vercel: the SDK runs its own handshake against /api/uploads/token.
async function uploadToVercelBlob(file, kind) {
  const { upload } = await import("@vercel/blob/client");
  const prefix = kind === "paper-waiver" ? "waivers/paper-" : "documents/";
  const pathname = `${prefix}${generateUniqueFilename(file.name)}`;
  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/uploads/token",
    clientPayload: JSON.stringify({ kind }),
    contentType: file.type,
    // Send anything sizeable in chunks — a single request for a large scan on
    // a phone connection is one dropped packet away from starting over.
    multipart: file.size > 8 * 1024 * 1024,
  });
  return blob.pathname;
}
