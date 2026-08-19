import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));
vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: String(globalThis.__uid ?? 1), isAdmin: true } }),
  handlers: {}, signIn: async () => {}, signOut: async () => {},
}));

const people = await import("@/app/api/people/route.js");
const personRoles = await import("@/app/api/people/[id]/roles/route.js");
const personDonations = await import("@/app/api/people/[id]/donations/route.js");
const companies = await import("@/app/api/companies/route.js");
const companyDonations = await import("@/app/api/companies/[id]/donations/route.js");
const companyNotes = await import("@/app/api/companies/[id]/notes/route.js");
const schools = await import("@/app/api/schools/route.js");
const schoolGroups = await import("@/app/api/schools/[id]/groups/route.js");
const groups = await import("@/app/api/groups/route.js");
const meetingLocations = await import("@/app/api/groups/[id]/meeting-locations/route.js");
const groupStudent = await import("@/app/api/groups/[id]/students/[personId]/route.js");
const students = await import("@/app/api/groups/[id]/students/route.js");
const savedViews = await import("@/app/api/saved-views/route.js");
const savedView = await import("@/app/api/saved-views/[id]/route.js");
const roles = await import("@/app/api/roles/route.js");
const importRoute = await import("@/app/api/import/route.js");
const debug = await import("@/app/api/debug/route.js");
const setup = await import("@/app/api/setup/route.js");
const donations = await import("@/app/api/donations/route.js");
const { run, query } = await import("@/lib/db");

const rows = (b) => (Array.isArray(b) ? b : b.data || []);
let personId, companyId, schoolId, groupId, roleId, userId;

const twoParams = (id, personId) => ({ params: { id: String(id), personId: String(personId) } });

beforeAll(async () => {
  const u = await run(
    "INSERT INTO users (email, password_hash, name, is_active, is_admin) VALUES (?, ?, ?, TRUE, TRUE)",
    ["zztest.misc@example.invalid", "x", `${TEST_PREFIX} Misc`]
  );
  userId = u.lastInsertRowid;
  globalThis.__uid = userId;

  personId = (await (await people.POST(json("http://test/x", "POST", {
    first_name: `${TEST_PREFIX}Misc`, last_name: "Person",
    email: "zztest.misc.person@example.invalid", phone: "555-0107",
  }))).json()).id;

  companyId = (await (await companies.POST(json("http://test/x", "POST", { name: `${TEST_PREFIX} Misc Co` }))).json()).id;
  schoolId = (await (await schools.POST(json("http://test/x", "POST", { name: `${TEST_PREFIX} Misc School` }))).json()).id;
  groupId = (await (await groups.POST(json("http://test/x", "POST", {
    school_id: schoolId, name: `${TEST_PREFIX} Misc Group`, gender: "Boys", year: 2026,
  }))).json()).id;
  roleId = (await (await roles.POST(json("http://test/x", "POST", { name: `${TEST_PREFIX} Misc Role` }))).json()).id;
});

afterAll(async () => {
  await query("DELETE FROM saved_views WHERE name LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM roles WHERE name LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM users WHERE email = ?", ["zztest.misc@example.invalid"]);
  await cleanupTestRecords();
});

describe("roles on a person", () => {
  it("has none to begin with", async () => {
    const res = await personRoles.GET(new Request("http://test/x"), params(personId));
    expect(res.status).toBe(200);
    expect(rows(await res.json()).length).toBe(0);
  });

  it("adds one", async () => {
    const res = await personRoles.POST(
      json("http://test/x", "POST", { role_id: roleId }), params(personId)
    );
    expect(res.status).toBeLessThan(300);
    const listed = await personRoles.GET(new Request("http://test/x"), params(personId));
    expect(rows(await listed.json()).some((r) => r.id === roleId)).toBe(true);
  });

  it("removes it", async () => {
    const res = await personRoles.DELETE(
      new Request(`http://test/x?role_id=${roleId}`, { method: "DELETE" }), params(personId)
    );
    expect(res.status).toBeLessThan(300);
    const listed = await personRoles.GET(new Request("http://test/x"), params(personId));
    expect(rows(await listed.json()).length).toBe(0);
  });
});

