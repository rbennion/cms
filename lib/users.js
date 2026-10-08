import { get } from "@/lib/db";

// A login email is one account however it is capitalized or padded:
// Brad@x.com and brad@x.com are the same person. Emails are stored
// normalized, lookups compare lowercased so accounts saved before that rule
// still match, and the database refuses a second account whose email differs
// only by case (migration 013).

export function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

export function findUserByEmail(email) {
  return get(
    "SELECT id, email, password_hash, name, is_active, is_admin FROM users WHERE LOWER(email) = ?",
    [normalizeEmail(email)]
  );
}

// True when another account already uses this email. Pass the account's own
// id when editing it, so keeping its current email is not a clash.
export async function emailTaken(email, exceptId = null) {
  const params = [normalizeEmail(email)];
  let sql = "SELECT id FROM users WHERE LOWER(email) = ?";
  if (exceptId !== null) {
    sql += " AND id <> ?";
    params.push(exceptId);
  }
  return Boolean(await get(sql, params));
}
