// Every search box in the app matches word by word: each word typed must
// appear in at least one of the searched fields, in any order. "jill p",
// "parker jill" and "brad anderson" all find their person, and extra or
// trailing spaces don't matter.
//
// A word made only of digits and phone punctuation is also checked against
// phone numbers. Its digits match when they appear in the number as stored,
// or when they match from the start of one part of the number with any
// punctuation in between: 9135497452, (913) 549-7452 and 7452 all find
// 913-549-7452, but 650 does not find 816-507-6415.
//
// searchClause builds the SQL for API routes. matchesSearch applies the same
// rule in the browser, for lists filtered on the page.

const PHONE_WORD = /^[\d.()+-]+$/;

// The fields each server-side search looks in. List and export routes both
// read from here so an export returns exactly the rows on screen.
export const SEARCH_FIELDS = {
  people: {
    columns: ["p.first_name", "p.middle_name", "p.last_name", "p.email"],
    phoneColumns: ["p.phone"],
  },
  companies: { columns: ["name"] },
  schools: { columns: ["name", "city"] },
  donations: { columns: ["d.note", "p.first_name", "p.last_name", "c.name"] },
  groups: { columns: ["g.name", "s.name", "pl.first_name", "pl.last_name"] },
  certifications: { columns: ["p.first_name", "p.last_name", "p.email"] },
};

function searchWords(search) {
  return String(search ?? "").trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function phoneDigits(word) {
  return PHONE_WORD.test(word) ? word.replace(/\D/g, "") : "";
}

// 7452 -> (^|\D)7\D*4\D*5\D*2: the digits in order, starting at the
// beginning of a part of the number, with any punctuation between them.
function phonePattern(digits) {
  return `(^|\\D)${digits.split("").join("\\D*")}`;
}

// % and _ are wildcards in LIKE; a person typing them means the character.
function escapeLike(word) {
  return word.replace(/[\\%_]/g, (c) => `\\${c}`);
}

// Returns a SQL fragment to append to a WHERE clause ("" when there is
// nothing to search) and the parameters it uses, in order.
export function searchClause(search, { columns, phoneColumns = [] }) {
  const clauses = [];
  const params = [];

  for (const word of searchWords(search)) {
    const like = `%${escapeLike(word)}%`;
    const conditions = columns.map((column) => `${column} ILIKE ?`);
    params.push(...columns.map(() => like));

    const digits = phoneDigits(word);
    if (digits) {
      for (const column of phoneColumns) {
        conditions.push(`${column} LIKE ?`, `${column} ~ ?`);
        params.push(`%${digits}%`, phonePattern(digits));
      }
    }

    clauses.push(`(${conditions.join(" OR ")})`);
  }

  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params,
  };
}

// The same test in the browser. `fields` are the values to look in; `phones`
// are also checked for phone-like words.
export function matchesSearch(search, fields, phones = []) {
  const values = fields.filter(Boolean).map((f) => String(f).toLowerCase());
  const phoneValues = phones.filter(Boolean).map(String);

  return searchWords(search).every((word) => {
    if (values.some((value) => value.includes(word))) return true;
    const digits = phoneDigits(word);
    if (!digits) return false;
    const pattern = new RegExp(phonePattern(digits));
    return phoneValues.some((phone) => phone.includes(digits) || pattern.test(phone));
  });
}
