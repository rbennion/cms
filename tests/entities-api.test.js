import { describe, it, expect, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

const companies = await import("@/app/api/companies/route.js");
const company = await import("@/app/api/companies/[id]/route.js");
const companyPeople = await import("@/app/api/companies/[id]/people/route.js");
const schools = await import("@/app/api/schools/route.js");
const school = await import("@/app/api/schools/[id]/route.js");
const schoolPeople = await import("@/app/api/schools/[id]/people/route.js");
const groups = await import("@/app/api/groups/route.js");
const group = await import("@/app/api/groups/[id]/route.js");
const students = await import("@/app/api/groups/[id]/students/route.js");
const parents = await import("@/app/api/groups/[id]/parents/route.js");
const people = await import("@/app/api/people/route.js");
const personRoute = await import("@/app/api/people/[id]/route.js");
const personGroups = await import("@/app/api/people/[id]/groups/route.js");

const rows = (body) => (Array.isArray(body) ? body : body.data || []);

let companyId, schoolId, groupId, personId;

afterAll(async () => { await cleanupTestRecords(); });

describe("companies", () => {
  it("creates one", async () => {
    const res = await companies.POST(json("http://test/api/companies", "POST", {
      name: `${TEST_PREFIX} Widgets Ltd`, city: "Topeka", state: "KS",
    }));
    expect(res.status).toBeLessThan(300);
    companyId = (await res.json()).id;
    expect(companyId).toBeTruthy();
  });

  it("lists and searches", async () => {
    const res = await companies.GET(new Request(`http://test/api/companies?search=${TEST_PREFIX}`));
    expect(rows(await res.json()).some((c) => c.id === companyId)).toBe(true);
  });

  it("reads one back", async () => {
    const res = await company.GET(new Request("http://test/x"), params(companyId));
    expect(res.status).toBe(200);
    expect((await res.json()).name).toContain(TEST_PREFIX);
  });

  it("saves an edit", async () => {
    const res = await company.PUT(
      json("http://test/x", "PUT", { name: `${TEST_PREFIX} Widgets Renamed`, city: "Wichita" }),
      params(companyId)
    );
    expect(res.status).toBeLessThan(300);
    const after = await (await company.GET(new Request("http://test/x"), params(companyId))).json();
    expect(after.name).toContain("Renamed");
  });
});

describe("schools", () => {
  it("creates one", async () => {
    const res = await schools.POST(json("http://test/api/schools", "POST", {
      name: `${TEST_PREFIX} High School`, city: "Olathe", state: "KS",
    }));
    expect(res.status).toBeLessThan(300);
    schoolId = (await res.json()).id;
  });

  it("lists it", async () => {
    const res = await schools.GET(new Request("http://test/api/schools"));
    expect(rows(await res.json()).some((s) => s.id === schoolId)).toBe(true);
  });

  it("saves an edit", async () => {
    const res = await school.PUT(
      json("http://test/x", "PUT", { name: `${TEST_PREFIX} High Renamed` }),
      params(schoolId)
    );
    expect(res.status).toBeLessThan(300);
  });
});

describe("groups", () => {
  it("creates one under a school", async () => {
    const res = await groups.POST(json("http://test/api/groups", "POST", {
      school_id: schoolId, name: `${TEST_PREFIX} Girls 2026`, gender: "Girls", year: 2026,
    }));
    expect(res.status).toBeLessThan(300);
    groupId = (await res.json()).id;
    expect(groupId).toBeTruthy();
  });

  it("rejects a gender the system does not recognise", async () => {
    const res = await groups.POST(json("http://test/api/groups", "POST", {
      school_id: schoolId, name: `${TEST_PREFIX} Bad`, gender: "Other", year: 2026,
    }));
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("reads one back with its school", async () => {
    const res = await group.GET(new Request("http://test/x"), params(groupId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.school_id).toBe(schoolId);
  });
});

describe("people joined to companies, schools and groups", () => {
  it("creates a person to attach", async () => {
    const res = await people.POST(json("http://test/api/people", "POST", {
      first_name: `${TEST_PREFIX}Joiner`, last_name: "Person",
      email: "zztest.joiner@example.invalid", phone: "555-0102",
    }));
    personId = (await res.json()).id;
    expect(personId).toBeTruthy();
  });

  it("adds the person to a company, and it shows from the company side", async () => {
    const res = await companyPeople.POST(
      json("http://test/x", "POST", { person_id: personId }), params(companyId)
    );
    expect(res.status).toBeLessThan(300);
    // Associations are read back through the parent record, not the join endpoint.
    const body = await (await company.GET(new Request("http://test/x"), params(companyId))).json();
    expect(rows(body.people || []).some((p) => p.id === personId)).toBe(true);
  });

  it("adds the person to a school", async () => {
    const res = await schoolPeople.POST(
      json("http://test/x", "POST", { person_id: personId }), params(schoolId)
    );
    expect(res.status).toBeLessThan(300);
    const body = await (await school.GET(new Request("http://test/x"), params(schoolId))).json();
    expect(rows(body.people || []).some((p) => p.id === personId)).toBe(true);
  });

  it("adds the person to a group as a student", async () => {
    const res = await students.POST(
      json("http://test/x", "POST", { person_id: personId }), params(groupId)
    );
    expect(res.status).toBeLessThan(300);
  });

  it("shows the group membership on the person's own record", async () => {
    const body = await (await personRoute.GET(new Request("http://test/x"), params(personId))).json();
    expect(rows(body.groups || []).some((g) => g.id === groupId || g.group_id === groupId)).toBe(true);
  });

  it("refuses to add the same person to the same group twice", async () => {
    const res = await personGroups.POST(
      json("http://test/x", "POST", { group_id: groupId, role: "Student" }), params(personId)
    );
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("adds a parent to the group", async () => {
    const res = await parents.POST(
      json("http://test/x", "POST", { person_id: personId }), params(groupId)
    );
    expect(res.status).toBeLessThan(300);
  });

  it("removes the person from the company again", async () => {
    const res = await companyPeople.DELETE(
      json("http://test/x", "DELETE", { person_id: personId }), params(companyId)
    );
    expect(res.status).toBeLessThan(300);
    const body = await (await company.GET(new Request("http://test/x"), params(companyId))).json();
    expect(rows(body.people || []).some((p) => p.id === personId)).toBe(false);
  });
});

describe("deleting a record takes its notes with it", () => {
  // Notes are attached by type and id, with no database relationship to enforce
  // it, so this is the only thing standing between a deleted record and notes
  // about it lingering in the system.
  it("company notes go when the company goes", async () => {
    const { query, run } = await import("@/lib/db");
    const created = await companies.POST(json("http://test/api/companies", "POST", {
      name: `${TEST_PREFIX} Doomed Ltd`,
    }));
    const id = (await created.json()).id;
    await run(
      "INSERT INTO notes (content, entity_type, entity_id) VALUES (?, 'company', ?)",
      [`${TEST_PREFIX} note about a company`, id]
    );
    await company.DELETE(new Request("http://test/x", { method: "DELETE" }), params(id));
    const left = await query(
      "SELECT id FROM notes WHERE entity_type = 'company' AND entity_id = ?", [id]
    );
    expect(left.length).toBe(0);
  });
});
