import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

// Saved views and exports read the signed-in user directly rather than through
// the shared helper, so the session has to be stubbed at that source too.
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: String(globalThis.__testUserId ?? 1), email: "test@example.invalid", isAdmin: true } }),
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const personTypes = await import("@/app/api/person-types/route.js");
const personType = await import("@/app/api/person-types/[id]/route.js");
const roles = await import("@/app/api/roles/route.js");
const role = await import("@/app/api/roles/[id]/route.js");
const stages = await import("@/app/api/engagement-stages/route.js");
const stage = await import("@/app/api/engagement-stages/[id]/route.js");
const waivers = await import("@/app/api/waivers/route.js");
const savedViews = await import("@/app/api/saved-views/route.js");
const releaseNotes = await import("@/app/api/release-notes/route.js");
const exportRoute = await import("@/app/api/export/route.js");

const { run, query } = await import("@/lib/db");
const rows = (b) => (Array.isArray(b) ? b : b.data || []);

// A saved view belongs to a user, so the test database needs one that matches
// the stubbed session. The test database starts empty.
let userId;
beforeAll(async () => {
  const existing = await query("SELECT id FROM users WHERE email = ?", ["test@example.invalid"]);
  userId = existing[0]?.id
    ?? (await run(
      "INSERT INTO users (email, password_hash, name, is_active, is_admin) VALUES (?, ?, ?, TRUE, TRUE)",
      ["test@example.invalid", "not-a-real-hash", "Test User"]
    )).lastInsertRowid;
  globalThis.__testUserId = userId;
});

afterAll(async () => {
  await query("DELETE FROM saved_views WHERE name LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM users WHERE email = ?", ["test@example.invalid"]);
  await cleanupTestRecords();
});

// The three simple reference lists behave identically, so they are covered the
// same way rather than three near-identical blocks.
const referenceLists = [
  { label: "person types", list: personTypes, one: personType, field: "name" },
  { label: "roles", list: roles, one: role, field: "name" },
  { label: "engagement stages", list: stages, one: stage, field: "name" },
];

for (const { label, list, one, field } of referenceLists) {
  describe(label, () => {
    let id;

    it("lists what already exists", async () => {
      const res = await list.GET(new Request("http://test/x"));
      expect(res.status).toBe(200);
      expect(Array.isArray(rows(await res.json()))).toBe(true);
    });

    it("adds one", async () => {
      const res = await list.POST(json("http://test/x", "POST", { [field]: `${TEST_PREFIX} Entry` }));
      expect(res.status).toBeLessThan(300);
      id = (await res.json()).id;
      expect(id).toBeTruthy();
    });

    it("renames it", async () => {
      const res = await one.PUT(
        json("http://test/x", "PUT", { [field]: `${TEST_PREFIX} Renamed` }), params(id)
      );
      expect(res.status).toBeLessThan(300);
    });

    it("removes it", async () => {
      const res = await one.DELETE(new Request("http://test/x", { method: "DELETE" }), params(id));
      expect(res.status).toBeLessThan(300);
      const after = rows(await (await list.GET(new Request("http://test/x"))).json());
      expect(after.some((r) => r.id === id)).toBe(false);
    });
  });
}

describe("waivers — reading only, nothing is sent", () => {
  // Sending a waiver emails a real parent from the real mailbox. These tests
  // deliberately never call the send or resend endpoints.
  it("lists waivers with their status", async () => {
    const res = await waivers.GET(new Request("http://test/api/waivers"));
    expect(res.status).toBe(200);
    const list = rows(await res.json());
    expect(Array.isArray(list)).toBe(true);
    for (const w of list) {
      expect(["pending", "signed", "expired", "revoked"]).toContain(w.status);
    }
  });

  it("does not leak the signing token", async () => {
    // Only the hash is stored; the raw token must never come back over the API,
    // or anyone with list access could sign on a parent's behalf.
    const res = await waivers.GET(new Request("http://test/api/waivers"));
    const body = JSON.stringify(await res.json());
    expect(body).not.toMatch(/"token"\s*:/);
  });
});

describe("saved views", () => {
  let id;

  it("saves a view", async () => {
    const res = await savedViews.POST(json("http://test/x", "POST", {
      name: `${TEST_PREFIX} Donors`, entity_type: "people", filter_state: { role: "Donor" },
    }));
    expect(res.status).toBeLessThan(300);
    id = (await res.json()).id;
  });

  it("lists it back", async () => {
    const res = await savedViews.GET(new Request("http://test/api/saved-views?entity_type=people"));
    expect(rows(await res.json()).some((v) => v.id === id)).toBe(true);
  });
});

describe("exports", () => {
  it("exports people as a spreadsheet file", async () => {
    const res = await exportRoute.GET(new Request("http://test/api/export?entityType=people"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/csv/i);
    const text = await res.text();
    expect(text.split("\n")[0]).toMatch(/name|email/i);
  });

  it("exports each of the other record types", async () => {
    for (const entity of ["companies", "schools", "groups", "donations"]) {
      const res = await exportRoute.GET(new Request(`http://test/api/export?entityType=${entity}`));
      expect(res.status, `${entity} export failed`).toBe(200);
    }
  });

  it("narrows the export when a search is applied", async () => {
    // The test database is otherwise empty, so give the export something to cut.
    for (const n of ["Alpha", "Beta", "Gamma"]) {
      await run("INSERT INTO people (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)",
        [`${TEST_PREFIX}${n}`, "Exportable", `zztest.${n.toLowerCase()}@example.invalid`, "555-0104"]);
    }
    const all = await (await exportRoute.GET(new Request("http://test/api/export?entityType=people"))).text();
    const filtered = await (
      await exportRoute.GET(new Request("http://test/api/export?entityType=people&filters=%7B%22search%22%3A%22zzz-nobody-matches-this%22%7D"))
    ).text();
    expect(filtered.split("\n").length).toBeLessThan(all.split("\n").length);
  });
});

describe("release notes", () => {
  it("serves the current version's notes", async () => {
    const res = await releaseNotes.GET(new Request("http://test/api/release-notes"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain("0.9.4");
  });
});
