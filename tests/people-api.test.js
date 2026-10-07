import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { json, params, TEST_PREFIX, cleanupTestRecords } from "./helpers.js";

vi.mock("@/lib/api-auth", () => ({
  requireAuth: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
  requireAdmin: async () => ({ session: { user: { id: "1", isAdmin: true } } }),
}));

const list = await import("@/app/api/people/route.js");
const one = await import("@/app/api/people/[id]/route.js");
const notesRoute = await import("@/app/api/people/[id]/notes/route.js");
const notesApi = await import("@/app/api/notes/route.js");
const { query } = await import("@/lib/db");

let personId;

afterAll(async () => { await cleanupTestRecords(); });

describe("creating a person", () => {
  it("requires a first and last name", async () => {
    const missing = await list.POST(json("http://test/api/people", "POST", {
      first_name: `${TEST_PREFIX}NoLastName`, email: "zztest.nolast@example.invalid", phone: "555-0104",
    }));
    expect(missing.status).toBe(400);
  });

  it("creates a person with no email or phone", async () => {
    const res = await list.POST(json("http://test/api/people", "POST", {
      first_name: `${TEST_PREFIX}NameOnly`, last_name: "Person",
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.email).toBeNull();
    expect(body.phone).toBeNull();
  });

  it("creates a person with the required details", async () => {
    const res = await list.POST(json("http://test/api/people", "POST", {
      first_name: `${TEST_PREFIX}Ada`, last_name: "Lovelace",
      email: "zztest.ada@example.invalid", phone: "555-0101",
      title: "Volunteer", city: "Kansas City", state: "KS",
    }));
    expect(res.status).toBeLessThan(300);
    const body = await res.json();
    personId = body.id;
    expect(body.first_name).toBe(`${TEST_PREFIX}Ada`);
  });
});

describe("reading people", () => {
  it("lists with a total and a page of rows", async () => {
    const res = await list.GET(new Request("http://test/api/people?limit=5"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(5);
  });

  it("finds someone by name", async () => {
    const res = await list.GET(new Request(`http://test/api/people?search=${TEST_PREFIX}Ada`));
    const body = await res.json();
    expect(body.data.some((p) => p.id === personId)).toBe(true);
  });

  it("finds someone by email", async () => {
    const res = await list.GET(new Request("http://test/api/people?search=zztest.ada@example.invalid"));
    const body = await res.json();
    expect(body.data.some((p) => p.id === personId)).toBe(true);
  });

  const searchIds = async (term) => {
    const res = await list.GET(new Request(`http://test/api/people?search=${encodeURIComponent(term)}`));
    return (await res.json()).data.map((p) => p.id);
  };

  it("finds someone by first and last name together, in either order", async () => {
    expect(await searchIds(`${TEST_PREFIX}Ada Lovelace`)).toContain(personId);
    expect(await searchIds(`Lovelace ${TEST_PREFIX}Ada`)).toContain(personId);
  });

  it("finds someone from a first name and the start of a last name", async () => {
    expect(await searchIds(`${TEST_PREFIX}Ada L`)).toContain(personId);
  });

  it("ignores extra and trailing spaces", async () => {
    expect(await searchIds(`  ${TEST_PREFIX}Ada   Lovelace `)).toContain(personId);
    expect(await searchIds(`${TEST_PREFIX}Ada `)).toContain(personId);
  });

  it("needs every word to match", async () => {
    expect(await searchIds(`${TEST_PREFIX}Ada Hopper`)).not.toContain(personId);
  });

  it("finds someone by phone however the number is typed", async () => {
    // Stored as 555-0101.
    for (const typed of ["5550101", "555-0101", "555.0101", "(555) 0101", "555 0101"]) {
      expect(await searchIds(typed), typed).toContain(personId);
    }
  });

  it("does not match digits that run across the dashes", async () => {
    // 555-0101 holds 5, 0 in a row only if the dash is ignored.
    expect(await searchIds(`${TEST_PREFIX}Ada 50`)).not.toContain(personId);
  });

  it("mixes name and phone words", async () => {
    expect(await searchIds(`${TEST_PREFIX}Ada 0101`)).toContain(personId);
  });

  it("treats % and _ as ordinary characters, not wildcards", async () => {
    expect(await searchIds("%")).toEqual([]);
    expect(await searchIds("_")).toEqual([]);
  });

  it("returns the full record, including the certification checklist", async () => {
    const res = await one.GET(new Request(`http://test/api/people/${personId}`), params(personId));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(personId);
    expect(body).toHaveProperty("certification");
  });

  it("says not found for someone who does not exist", async () => {
    const res = await one.GET(new Request("http://test/api/people/999999"), params(999999));
    expect(res.status).toBe(404);
  });
});

describe("editing a person", () => {
  it("saves a change", async () => {
    const res = await one.PUT(
      json(`http://test/api/people/${personId}`, "PUT", {
        first_name: `${TEST_PREFIX}Ada`, last_name: "Byron",
        email: "zztest.ada@example.invalid", phone: "555-0199",
      }),
      params(personId)
    );
    expect(res.status).toBeLessThan(300);
    const check = await (await one.GET(new Request("http://test/x"), params(personId))).json();
    expect(check.last_name).toBe("Byron");
    expect(check.phone).toBe("555-0199");
  });

  it("still requires a first and last name on edit", async () => {
    const res = await one.PUT(
      json(`http://test/api/people/${personId}`, "PUT", {
        first_name: `${TEST_PREFIX}Ada`, last_name: "",
      }),
      params(personId)
    );
    expect(res.status).toBe(400);
  });

  it("lets email and phone be cleared on edit", async () => {
    const res = await one.PUT(
      json(`http://test/api/people/${personId}`, "PUT", {
        first_name: `${TEST_PREFIX}Ada`, last_name: "Byron", email: "", phone: "",
      }),
      params(personId)
    );
    expect(res.status).toBeLessThan(300);
    const check = await (await one.GET(new Request("http://test/x"), params(personId))).json();
    expect(check.email).toBeNull();
    expect(check.phone).toBeNull();
  });
});

describe("social handles", () => {
  const getPerson = async (id) =>
    (await one.GET(new Request("http://test/x"), params(id))).json();

  it("saves both handles on create, exactly as typed", async () => {
    const res = await list.POST(json("http://test/api/people", "POST", {
      first_name: `${TEST_PREFIX}Grace`, last_name: "Hopper",
      email: "zztest.grace@example.invalid", phone: "555-0102",
      instagram_handle: "@grace.hopper_1906",
      facebook_handle: "https://facebook.com/grace.hopper",
    }));
    expect(res.status).toBeLessThan(300);
    const check = await getPerson((await res.json()).id);
    expect(check.instagram_handle).toBe("@grace.hopper_1906");
    expect(check.facebook_handle).toBe("https://facebook.com/grace.hopper");
  });

  it("saves both handles on edit", async () => {
    const res = await one.PUT(
      json(`http://test/api/people/${personId}`, "PUT", {
        instagram_handle: "adabyron1815", facebook_handle: "ada.byron",
      }),
      params(personId)
    );
    expect(res.status).toBeLessThan(300);
    const check = await getPerson(personId);
    expect(check.instagram_handle).toBe("adabyron1815");
    expect(check.facebook_handle).toBe("ada.byron");
  });

  it("keeps the handles when other details are edited", async () => {
    await one.PUT(
      json(`http://test/api/people/${personId}`, "PUT", {
        first_name: `${TEST_PREFIX}Ada`, last_name: "Byron",
        email: "zztest.ada@example.invalid", phone: "555-0198",
      }),
      params(personId)
    );
    const check = await getPerson(personId);
    expect(check.phone).toBe("555-0198");
    expect(check.instagram_handle).toBe("adabyron1815");
    expect(check.facebook_handle).toBe("ada.byron");
  });

  it("clears a handle that is emptied", async () => {
    await one.PUT(
      json(`http://test/api/people/${personId}`, "PUT", { instagram_handle: "" }),
      params(personId)
    );
    const check = await getPerson(personId);
    expect(check.instagram_handle).toBeNull();
    expect(check.facebook_handle).toBe("ada.byron");
  });
});

describe("notes on a person", () => {
  let noteId;

  it("adds a note", async () => {
    // Notes are created through the general notes endpoint, tied to the record
    // by type and id — the same call the new-person form makes.
    const res = await notesApi.POST(
      json("http://test/api/notes", "POST", {
        content: `${TEST_PREFIX} first note`, title: "Intro",
        entity_type: "person", entity_id: personId,
      })
    );
    expect(res.status).toBeLessThan(300);
    noteId = (await res.json()).id;
    expect(noteId).toBeTruthy();
  });

  it("lists notes against the person", async () => {
    const res = await notesRoute.GET(new Request("http://test/x"), params(personId));
    const body = await res.json();
    const rows = Array.isArray(body) ? body : body.data;
    expect(rows.some((n) => n.id === noteId)).toBe(true);
  });
});

describe("deleting a person", () => {
  it("removes the record", async () => {
    const res = await one.DELETE(new Request("http://test/x", { method: "DELETE" }), params(personId));
    expect(res.status).toBeLessThan(300);
    const gone = await one.GET(new Request("http://test/x"), params(personId));
    expect(gone.status).toBe(404);
  });

  it("takes the person's notes with it", async () => {
    const orphans = await query(
      "SELECT id FROM notes WHERE entity_type = 'person' AND entity_id = ?", [personId]
    );
    expect(orphans.length).toBe(0);
  });
});