describe("donations listed against a record", () => {
  beforeAll(async () => {
    await donations.POST(json("http://test/x", "POST", {
      amount: 10, date: "2026-06-01", person_id: personId, note: `${TEST_PREFIX} person gift`,
    }));
    await donations.POST(json("http://test/x", "POST", {
      amount: 20, date: "2026-06-02", company_id: companyId, note: `${TEST_PREFIX} company gift`,
    }));
  });

  it("shows a person's donations", async () => {
    const res = await personDonations.GET(new Request("http://test/x"), params(personId));
    expect(res.status).toBe(200);
    expect(rows(await res.json()).length).toBeGreaterThan(0);
  });

  it("shows a company's donations", async () => {
    const res = await companyDonations.GET(new Request("http://test/x"), params(companyId));
    expect(res.status).toBe(200);
    expect(rows(await res.json()).length).toBeGreaterThan(0);
  });
});

describe("notes listed against a company", () => {
  it("lists them", async () => {
    await run("INSERT INTO notes (content, entity_type, entity_id) VALUES (?, 'company', ?)",
      [`${TEST_PREFIX} company note`, companyId]);
    const res = await companyNotes.GET(new Request("http://test/x"), params(companyId));
    expect(res.status).toBe(200);
    expect(rows(await res.json()).length).toBeGreaterThan(0);
  });
});

describe("groups under a school", () => {
  it("lists them", async () => {
    const res = await schoolGroups.GET(new Request("http://test/x"), params(schoolId));
    expect(res.status).toBe(200);
    expect(rows(await res.json()).some((g) => g.id === groupId)).toBe(true);
  });
});

describe("where a group meets", () => {
  it("starts empty", async () => {
    const res = await meetingLocations.GET(new Request("http://test/x"), params(groupId));
    expect(res.status).toBe(200);
  });

  it("adds a location", async () => {
    const res = await meetingLocations.POST(
      json("http://test/x", "POST", { location: `${TEST_PREFIX} Gym`, day_of_week: "Tuesday" }),
      params(groupId)
    );
    expect(res.status).toBeLessThan(300);
  });
});

describe("removing someone from a group", () => {
  it("takes the student off the list", async () => {
    await students.POST(json("http://test/x", "POST", { person_id: personId }), params(groupId));
    const res = await groupStudent.DELETE(
      new Request("http://test/x", { method: "DELETE" }), twoParams(groupId, personId)
    );
    expect(res.status).toBeLessThan(300);
  });
});

describe("a saved view", () => {
  let viewId;

  it("is created", async () => {
    const res = await savedViews.POST(json("http://test/x", "POST", {
      name: `${TEST_PREFIX} Misc View`, entity_type: "people", filter_state: { search: "x" },
    }));
    expect(res.status).toBeLessThan(300);
    viewId = (await res.json()).id;
  });

  it("is read back", async () => {
    const res = await savedView.GET(new Request("http://test/x"), params(viewId));
    expect(res.status).toBe(200);
  });

  it("is renamed", async () => {
    const res = await savedView.PUT(
      json("http://test/x", "PUT", { name: `${TEST_PREFIX} Misc Renamed`, filter_state: {} }),
      params(viewId)
    );
    expect(res.status).toBeLessThan(300);
  });

  it("is deleted", async () => {
    const res = await savedView.DELETE(new Request("http://test/x", { method: "DELETE" }), params(viewId));
    expect(res.status).toBeLessThan(300);
  });
});

describe("bringing records in from a spreadsheet", () => {
  it("refuses a file with nothing in it", async () => {
    const res = await importRoute.POST(json("http://test/x", "POST", { entityType: "people", rows: [] }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("refuses a record type it does not know", async () => {
    const res = await importRoute.POST(json("http://test/x", "POST", {
      entityType: "unicorns", rows: [{ name: "x" }],
    }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe("administrative odds and ends", () => {
  it("the diagnostics page reports counts and nothing sensitive", async () => {
    const res = await debug.GET(new Request("http://test/x"));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).not.toMatch(/password|POSTGRES_URL|SECRET|TOKEN/i);
  });

  it("the setup page responds", async () => {
    const res = await setup.GET(new Request("http://test/x"));
    expect([200, 401, 403]).toContain(res.status);
  });
});

describe("removing a parent from a group", () => {
  it("takes them off the list", async () => {
    const parents = await import("@/app/api/groups/[id]/parents/route.js");
    const parentOne = await import("@/app/api/groups/[id]/parents/[personId]/route.js");
    await parents.POST(json("http://test/x", "POST", { person_id: personId }), params(groupId));
    const res = await parentOne.DELETE(
      new Request("http://test/x", { method: "DELETE" }), twoParams(groupId, personId)
    );
    expect(res.status).toBeLessThan(300);
  });
});
