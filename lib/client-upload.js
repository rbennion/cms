import { upload } from "@vercel/blob/client";
import { generateUniqueFilename } from "./utils";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function fileTooLargeMessage(file) {
  const mb = (file.size / (1024 * 1024)).toFixed(1);
  return `This file is ${mb} MB — the limit is 10 MB. Try a smaller scan or a compressed photo.`;
}

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
  });
  return blob.pathname;
}
