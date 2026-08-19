import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, existsSync } from "node:fs";

// Storage is the one piece that had to be rewritten for self-hosting. These run
// against the staging storage service; if it is not configured they are skipped
// rather than silently passing.
const envFile = ".env.storage.test";
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

const configured = !!process.env.S3_ENDPOINT;
const maybe = configured ? describe : describe.skip;

const { put, del, head, get, presignUpload, usingS3 } = await import("@/lib/storage");
const { uploadKind, verifyUploaded, UPLOAD_KINDS } = await import("@/lib/uploads");
const { MAX_UPLOAD_BYTES } = await import("@/lib/utils");

const KEY = "documents/_vitest-probe.txt";
const BODY = Buffer.from("storage under test\n");

maybe("storing and retrieving a document", () => {
  afterAll(async () => { try { await del(KEY); } catch {} });

  it("is using our own storage, not the old provider", () => {
    expect(usingS3()).toBe(true);
  });

  it("stores a file", async () => {
    const res = await put(KEY, BODY, { contentType: "text/plain" });
    expect(res.pathname).toBe(KEY);
  });

  it("reports its size and type", async () => {
    const meta = await head(KEY);
    expect(meta.size).toBe(BODY.length);
    expect(meta.contentType).toBe("text/plain");
    expect(meta.uploadedAt).toBeInstanceOf(Date);
  });

  it("streams it back unchanged", async () => {
    const { stream, headers } = await get(KEY);
    const text = await new Response(stream).text();
    expect(text).toBe(BODY.toString());
    expect(headers["content-length"]).toBe(String(BODY.length));
  });

  it("deletes it", async () => {
    await del(KEY);
    await expect(head(KEY)).rejects.toBeTruthy();
  });

  it("says so clearly when a file is not there", async () => {
    await expect(head("documents/_definitely-not-here.pdf")).rejects.toBeTruthy();
  });
});

maybe("signed upload links", () => {
  it("produces a link the browser can use", async () => {
    const url = await presignUpload("documents/_probe.pdf", "application/pdf");
    expect(url).toMatch(/^https?:\/\//);
    expect(url).toContain("_probe.pdf");
    // Signed, time-limited, and carrying its own credentials.
    expect(url).toMatch(/X-Amz-Signature=/);
    expect(url).toMatch(/X-Amz-Expires=/);
  });

  it("points the browser at the public address, not the internal one", async () => {
    if (!process.env.S3_PUBLIC_ENDPOINT) return;
    const url = await presignUpload("documents/_probe.pdf", "application/pdf");
    expect(url.startsWith(process.env.S3_PUBLIC_ENDPOINT)).toBe(true);
  });
});

describe("what the browser is allowed to upload", () => {
  it("knows the two kinds of upload and where each is filed", () => {
    expect(uploadKind("cert-doc").prefix).toBe("documents/");
    expect(uploadKind("paper-waiver").prefix).toBe("waivers/paper-");
  });

  it("refuses an upload kind it does not recognise", () => {
    expect(uploadKind("anything-else")).toBeNull();
    expect(uploadKind(undefined)).toBeNull();
  });

  it("allows scans and photos, and nothing executable", () => {
    for (const kind of Object.values(UPLOAD_KINDS)) {
      expect(kind.allowedContentTypes).toContain("application/pdf");
      expect(kind.allowedContentTypes.join(",")).not.toMatch(/msdownload|x-sh|octet-stream/);
    }
  });

  it("caps uploads at 100 MB", () => {
    expect(MAX_UPLOAD_BYTES).toBe(100 * 1024 * 1024);
  });
});

maybe("size is enforced after the upload, not just before", () => {
  // A signed link cannot police its own size — the browser could send more than
  // it declared. The real check happens when the path is recorded.
  const SMALL = "documents/_vitest-small.txt";
  beforeAll(async () => { await put(SMALL, Buffer.from("tiny"), { contentType: "text/plain" }); });
  afterAll(async () => { try { await del(SMALL); } catch {} });

  it("accepts a file within the limit", async () => {
    const meta = await verifyUploaded(SMALL);
    expect(meta.size).toBe(4);
  });

  it("refuses to record a file that was never uploaded", async () => {
    await expect(verifyUploaded("documents/_never-uploaded.pdf")).rejects.toBeTruthy();
  });
});
