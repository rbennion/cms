import { MAX_UPLOAD_BYTES } from "./utils";
import { head } from "./storage";

// What the browser is allowed to upload, and where it may write. Shared by both
// upload paths (the Vercel token route and the S3 presign route) so the rules
// cannot drift apart between backends.
export const UPLOAD_KINDS = {
  "cert-doc": {
    prefix: "documents/",
    allowedContentTypes: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
  "paper-waiver": {
    prefix: "waivers/paper-",
    allowedContentTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
};

export function uploadKind(kind) {
  return UPLOAD_KINDS[kind] || null;
}

// Confirms a browser-uploaded file actually arrived, and that it is within the
// size limit. A signed upload link cannot enforce a size by itself — the
// browser could send more than it declared — so the real check happens here,
// before the path is recorded against a person's record.
export async function verifyUploaded(pathname) {
  const meta = await head(pathname);
  if (meta?.size != null && meta.size > MAX_UPLOAD_BYTES) {
    const mb = (meta.size / (1024 * 1024)).toFixed(1);
    throw new Error(`Uploaded file is ${mb} MB, over the limit`);
  }
  return meta;
}
