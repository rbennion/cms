import { describe, it, expect } from "vitest";
import { matchesSearch, searchClause } from "@/lib/search";

// The rule every search box follows, checked without a database. The API
// test files check each page's search against real records.

describe("matching in the browser", () => {
  const jill = ["Jill ", "Parker", "jill.parker@lps53.org"];

  it("matches when every word appears somewhere, in any order", () => {
    expect(matchesSearch("jill p", jill)).toBe(true);
    expect(matchesSearch("parker jill", jill)).toBe(true);
    expect(matchesSearch("JILL PARKER", jill)).toBe(true);
  });

  it("does not match when any word is missing", () => {
    expect(matchesSearch("jill smith", jill)).toBe(false);
  });

  it("ignores extra and trailing spaces", () => {
    expect(matchesSearch("  jill    parker ", jill)).toBe(true);
  });

  it("matches everything when the search is empty", () => {
    expect(matchesSearch("", jill)).toBe(true);
    expect(matchesSearch("   ", jill)).toBe(true);
    expect(matchesSearch(undefined, jill)).toBe(true);
  });

  it("skips missing fields", () => {
    expect(matchesSearch("jill", [null, "Jill", undefined])).toBe(true);
  });

  it("finds a phone number however it is punctuated", () => {
    const fields = ["Brad", "Anderson"];
    const phones = ["913-549-7452"];
    for (const typed of ["9135497452", "(913) 549-7452", "913.549.7452", "913549", "549 7452", "7452", "913"]) {
      expect(matchesSearch(typed, fields, phones), typed).toBe(true);
    }
    expect(matchesSearch("9999", fields, phones)).toBe(false);
  });

  it("does not match digits that run across the dashes", () => {
    // 816-507 holds 6, 5, 0 in a row only if the dash is ignored.
    expect(matchesSearch("650", ["Kevin"], ["816-507-6415"])).toBe(false);
    expect(matchesSearch("650", ["Lindsay"], ["816-506-1308"])).toBe(false);
  });

  it("matches digits as written in a number stored without dashes", () => {
    expect(matchesSearch("7452", ["Brad"], ["9135497452"])).toBe(true);
    expect(matchesSearch("913-549-7452", ["Brad"], ["9135497452"])).toBe(true);
  });

  it("only treats a word as a phone number when it looks like one", () => {
    // "brad99" has digits but is not a phone number, so it must match as text.
    expect(matchesSearch("brad99", ["Brad"], ["913-549-9999"])).toBe(false);
  });
});

describe("building the SQL", () => {
  const fields = { columns: ["p.first_name", "p.last_name"], phoneColumns: ["p.phone"] };

  it("adds nothing when the search is empty", () => {
    expect(searchClause("", fields)).toEqual({ sql: "", params: [] });
    expect(searchClause("  ", fields)).toEqual({ sql: "", params: [] });
    expect(searchClause(null, fields)).toEqual({ sql: "", params: [] });
  });

  it("requires each word to match one of the columns", () => {
    const { sql, params } = searchClause("jill p", fields);
    expect(sql).toBe(
      " AND (p.first_name ILIKE ? OR p.last_name ILIKE ?) AND (p.first_name ILIKE ? OR p.last_name ILIKE ?)"
    );
    expect(params).toEqual(["%jill%", "%jill%", "%p%", "%p%"]);
  });

  it("checks phone columns for phone-like words only", () => {
    const { sql, params } = searchClause("(913) brad", fields);
    expect(sql).toBe(
      " AND (p.first_name ILIKE ? OR p.last_name ILIKE ? OR p.phone LIKE ? OR p.phone ~ ?)" +
      " AND (p.first_name ILIKE ? OR p.last_name ILIKE ?)"
    );
    expect(params).toEqual(["%(913)%", "%(913)%", "%913%", "(^|\\D)9\\D*1\\D*3", "%brad%", "%brad%"]);
  });

  it("uses one placeholder per parameter", () => {
    const { sql, params } = searchClause("jill 913-549 parker", fields);
    expect(sql.split("?").length - 1).toBe(params.length);
  });

  it("escapes LIKE wildcards so they match literally", () => {
    const { params } = searchClause("100%_done", fields);
    expect(params[0]).toBe("%100\\%\\_done%");
  });
});
