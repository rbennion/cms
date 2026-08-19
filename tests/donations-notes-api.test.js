import { describe, it, expect, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

const donations = await import("@/app/api/donations/route.js");
const donation = await import("@/app/api/donations/[id]/route.js");
const donationStats = await import("@/app/api/donations/stats/route.js");
const notes = await import("@/app/api/notes/route.js");
const note = await import("@/app/api/notes/[id]/route.js");
const people = await import("@/app/api/people/route.js");
const dashboard = await import("@/app/api/dashboard/stats/route.js");

const rows = (b) => (Array.isArray(b) ? b : b.data || []);
let personId, donationId, noteId;

afterAll(async () => { await cleanupTestRecords(); });

describe("donations", () => {
  it("creates a person to donate", async () => {
    const res = await people.POST(json("http://test/api/people", "POST", {
      first_name: `${TEST_PREFIX}Donor`, last_name: "Person",
      email: "zztest.donor@example.invalid", phone: "555-0103",
    }));
    personId = (await res.json()).id;
  });

  it("records a donation on the day it was given", async () => {
    // The reported bug: picking the 7th recorded the 6th.
    const res = await donations.POST(json("http://test/api/donations", "POST", {
      amount: 250.5, date: "2026-07-07", person_id: personId, note: `${TEST_PREFIX} gift`,
    }));
    expect(res.status).toBeLessThan(300);
    const body = await res.json();
    donationId = body.id;
    expect(body.date).toBe("2026-07-07");
  });

  it("reads the donation back with the same date", async () => {
    const res = await donation.GET(new Request("http://test/x"), params(donationId));
    const body = await res.json();
    expect(body.date).toBe("2026-07-07");
    expect(Number(body.amount)).toBeCloseTo(250.5, 2);
  });

  it("lists donations with the donor attached", async () => {
    const res = await donations.GET(new Request("http://test/api/donations?limit=50"));
    expect(res.status).toBe(200);
    const mine = rows(await res.json()).find((d) => d.id === donationId);
    expect(mine).toBeTruthy();
  });

  it("saves an edited amount and date", async () => {
    const res = await donation.PUT(
      json("http://test/x", "PUT", {
        amount: 300, date: "2026-12-31", person_id: personId, note: `${TEST_PREFIX} gift`,
      }),
      params(donationId)
    );
    expect(res.status).toBeLessThan(300);
    const after = await (await donation.GET(new Request("http://test/x"), params(donationId))).json();
    expect(after.date).toBe("2026-12-31");
    expect(Number(after.amount)).toBeCloseTo(300, 2);
  });

  it("reports totals", async () => {
    const res = await donationStats.GET(new Request("http://test/api/donations/stats"));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeTruthy();
  });

  it("deletes the donation", async () => {
    const res = await donation.DELETE(new Request("http://test/x", { method: "DELETE" }), params(donationId));
    expect(res.status).toBeLessThan(300);
    const gone = await donation.GET(new Request("http://test/x"), params(donationId));
    expect(gone.status).toBe(404);
  });
});

describe("notes", () => {
  it("requires something to be written", async () => {
    const res = await notes.POST(json("http://test/api/notes", "POST", {
      entity_type: "person", entity_id: personId,
    }));
    expect(res.status).toBe(400);
  });

  it("requires a record to attach to", async () => {
    const res = await notes.POST(json("http://test/api/notes", "POST", {
      content: `${TEST_PREFIX} orphan`, entity_type: "person",
    }));
    expect(res.status).toBe(400);
  });

  it("rejects a record type it does not know", async () => {
    const res = await notes.POST(json("http://test/api/notes", "POST", {
      content: `${TEST_PREFIX} bad type`, entity_type: "banana", entity_id: personId,
    }));
    expect(res.status).toBe(400);
  });

  it("writes a note, dated today by default", async () => {
    const res = await notes.POST(json("http://test/api/notes", "POST", {
      content: `${TEST_PREFIX} a proper note`, entity_type: "person", entity_id: personId,
    }));
    expect(res.status).toBeLessThan(300);
    const body = await res.json();
    noteId = body.id;
    expect(body.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("edits a note", async () => {
    const res = await note.PUT(
      json("http://test/x", "PUT", { content: `${TEST_PREFIX} edited`, title: "Updated" }),
      params(noteId)
    );
    expect(res.status).toBeLessThan(300);
  });

  it("deletes a note", async () => {
    const res = await note.DELETE(new Request("http://test/x", { method: "DELETE" }), params(noteId));
    expect(res.status).toBeLessThan(300);
  });
});

describe("dashboard", () => {
  it("returns the headline figures", async () => {
    const res = await dashboard.GET(new Request("http://test/api/dashboard/stats"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body).toBe("object");
  });
});
