import { run, get, all } from "@/lib/db";

// Shared by the group page's "new student / new parent" flows. Same
// required-field rule as POST /api/people.
export function validateNewPerson(p) {
  if (!p?.first_name?.trim() || !p?.last_name?.trim()) {
    return "First and last name are required";
  }
  return null;
}

export async function insertPerson(p) {
  const result = await run(
    `INSERT INTO people (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)`,
    [p.first_name.trim(), p.last_name.trim(), p.email?.trim() || null, p.phone?.trim() || null]
  );
  return result.lastInsertRowid;
}

// Duplicates. No two people may share an email, compared ignoring case and
// surrounding spaces. A person entered without an email has nothing unique to
// compare, so they are checked against everyone's name and phone instead and
// staff decide whether it is the same person.

export function sameEmail(a, b) {
  return (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
}

export async function findEmailOwner(email, exceptId = null) {
  const normalized = (email || "").trim().toLowerCase();
  if (!normalized) return null;
  const params = [normalized];
  let sql = "SELECT id, first_name, last_name FROM people WHERE LOWER(TRIM(email)) = ?";
  if (exceptId !== null) {
    sql += " AND id <> ?";
    params.push(exceptId);
  }
  return get(`${sql} ORDER BY id LIMIT 1`, params);
}

// Same first and last name, or the same phone number however it is
// punctuated.
export async function findPossibleDuplicates(p) {
  const conditions = ["(LOWER(TRIM(first_name)) = ? AND LOWER(TRIM(last_name)) = ?)"];
  const params = [(p.first_name || "").trim().toLowerCase(), (p.last_name || "").trim().toLowerCase()];
  const digits = (p.phone || "").replace(/\D/g, "");
  if (digits) {
    conditions.push("regexp_replace(phone, '\\D', '', 'g') = ?");
    params.push(digits);
  }
  return all(
    `SELECT id, first_name, last_name, email, phone FROM people
     WHERE ${conditions.join(" OR ")}
     ORDER BY last_name, first_name LIMIT 5`,
    params
  );
}

const fullName = (p) => `${(p.first_name || "").trim()} ${(p.last_name || "").trim()}`;

export function emailTakenConflict(owner) {
  return {
    code: "email_taken",
    error: `${fullName(owner)} already has this email`,
    existing: owner,
  };
}

// Run before creating a person. Returns the body of a 409 response when the
// person may not be created as-is, or null when they can. A possible
// duplicate can be overridden by sending allow_duplicate; a taken email
// cannot.
export async function checkNewPersonDuplicates(p, { allowDuplicate = false } = {}) {
  const owner = await findEmailOwner(p.email);
  if (owner) return emailTakenConflict(owner);

  if (!p.email?.trim() && !allowDuplicate) {
    const matches = await findPossibleDuplicates(p);
    if (matches.length > 0) {
      return {
        code: "possible_duplicate",
        error: "This person may already exist",
        matches,
      };
    }
  }

  return null;
}
