import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

// The QR code is rebuilt from AUTH_SECRET; tests need one of their own.
process.env.AUTH_SECRET ||= "test-secret-for-event-registration";

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

const schools = await import("@/app/api/schools/route.js");
const groups = await import("@/app/api/groups/route.js");
const staff = await import("@/app/api/groups/[id]/registration/route.js");
const reset = await import("@/app/api/groups/[id]/registration/reset/route.js");
const entries = await import("@/app/api/groups/[id]/registration/entries/[entryId]/route.js");
const publicRoute = await import("@/app/api/event/[code]/route.js");
const { get, all, query } = await import("@/lib/db");

const HOUR = 60 * 60 * 1000;
const at = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();
const codeOf = (status) => status.form_path.split("/").pop();
const pub = (code) => ({ params: { code } });

let groupId, studentRoleId;

const staffGet = async () => (await staff.GET(new Request("http://test/x"), params(groupId))).json();
const setWindow = (starts_at, ends_at) =>
  staff.PUT(json("http://test/x", "PUT", { starts_at, ends_at }), params(groupId));
const openNow = () => setWindow(at(-10 * 60 * 1000), at(HOUR));
const register = async (body) => {
  const code = codeOf(await staffGet());
  return publicRoute.POST(json("http://test/x", "POST", body), pub(code));
};

const person = (first, last, email, extra = {}) => ({
  first_name: `${TEST_PREFIX}${first}`, last_name: last, email, phone: "555-0300", ...extra,
});

const findPerson = (email) => get("SELECT * FROM people WHERE LOWER(email) = LOWER(?)", [email]);
const inGroup = async (table, personId) =>
  Boolean(await get(`SELECT 1 AS x FROM ${table} WHERE group_id = ? AND person_id = ?`, [groupId, personId]));

beforeAll(async () => {
  const school = await schools.POST(json("http://test/x", "POST", { name: `${TEST_PREFIX} Event School`, city: "Olathe", state: "KS" }));
  const group = await groups.POST(json("http://test/x", "POST", {
    school_id: (await school.json()).id, name: `${TEST_PREFIX} Event Group`, gender: "Boys", year: 2029,
  }));
  groupId = (await group.json()).id;
  // Production's Student role carries a trailing space; matching must not care.
  const [role] = await query("INSERT INTO roles (name) VALUES (?) RETURNING id", [`Student `]);
  studentRoleId = role.id;
});

afterAll(async () => {
  await query("DELETE FROM roles WHERE id = ?", [studentRoleId]);
  await cleanupTestRecords();
});

describe("staff setting the registration window", () => {
  it("starts with nothing set", async () => {
    expect((await staffGet()).state).toBe("unset");
  });

  it("refuses a window longer than four hours", async () => {
    const res = await setWindow(at(HOUR), at(5 * HOUR + 60 * 1000));
    expect(res.status).toBe(400);
  });

  it("refuses an end time before the start time", async () => {
    expect((await setWindow(at(2 * HOUR), at(HOUR))).status).toBe(400);
  });

  it("refuses a window that has already passed", async () => {
    expect((await setWindow(at(-3 * HOUR), at(-HOUR))).status).toBe(400);
  });

  it("sets a window and hands back the form and screen links", async () => {
    const res = await setWindow(at(HOUR), at(3 * HOUR));
    expect(res.status).toBe(200);
    const status = await res.json();
    expect(status.state).toBe("scheduled");
    expect(status.form_path).toMatch(/^\/event\/[A-Za-z0-9_-]{22}$/);
    expect(status.screen_path).toBe(`${status.form_path}/screen`);
  });

  it("keeps the same QR code when the time changes", async () => {
    const before = codeOf(await staffGet());
    await setWindow(at(2 * HOUR), at(4 * HOUR));
    expect(codeOf(await staffGet())).toBe(before);
  });

  it("does not keep a usable link in the database", async () => {
    const code = codeOf(await staffGet());
    const row = await get("SELECT token_salt, token_hash FROM event_registrations WHERE group_id = ?", [groupId]);
    expect(JSON.stringify(row)).not.toContain(code);
  });
});

