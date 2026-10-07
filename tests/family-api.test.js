import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

// Family links: the label says what the related person is to the person,
// and reads the other way round from the other side. The group page's
// "new student / new parent" flow creates the person, joins the group, and
// makes the labeled link in one call.
vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

const people = await import("@/app/api/people/route.js");
const personRoute = await import("@/app/api/people/[id]/route.js");
const family = await import("@/app/api/people/[id]/family/route.js");
const schools = await import("@/app/api/schools/route.js");
const groups = await import("@/app/api/groups/route.js");
const students = await import("@/app/api/groups/[id]/students/route.js");
const parents = await import("@/app/api/groups/[id]/parents/route.js");
const { get } = await import("@/lib/db");

const familyOf = async (id) => {
  const res = await personRoute.GET(new Request("http://test/x"), params(id));
  return (await res.json()).family_members;
};

const createPerson = async (last) => {
  const res = await people.POST(json("http://test/api/people", "POST", {
    first_name: `${TEST_PREFIX}Fam`, last_name: last,
    email: `zztest.${last.toLowerCase()}@example.invalid`, phone: "555-0200",
  }));
  return (await res.json()).id;
};

let parentId, childId, groupId;

beforeAll(async () => {
  parentId = await createPerson("Parent");
  childId = await createPerson("Child");
  const sch = await schools.POST(json("http://test/api/schools", "POST", {
    name: `${TEST_PREFIX} Family School`, city: "Topeka", state: "KS",
  }));
  const schoolId = (await sch.json()).id;
  const g = await groups.POST(json("http://test/api/groups", "POST", {
    school_id: schoolId, name: `${TEST_PREFIX} Family Group`, gender: "Girls", year: 2026,
  }));
  groupId = (await g.json()).id;
  expect(groupId).toBeTruthy();
});

afterAll(async () => { await cleanupTestRecords(); });

describe("labeled family links", () => {
  it("links with a label and reads it from both sides", async () => {
    const res = await family.POST(
      json("http://test/x", "POST", { related_person_id: parentId, relationship: "parent" }),
      params(childId)
    );
    expect(res.status).toBe(201);

    const fromChild = await familyOf(childId);
    expect(fromChild).toEqual([expect.objectContaining({ id: parentId, relationship: "parent" })]);

    const fromParent = await familyOf(parentId);
    expect(fromParent).toEqual([expect.objectContaining({ id: childId, relationship: "child" })]);
  });

  it("relabels instead of duplicating when linked again from the other side", async () => {
    const res = await family.POST(
      json("http://test/x", "POST", { related_person_id: childId, relationship: "sibling" }),
      params(parentId)
    );
    expect(res.status).toBe(201);
    const row = await get(
      `SELECT COUNT(*)::int AS n FROM family_relationships
       WHERE (person_id = ? AND related_person_id = ?) OR (person_id = ? AND related_person_id = ?)`,
      [parentId, childId, childId, parentId]
    );
    expect(row.n).toBe(1);
    expect((await familyOf(childId))[0].relationship).toBe("sibling");
  });

  it("rejects an unknown label and self-links", async () => {
    const bad = await family.POST(
      json("http://test/x", "POST", { related_person_id: parentId, relationship: "cousin" }),
      params(childId)
    );
    expect(bad.status).toBe(400);
    const self = await family.POST(
      json("http://test/x", "POST", { related_person_id: childId }),
      params(childId)
    );
    expect(self.status).toBe(400);
  });

  it("editing the person's family list keeps existing labels", async () => {
    await family.POST(
      json("http://test/x", "POST", { related_person_id: parentId, relationship: "parent" }),
      params(childId)
    );
    const other = await createPerson("Aunt");
    const res = await personRoute.PUT(
      json("http://test/x", "PUT", { family_member_ids: [parentId, other] }),
      params(childId)
    );
    expect(res.status).toBeLessThan(300);
    const fam = await familyOf(childId);
    expect(fam.find((m) => m.id === parentId).relationship).toBe("parent");
    expect(fam.find((m) => m.id === other).relationship).toBeNull();
  });

  it("unlinks from either side", async () => {
    const res = await family.DELETE(
      new Request(`http://test/x?related_person_id=${childId}`, { method: "DELETE" }),
      params(parentId)
    );
    expect(res.status).toBe(200);
    expect((await familyOf(childId)).some((m) => m.id === parentId)).toBe(false);
  });
});

describe("creating a student or parent from a group", () => {
  let newStudentId, newParentId;

  it("creates a student, adds them to the group, and ties them to a parent", async () => {
    const res = await students.POST(
      json("http://test/x", "POST", {
        new_person: {
          first_name: `${TEST_PREFIX}New`, last_name: "Student",
          email: "zztest.newstudent@example.invalid", phone: "555-0201",
        },
        parent_ids: [parentId],
      }),
      params(groupId)
    );
    expect(res.status).toBe(201);
    newStudentId = (await res.json()).person_id;
    expect(newStudentId).toBeTruthy();

    const listed = await (await students.GET(new Request("http://test/x"), params(groupId))).json();
    expect(listed.some((s) => s.id === newStudentId)).toBe(true);

    const fam = await familyOf(newStudentId);
    expect(fam).toEqual([expect.objectContaining({ id: parentId, relationship: "parent" })]);
  });

  it("creates a parent and ties them to a student as their child", async () => {
    const res = await parents.POST(
      json("http://test/x", "POST", {
        new_person: {
          first_name: `${TEST_PREFIX}New`, last_name: "Parent",
          email: "zztest.newparent@example.invalid", phone: "555-0202",
        },
        student_ids: [newStudentId],
      }),
      params(groupId)
    );
    expect(res.status).toBe(201);
    newParentId = (await res.json()).person_id;

    const listed = await (await parents.GET(new Request("http://test/x"), params(groupId))).json();
    expect(listed.some((p) => p.id === newParentId)).toBe(true);

    const fam = await familyOf(newParentId);
    expect(fam).toEqual([expect.objectContaining({ id: newStudentId, relationship: "child" })]);
  });

  it("refuses a new person missing a last name", async () => {
    const res = await students.POST(
      json("http://test/x", "POST", {
        new_person: { first_name: `${TEST_PREFIX}No`, email: "x@example.invalid", phone: "555-0204" },
      }),
      params(groupId)
    );
    expect(res.status).toBe(400);
  });

  it("creates a new student with no email or phone", async () => {
    const res = await students.POST(
      json("http://test/x", "POST", {
        new_person: { first_name: `${TEST_PREFIX}NoContact`, last_name: "Student" },
      }),
      params(groupId)
    );
    expect(res.status).toBe(201);
    const person = await get("SELECT email, phone FROM people WHERE id = ?", [(await res.json()).person_id]);
    expect(person).toEqual({ email: null, phone: null });
  });

  it("refuses to tie to a parent that does not exist", async () => {
    const res = await students.POST(
      json("http://test/x", "POST", {
        new_person: {
          first_name: `${TEST_PREFIX}Orphan`, last_name: "Student",
          email: "zztest.orphan@example.invalid", phone: "555-0203",
        },
        parent_ids: [999999999],
      }),
      params(groupId)
    );
    expect(res.status).toBe(404);
    const stray = await get("SELECT id FROM people WHERE first_name = ?", [`${TEST_PREFIX}Orphan`]);
    expect(stray).toBeNull();
  });
});
