import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";
import { buildRosterRows, rosterToCsv, rosterFilename, ROSTER_COLUMNS } from "@/lib/group-roster";

// The group roster Brad asked for: one row per student and parent, with notes
// flagging gaps in the contact data.
vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

const people = await import("@/app/api/people/route.js");
const schools = await import("@/app/api/schools/route.js");
const groups = await import("@/app/api/groups/route.js");
const students = await import("@/app/api/groups/[id]/students/route.js");
const parents = await import("@/app/api/groups/[id]/parents/route.js");
const roster = await import("@/app/api/groups/[id]/roster/route.js");
const { run } = await import("@/lib/db");

const person = (id, first, last, email, phone) => ({ id, first_name: first, last_name: last, email, phone });

describe("roster rows", () => {
  const amy = person(1, "Amy", "Stone", "amy@example.com", "555-0001");
  const bo = person(2, "Bo", "Adams", "bo@example.com", "555-0002");
  const mom = person(10, "Jan", "Stone", "jan@example.com", "555-0010");
  const dad = person(11, "Ray", "Stone", "ray@example.com", "555-0011");

  it("gives a student one row per parent, sorted by last name", () => {
    const rows = buildRosterRows({
      students: [amy, bo],
      parents: [mom, dad],
      links: [{ student_id: 1, ...mom }, { student_id: 1, ...dad }],
    });
    expect(rows.map((r) => [r.Student, r.Parent])).toEqual([
      ["Bo Adams", ""],
      ["Amy Stone", "Jan Stone"],
      ["Amy Stone", "Ray Stone"],
    ]);
    expect(rows[0].Notes).toBe("No parent listed");
    expect(rows[1].Notes).toBe("");
  });

  it("flags a shared email, case-insensitively", () => {
    const [r] = buildRosterRows({
      students: [amy],
      links: [{ student_id: 1, ...mom, email: " AMY@example.com" }],
    });
    expect(r.Notes).toBe("Student and parent share the same email");
  });

  it("flags missing contact details on either side", () => {
    const [r] = buildRosterRows({
      students: [{ ...amy, phone: null }],
      links: [{ student_id: 1, ...mom, email: "" }],
    });
    expect(r.Notes).toBe("Student has no phone; Parent has no email");
  });

  it("lists a group parent with no linked student on their own row", () => {
    const rows = buildRosterRows({ students: [amy], parents: [dad], links: [] });
    expect(rows[1]).toMatchObject({
      Student: "",
      Parent: "Ray Stone",
      Notes: "Parent not linked to a student in this group",
    });
  });

  it("quotes values that would break a CSV row", () => {
    const csv = rosterToCsv(buildRosterRows({ students: [person(3, "Al", 'O"Neil, Jr', null, null)] }));
    const [header, line] = csv.split("\n");
    expect(header).toBe(ROSTER_COLUMNS.join(","));
    expect(line.startsWith('"Al O""Neil, Jr",')).toBe(true);
  });

  it("names the file after the group and the day", () => {
    expect(rosterFilename("BMHS 2030", new Date(2026, 8, 20))).toBe("BMHS 2030 roster 2026-09-20.csv");
    expect(rosterFilename("A/B: Boys", new Date(2026, 0, 5))).toBe("A-B- Boys roster 2026-01-05.csv");
  });
});

describe("GET /api/groups/[id]/roster", () => {
  let groupId;

  const createPerson = async (last, email) => {
    const res = await people.POST(json("http://test/api/people", "POST", {
      first_name: `${TEST_PREFIX}Ros`, last_name: last, email, phone: "555-0300",
    }));
    return (await res.json()).id;
  };

  beforeAll(async () => {
    const sch = await schools.POST(json("http://test/api/schools", "POST", {
      name: `${TEST_PREFIX} Roster School`, city: "Topeka", state: "KS",
    }));
    const g = await groups.POST(json("http://test/api/groups", "POST", {
      school_id: (await sch.json()).id, name: `${TEST_PREFIX} Roster Group`, gender: "Boys", year: 2030,
    }));
    groupId = (await g.json()).id;

    const kid = await createPerson("Kid", "zztest.kid@example.invalid");
    const loner = await createPerson("Loner", "zztest.loner@example.invalid");
    const mom = await createPerson("Mom", "zztest.kid@example.invalid");
    const oldLink = await createPerson("OldLink", "zztest.oldlink@example.invalid");
    const stray = await createPerson("Stray", "zztest.stray@example.invalid");

    for (const s of [kid, loner]) {
      await students.POST(json("http://test/x", "POST", { person_id: s }), params(groupId));
    }
    for (const p of [mom, oldLink, stray]) {
      await parents.POST(json("http://test/x", "POST", { person_id: p }), params(groupId));
    }
    // Labeled from the parent's side, and an unlabeled link from before labels.
    await run("INSERT INTO family_relationships (person_id, related_person_id, relationship) VALUES (?, ?, 'child')", [mom, kid]);
    await run("INSERT INTO family_relationships (person_id, related_person_id, relationship) VALUES (?, ?, NULL)", [kid, oldLink]);
  });

  afterAll(async () => { await cleanupTestRecords(); });

  it("downloads the roster as a CSV named after the group", async () => {
    const res = await roster.GET(new Request("http://test/x"), params(groupId));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toMatch(/filename=".+ Roster Group roster \d{4}-\d{2}-\d{2}\.csv"/);

    const lines = (await res.text()).split("\n");
    expect(lines[0]).toBe(ROSTER_COLUMNS.join(","));
    const body = lines.slice(1);
    expect(body).toHaveLength(4);
    expect(body[0]).toMatch(/^ZZTestRos Kid,.*,ZZTestRos Mom,.*Student and parent share the same email$/);
    expect(body[1]).toMatch(/^ZZTestRos Kid,.*,ZZTestRos OldLink,.*,$/);
    expect(body[2]).toMatch(/^ZZTestRos Loner,.*No parent listed$/);
    expect(body[3]).toMatch(/^,,,ZZTestRos Stray,.*Parent not linked to a student in this group$/);
  });

  it("returns 404 for a missing group", async () => {
    const res = await roster.GET(new Request("http://test/x"), params(999999));
    expect(res.status).toBe(404);
  });
});
