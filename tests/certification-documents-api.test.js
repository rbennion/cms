import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";
import { readFileSync, existsSync } from "node:fs";

if (existsSync(".env.storage.test")) {
  for (const line of readFileSync(".env.storage.test", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", isAdmin: true } }),
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const application = await import("@/app/api/certifications/[id]/application/route.js");
const qpr = await import("@/app/api/certifications/[id]/qpr-certificate/route.js");
const documents = await import("@/app/api/certifications/[id]/documents/route.js");
const certOne = await import("@/app/api/certifications/[id]/route.js");
const presign = await import("@/app/api/uploads/presign/route.js");
const people = await import("@/app/api/people/route.js");
const certifications = await import("@/app/api/certifications/route.js");
const { put, del, usingS3 } = await import("@/lib/storage");
const { query } = await import("@/lib/db");

const storageReady = usingS3();
const maybe = storageReady ? describe : describe.skip;

let personId, certId;
const uploaded = [];

beforeAll(async () => {
  const p = await people.POST(json("http://test/api/people", "POST", {
    first_name: `${TEST_PREFIX}Docs`, last_name: "Person",
    email: "zztest.docs@example.invalid", phone: "555-0105",
  }));
  personId = (await p.json()).id;
  const c = await certifications.POST(json("http://test/api/certifications", "POST", { person_id: personId }));
  certId = (await c.json()).id;
});

afterAll(async () => {
  for (const key of uploaded) { try { await del(key); } catch {} }
  await query("DELETE FROM certifications WHERE person_id = ?", [personId]);
  await cleanupTestRecords();
});

// Puts a file in storage the way the browser would, then hands back its path.
async function stage(name, type = "application/pdf") {
  const key = `documents/${TEST_PREFIX}-${Date.now()}-${name}`;
  await put(key, Buffer.from("%PDF-1.4 test document\n"), { contentType: type });
  uploaded.push(key);
  return key;
}

maybe("attaching a document to a certification", () => {
  it("records an application document and ticks the box", async () => {
    const pathname = await stage("application.pdf");
    const res = await application.POST(
      json("http://test/x", "POST", { pathname }), params(certId)
    );
    expect(res.status).toBeLessThan(300);
    const cert = await (await certOne.GET(new Request("http://test/x"), params(certId))).json();
    expect(cert.application_attachment_path).toBe(pathname);
    // Attaching the application implies it was received.
    expect(cert.application_received).toBe(1);
  });

  it("records a QPR certificate", async () => {
    const pathname = await stage("qpr.pdf");
    const res = await qpr.POST(json("http://test/x", "POST", { pathname }), params(certId));
    expect(res.status).toBeLessThan(300);
  });

  it("reports each document's name, size and date", async () => {
    const res = await documents.GET(new Request("http://test/x"), params(certId));
    expect(res.status).toBe(200);
    const docs = await res.json();
    expect(docs.application.size).toBeGreaterThan(0);
    expect(docs.application.name).toMatch(/application\.pdf$/);
    expect(docs.application.uploadedAt).toBeTruthy();
  });

  it("hands the document back when asked for it", async () => {
    const res = await application.GET(new Request("http://test/x"), params(certId));
    expect(res.status).toBe(200);
    expect((await res.blob()).size).toBeGreaterThan(0);
  });

  it("replaces a document and removes the file it replaced", async () => {
    const before = await (await certOne.GET(new Request("http://test/x"), params(certId))).json();
    const oldPath = before.application_attachment_path;
    const newPath = await stage("application-v2.pdf");
    await application.POST(json("http://test/x", "POST", { pathname: newPath }), params(certId));
    const after = await (await certOne.GET(new Request("http://test/x"), params(certId))).json();
    expect(after.application_attachment_path).toBe(newPath);
    // The superseded file should not be left paying for storage forever.
    const { head } = await import("@/lib/storage");
    await expect(head(oldPath)).rejects.toBeTruthy();
  });
});

maybe("what a document upload will not accept", () => {
  it("refuses a path outside the documents folder", async () => {
    const res = await application.POST(
      json("http://test/x", "POST", { pathname: "../../etc/passwd" }), params(certId)
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses a path that points nowhere", async () => {
    const res = await application.POST(
      json("http://test/x", "POST", { pathname: "documents/never-uploaded.pdf" }), params(certId)
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses to attach anything to a certification that does not exist", async () => {
    const pathname = await stage("orphan.pdf");
    const res = await application.POST(
      json("http://test/x", "POST", { pathname }), params(999999)
    );
    expect(res.status).toBe(404);
  });
});

maybe("asking for a signed upload link", () => {
  it("gives one back for an allowed file type", async () => {
    const res = await presign.POST(json("http://test/x", "POST", {
      kind: "cert-doc", filename: "scan.pdf", contentType: "application/pdf", size: 1024,
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toMatch(/^https?:\/\//);
    // The server decides where the file goes, never the caller.
    expect(body.pathname.startsWith("documents/")).toBe(true);
  });

  it("refuses a file type that is not allowed", async () => {
    const res = await presign.POST(json("http://test/x", "POST", {
      kind: "cert-doc", filename: "payload.exe",
      contentType: "application/x-msdownload", size: 1024,
    }));
    expect(res.status).toBe(400);
  });

  it("refuses a file over the size limit before it is sent", async () => {
    const res = await presign.POST(json("http://test/x", "POST", {
      kind: "cert-doc", filename: "huge.pdf", contentType: "application/pdf",
      size: 200 * 1024 * 1024,
    }));
    expect(res.status).toBe(400);
  });

  it("refuses an upload kind it does not know", async () => {
    const res = await presign.POST(json("http://test/x", "POST", {
      kind: "something-else", filename: "x.pdf", contentType: "application/pdf", size: 10,
    }));
    expect(res.status).toBe(400);
  });

  it("ignores a path the caller tries to choose", async () => {
    const res = await presign.POST(json("http://test/x", "POST", {
      kind: "cert-doc", filename: "../../escape.pdf",
      contentType: "application/pdf", size: 10,
    }));
    if (res.status === 200) {
      const { pathname } = await res.json();
      expect(pathname.startsWith("documents/")).toBe(true);
      expect(pathname).not.toContain("..");
    }
  });
});

maybe("recording a waiver signed on paper", () => {
  it("files a scan against a person and marks the waiver signed", async () => {
    const paper = await import("@/app/api/waivers/paper/route.js");
    const key = `waivers/paper-${TEST_PREFIX}-${Date.now()}.pdf`;
    await put(key, Buffer.from("%PDF-1.4 signed on paper\n"), { contentType: "application/pdf" });
    uploaded.push(key);
    const res = await paper.POST(
      json("http://test/x", "POST", { person_id: personId, pathname: key })
    );
    expect(res.status).toBeLessThan(300);
    const row = await query(
      "SELECT status FROM waivers WHERE person_id = ? ORDER BY id DESC LIMIT 1", [personId]
    );
    expect(row[0].status).toBe("signed");
    await query("DELETE FROM waivers WHERE person_id = ?", [personId]);
  });

  it("refuses a scan filed outside the waivers folder", async () => {
    const paper = await import("@/app/api/waivers/paper/route.js");
    const res = await paper.POST(
      json("http://test/x", "POST", { person_id: personId, pathname: "documents/not-a-waiver.pdf" })
    );
    expect(res.status).toBe(400);
  });

  it("refuses a scan with nobody to attach it to", async () => {
    const paper = await import("@/app/api/waivers/paper/route.js");
    const res = await paper.POST(json("http://test/x", "POST", { pathname: "waivers/paper-x.pdf" }));
    expect(res.status).toBe(400);
  });
});

maybe("a person's photo", () => {
  it("is accepted and attached to the record", async () => {
    const picture = await import("@/app/api/people/[id]/picture/route.js");
    const form = new FormData();
    form.append("file", new File([Buffer.from("\x89PNG\r\n\x1a\n")], "face.png", { type: "image/png" }));
    const res = await picture.POST(
      new Request("http://test/x", { method: "POST", body: form }), params(personId)
    );
    expect(res.status).toBeLessThan(300);
  });

  it("refuses something that is not an image", async () => {
    const picture = await import("@/app/api/people/[id]/picture/route.js");
    const form = new FormData();
    form.append("file", new File([Buffer.from("MZ")], "payload.exe", { type: "application/x-msdownload" }));
    const res = await picture.POST(
      new Request("http://test/x", { method: "POST", body: form }), params(personId)
    );
    expect(res.status).toBe(400);
  });
});

describe("legacy training documents stay readable", () => {
  // The upload slot is gone, but a few records still carry a training document
  // from before that change. Removing the reader would strand those files.
  it("the endpoint still offers a way to open one", async () => {
    const training = await import("@/app/api/certifications/[id]/training/route.js");
    expect(typeof training.GET).toBe("function");
    expect(training.POST, "uploading a new training document should no longer be possible").toBeUndefined();
  });
});