describe("the public link before registration opens", () => {
  it("shows the group and when it opens, and nothing else", async () => {
    const code = codeOf(await staffGet());
    const res = await publicRoute.GET(new Request("http://test/x"), pub(code));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.state).toBe("scheduled");
    expect(body.school_name).toBe(`${TEST_PREFIX} Event School`);
    expect(body.year).toBe(2029);
    expect(Object.keys(body).sort()).toEqual(["ends_at", "group_name", "school_name", "starts_at", "state", "year"]);
  });

  it("turns registrations away until the start time", async () => {
    const res = await register({ student: person("Early", "Bird", "zztest.early@example.invalid") });
    expect(res.status).toBe(403);
    expect(await findPerson("zztest.early@example.invalid")).toBeNull();
  });

  it("does not recognise a made-up code", async () => {
    const res = await publicRoute.GET(new Request("http://test/x"), pub("not-a-real-code"));
    expect(res.status).toBe(404);
  });
});

describe("registering while it is open", () => {
  beforeAll(async () => { await openNow(); });

  it("creates the student and parents, puts them in the group, and links the family", async () => {
    const res = await register({
      student: person("Kid", "Walker", "zztest.kid.walker@example.invalid", { instagram_handle: "@kidw" }),
      parents: [
        person("Mom", "Walker", "zztest.mom.walker@example.invalid", { facebook_handle: "mom.walker" }),
        person("Dad", "Walker", "zztest.dad.walker@example.invalid"),
      ],
    });
    expect(res.status).toBe(201);

    const kid = await findPerson("zztest.kid.walker@example.invalid");
    const mom = await findPerson("zztest.mom.walker@example.invalid");
    const dad = await findPerson("zztest.dad.walker@example.invalid");
    expect(kid.instagram_handle).toBe("@kidw");
    expect(mom.facebook_handle).toBe("mom.walker");
    expect(await inGroup("group_students", kid.id)).toBe(true);
    expect(await inGroup("group_parents", mom.id)).toBe(true);
    expect(await inGroup("group_parents", dad.id)).toBe(true);

    const links = await all(
      "SELECT related_person_id, relationship FROM family_relationships WHERE person_id = ?", [kid.id]
    );
    expect(links).toEqual(expect.arrayContaining([
      { related_person_id: mom.id, relationship: "parent" },
      { related_person_id: dad.id, relationship: "parent" },
    ]));

    const studentRole = await get("SELECT 1 AS x FROM person_roles WHERE person_id = ? AND role_id = ?", [kid.id, studentRoleId]);
    const parentRole = await get(
      "SELECT 1 AS x FROM person_roles pr JOIN roles r ON r.id = pr.role_id WHERE pr.person_id = ? AND LOWER(TRIM(r.name)) = 'parent'",
      [mom.id]
    );
    expect(studentRole).toBeTruthy();
    expect(parentRole).toBeTruthy();
  });

  it("counts the students registered in this window", async () => {
    expect((await staffGet()).registered).toBe(1);
  });

  it("reuses someone already in the CRM with the same name, filling only blank fields", async () => {
    await query(
      "INSERT INTO people (first_name, last_name, email, instagram_handle) VALUES (?, ?, ?, ?)",
      [`${TEST_PREFIX}Known`, "Student", "zztest.known@example.invalid", "@keepme"]
    );
    const res = await register({
      student: person("known", " student ", "ZZTest.Known@example.invalid", { phone: "555-0311", instagram_handle: "@new" }),
    });
    expect(res.status).toBe(201);

    const matches = await all("SELECT * FROM people WHERE LOWER(email) = ?", ["zztest.known@example.invalid"]);
    expect(matches).toHaveLength(1);
    expect(matches[0].phone).toBe("555-0311");
    expect(matches[0].instagram_handle).toBe("@keepme");
    expect(await inGroup("group_students", matches[0].id)).toBe(true);
  });

  it("gives a student who typed someone else's email a record of their own, and flags it for staff", async () => {
    const [lisa] = await query(
      "INSERT INTO people (first_name, last_name, email) VALUES (?, ?, ?) RETURNING id",
      [`${TEST_PREFIX}Lisa`, "Smith", "zztest.lisa@example.invalid"]
    );
    const res = await register({ student: person("Jake", "Smith", "zztest.lisa@example.invalid") });
    expect(res.status).toBe(201);

    const jake = await get("SELECT * FROM people WHERE first_name = ?", [`${TEST_PREFIX}Jake`]);
    expect(jake.email).toBeNull();
    expect(await inGroup("group_students", jake.id)).toBe(true);
    expect(await inGroup("group_students", lisa.id)).toBe(false);

    const status = await staffGet();
    const flag = status.flagged.find((f) => f.person_id === jake.id);
    expect(flag.needs_review).toContain("zztest.lisa@example.invalid");
    expect(flag.needs_review).toContain(`${TEST_PREFIX}Lisa Smith`);

    const cleared = await entries.PATCH(
      json("http://test/x", "PATCH", {}),
      { params: { id: String(groupId), entryId: String(flag.id) } }
    );
    expect((await cleared.json()).flagged.some((f) => f.id === flag.id)).toBe(false);
  });

  it("links siblings to the same parent instead of creating the parent twice", async () => {
    const parent = person("Shared", "Parent", "zztest.shared.parent@example.invalid");
    await register({ student: person("SibOne", "Parent", "zztest.sib1@example.invalid"), parents: [parent] });
    await register({ student: person("SibTwo", "Parent", "zztest.sib2@example.invalid"), parents: [parent] });

    const parents = await all("SELECT id FROM people WHERE LOWER(email) = ?", ["zztest.shared.parent@example.invalid"]);
    expect(parents).toHaveLength(1);
    const kids = await all(
      "SELECT person_id FROM family_relationships WHERE related_person_id = ? AND relationship = 'parent'",
      [parents[0].id]
    );
    expect(kids).toHaveLength(2);
  });

  it("answers the same way whether or not the person was already known", async () => {
    const fresh = await register({ student: person("Fresh", "Face", "zztest.fresh@example.invalid") });
    const again = await register({ student: person("Fresh", "Face", "zztest.fresh@example.invalid") });
    expect(await fresh.json()).toEqual(await again.json());
  });

  it("asks for every required field", async () => {
    const noPhone = await register({ student: person("NoPhone", "Kid", "zztest.nophone@example.invalid", { phone: "" }) });
    expect(noPhone.status).toBe(400);
    const badEmail = await register({ student: person("BadEmail", "Kid", "not-an-email") });
    expect(badEmail.status).toBe(400);
    const parentNoEmail = await register({
      student: person("Fine", "Kid", "zztest.fine@example.invalid"),
      parents: [person("NoEmail", "Parent", "")],
    });
    expect(parentNoEmail.status).toBe(400);
  });

  it("refuses the same email used twice in one form", async () => {
    const res = await register({
      student: person("Twin", "Email", "zztest.twin@example.invalid"),
      parents: [person("TwinParent", "Email", "ZZTEST.TWIN@example.invalid")],
    });
    expect(res.status).toBe(400);
  });

  it("quietly drops a bot's submission", async () => {
    const res = await register({ website: "spam.example", student: person("Bot", "Spam", "zztest.bot@example.invalid") });
    expect(res.status).toBe(201);
    expect(await findPerson("zztest.bot@example.invalid")).toBeNull();
  });
});

describe("closing and resetting", () => {
  it("closing early stops registrations", async () => {
    await openNow();
    const closed = await staff.DELETE(new Request("http://test/x", { method: "DELETE" }), params(groupId));
    expect((await closed.json()).state).toBe("ended");
    const res = await register({ student: person("Late", "Comer", "zztest.late@example.invalid") });
    expect(res.status).toBe(403);
  });

  it("a new window starts its count from zero", async () => {
    await setWindow(at(HOUR), at(2 * HOUR));
    expect((await staffGet()).registered).toBe(0);
  });

  it("resetting the code retires the old link", async () => {
    const oldCode = codeOf(await staffGet());
    const res = await reset.POST(json("http://test/x", "POST", {}), params(groupId));
    const newCode = codeOf(await res.json());
    expect(newCode).not.toBe(oldCode);
    expect((await publicRoute.GET(new Request("http://test/x"), pub(oldCode))).status).toBe(404);
    expect((await publicRoute.GET(new Request("http://test/x"), pub(newCode))).status).toBe(200);
  });
});
