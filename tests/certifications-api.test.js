import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

// Sign-in is not what these tests are about, so it is stubbed. Everything below
// exercises the real handler against a real database.
vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

const { POST, GET } = await import("@/app/api/certifications/route.js");
const { run, get, query } = await import("@/lib/db");

const post = (body) =>
  POST(
    new Request("http://test/api/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );

let personId;

beforeAll(async () => {
  const res = await run(
    "INSERT INTO people (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)",
    ["ZZTest", "Certification", "zztest.cert@example.invalid", "555-0100"]
  );
  personId = res.lastInsertRowid;
});

afterAll(async () => {
  await query("DELETE FROM certifications WHERE person_id = ?", [personId]);
  await query("DELETE FROM people WHERE id = ?", [personId]);
});

describe("saving a certification checklist", () => {
  it("creates the record on the first save", async () => {
    const res = await post({ person_id: personId, application_received: true });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.person_id).toBe(personId);
    expect(body.application_received).toBe(1);
  });

  it("updates the same record on the next save, rather than making a second", async () => {
    const res = await post({ person_id: personId, qpr_gatekeeper_training: true });
    expect(res.status).toBe(200);
    const rows = await query("SELECT id FROM certifications WHERE person_id = ?", [personId]);
    expect(rows.length).toBe(1);
  });

  it("leaves fields alone when they are not part of the save", async () => {
    // This is what a single checkbox click sends. Everything else must survive.
    const res = await post({ person_id: personId, background_check_status: "approved" });
    const body = await res.json();
    expect(body.application_received).toBe(1);      // set earlier
    expect(body.qpr_gatekeeper_training).toBe(1);   // set earlier
    expect(body.background_check_status).toBe("approved");
  });

  it("keeps the passed flag in step with the status", async () => {
    let body = await (await post({ person_id: personId, background_check_status: "approved" })).json();
    expect(body.background_check_passed).toBe(true);
    body = await (await post({ person_id: personId, background_check_status: "denied" })).json();
    expect(body.background_check_passed).toBe(false);
  });

  it("saves all three dates — the ones that used to fail outright", async () => {
    const body = await (
      await post({
        person_id: personId,
        background_check_date: "2026-05-01",
        qpr_training_date: "2026-07-07",
        qpr_training_renewal_date: "2027-07-07",
      })
    ).json();
    expect(body.background_check_date).toBe("2026-05-01");
    expect(body.qpr_training_date).toBe("2026-07-07");        // the 7th, not the 6th
    expect(body.qpr_training_renewal_date).toBe("2027-07-07");
  });

  it("clears a date when it is emptied", async () => {
    const body = await (await post({ person_id: personId, qpr_training_date: null })).json();
    expect(body.qpr_training_date).toBeNull();
  });

  it("computes when the background check expires", async () => {
    const body = await (
      await post({ person_id: personId, background_check_status: "approved", background_check_date: "2026-05-01" })
    ).json();
    expect(body.background_check_expires_at).toBe("2028-05-01");
  });

  it("survives two saves landing at once", async () => {
    // Two controls changed in quick succession used to collide while the record
    // was still being created, and one save was lost.
    await query("DELETE FROM certifications WHERE person_id = ?", [personId]);
    const [a, b] = await Promise.all([
      post({ person_id: personId, application_received: true }),
      post({ person_id: personId, qpr_gatekeeper_training: true }),
    ]);
    expect([a.status, b.status].every((s) => s < 400)).toBe(true);
    const rows = await query("SELECT id FROM certifications WHERE person_id = ?", [personId]);
    expect(rows.length, "a duplicate record was created").toBe(1);
  });

  it("refuses a save with no person", async () => {
    expect((await post({ application_received: true })).status).toBe(400);
  });

  it("refuses a save for someone who does not exist", async () => {
    expect((await post({ person_id: -1, application_received: true })).status).toBe(404);
  });
});

describe("reading the certification roster", () => {
  it("returns records with the person attached", async () => {
    const res = await GET(new Request("http://test/api/certifications"));
    expect(res.status).toBe(200);
    const rows = await res.json();
    expect(Array.isArray(rows)).toBe(true);
    const mine = rows.find((r) => r.person_id === personId);
    expect(mine.first_name).toBe("ZZTest");
  });

  it("filters by background check status", async () => {
    const res = await GET(new Request("http://test/api/certifications?background_check_status=approved"));
    const rows = await res.json();
    expect(rows.every((r) => r.background_check_status === "approved")).toBe(true);
  });
});
