import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

// Signing on the spot: no email goes out, the link comes back to the staff
// member, and the same public signing page completes it.
vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "1", isAdmin: true } }),
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const inPerson = await import("@/app/api/waivers/in-person/route.js");
const reopen = await import("@/app/api/waivers/[id]/in-person/route.js");
const sign = await import("@/app/api/sign/[token]/route.js");
const waivers = await import("@/app/api/waivers/route.js");
const people = await import("@/app/api/people/route.js");
const { query } = await import("@/lib/db");
const { deriveWaiverStatus } = await import("@/lib/waivers");

const tokenOf = (url) => url.split("/sign/")[1];
const PNG = "data:image/png;base64,iVBORw0KGgo=";

let personId, waiverId, signingUrl;

beforeAll(async () => {
  const p = await people.POST(json("http://test/api/people", "POST", {
    first_name: `${TEST_PREFIX}InPerson`, last_name: "Student",
    email: "zztest.inperson@example.invalid", phone: "555-0301",
  }));
  personId = (await p.json()).id;
});

afterAll(async () => {
  await query("DELETE FROM waivers WHERE person_id = ?", [personId]);
  await cleanupTestRecords();
});

describe("starting an in-person waiver", () => {
  it("creates a pending waiver with a link and no email", async () => {
    const res = await inPerson.POST(json("http://test/x", "POST", { person_id: personId }));
    expect(res.status).toBe(201);
    const body = await res.json();
    waiverId = body.waiver_id;
    signingUrl = body.signing_url;
    expect(signingUrl).toContain("/sign/");

    const list = await (await waivers.GET(new Request(`http://test/x?person_id=${personId}`))).json();
    const w = list.waivers.find((x) => x.id === waiverId);
    expect(w.source).toBe("in_person");
    expect(w.sent_to_email).toBeNull();
    expect(w.status).toBe("pending");
    expect(deriveWaiverStatus(w).label).toBe("Ready to Sign");
  });

  it("expires within a day", async () => {
    const list = await (await waivers.GET(new Request(`http://test/x?person_id=${personId}`))).json();
    const w = list.waivers.find((x) => x.id === waiverId);
    const hours = (new Date(w.expires_at) - Date.now()) / 36e5;
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThanOrEqual(24);
  });

  it("rejects an unknown person", async () => {
    const res = await inPerson.POST(json("http://test/x", "POST", { person_id: 999999999 }));
    expect(res.status).toBe(404);
  });

  it("re-opening hands back a new link and retires the old one", async () => {
    const res = await reopen.POST(new Request("http://test/x", { method: "POST" }), params(waiverId));
    expect(res.status).toBe(200);
    const fresh = (await res.json()).signing_url;
    expect(fresh).not.toBe(signingUrl);

    const old = await sign.GET(new Request("http://test/x"), { params: { token: tokenOf(signingUrl) } });
    expect(old.status).toBe(404);
    signingUrl = fresh;
  });
});

describe("signing it on the spot", () => {
  it("the public signing page completes the waiver", async () => {
    const res = await sign.POST(
      json("http://test/x", "POST", {
        liability_release_choice: "release",
        photo_release_choice: "allow",
        signer_name: "Test Guardian",
        signature_png: PNG,
      }),
      { params: { token: tokenOf(signingUrl) } }
    );
    expect(res.status).toBe(200);

    const list = await (await waivers.GET(new Request(`http://test/x?person_id=${personId}`))).json();
    const w = list.waivers.find((x) => x.id === waiverId);
    expect(w.status).toBe("signed");
    expect(deriveWaiverStatus(w).sentence).toContain("in person");
  });

  it("cannot be re-opened once signed", async () => {
    const res = await reopen.POST(new Request("http://test/x", { method: "POST" }), params(waiverId));
    expect(res.status).toBe(409);
  });

  it("re-open refuses emailed waivers", async () => {
    const { run } = await import("@/lib/db");
    const emailed = await run(
      `INSERT INTO waivers (person_id, token_hash, status, sent_to_email) VALUES (?, 'x', 'pending', 'a@b.c')`,
      [personId]
    );
    const res = await reopen.POST(new Request("http://test/x", { method: "POST" }), params(emailed.lastInsertRowid));
    expect(res.status).toBe(400);
  });
});
