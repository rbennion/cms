import { NextResponse } from "next/server";
import { handleUpload } from "@vercel/blob/client";
import { requireAuth } from "@/lib/api-auth";
import { MAX_UPLOAD_BYTES } from "@/lib/utils";
import { uploadKind } from "@/lib/uploads";

export const dynamic = "force-dynamic";

// Issues short-lived tokens so the browser can upload documents directly to
// blob storage. Direct uploads bypass Vercel's ~4.5 MB request body limit,
// which is what capped uploads at 4 MB before. The token constrains content
// types, size, and the path prefix the client may write to.


export async function POST(request) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = await request.json();

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        let kind;
        try {
          kind = JSON.parse(clientPayload || "{}").kind;
        } catch {
          kind = null;
        }
        const config = uploadKind(kind);
        if (!config) {
          throw new Error("Unknown upload kind");
        }
        if (!pathname.startsWith(config.prefix)) {
          throw new Error("Invalid upload path");
        }
        return {
          allowedContentTypes: config.allowedContentTypes,
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: false,
        };
      },
      // Completion is confirmed by the client calling the relevant save
      // endpoint with the uploaded pathname — no reliance on this callback
      // (it cannot reach local dev anyway).
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("Upload token error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 400 });
  }
}
