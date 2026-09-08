import { run } from "@/lib/db";

// Shared by the group page's "new student / new parent" flows. Same
// required-field rule as POST /api/people.
export function validateNewPerson(p) {
  if (!p?.first_name?.trim() || !p?.last_name?.trim() || !p?.email?.trim() || !p?.phone?.trim()) {
    return "Name, email, and phone are required";
  }
  return null;
}

export async function insertPerson(p) {
  const result = await run(
    `INSERT INTO people (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)`,
    [p.first_name.trim(), p.last_name.trim(), p.email.trim(), p.phone.trim()]
  );
  return result.lastInsertRowid;
}
