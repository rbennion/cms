import { upload } from "@vercel/blob/client";
import { generateUniqueFilename, MAX_UPLOAD_BYTES, fileTooLargeMessage } from "./utils";

export { MAX_UPLOAD_BYTES, fileTooLargeMessage };

// Uploads a document from the browser directly to blob storage (private),
// bypassing the server's ~4.5 MB request limit. Returns the stored pathname;
// the caller then records that pathname via the relevant save endpoint.
export async function uploadDocument(file, kind) {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(fileTooLargeMessage(file));
  }
  const prefix = kind === "paper-waiver" ? "waivers/paper-" : "documents/";
  const pathname = `${prefix}${generateUniqueFilename(file.name)}`;
  const blob = await upload(pathname, file, {
    access: "private",
    handleUploadUrl: "/api/uploads/token",
    clientPayload: JSON.stringify({ kind }),
    contentType: file.type,
    // Send anything sizeable in chunks — a single request for a 100 MB scan on
    // a phone connection is one dropped packet away from starting over.
    multipart: file.size > 8 * 1024 * 1024,
  });
  return blob.pathname;
}
