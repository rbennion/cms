import crypto from "crypto";
import { get, all, run } from "@/lib/db";
import { hashToken } from "@/lib/tokens";
import { findEmailOwner } from "@/lib/people-server";
import { linkFamily } from "@/lib/family";
import { windowState, sameName, MAX_STUDENTS_PER_WINDOW } from "@/lib/event-registration";

// A group's QR code. The code is rebuilt from a stored salt and AUTH_SECRET,
// so the server can show it again at any time while the database holds only
// the salt and a hash of the code (which is how a scanned link is looked up).

function secret() {
  if (!process.env.AUTH_SECRET) throw new Error("AUTH_SECRET is not set");
  return process.env.AUTH_SECRET;
}

export function codeFromSalt(salt) {
  return crypto
    .createHmac("sha256", secret())
    .update(`event-registration:${salt}`)
    .digest("base64url")
    .slice(0, 22);
}

function newCode() {
  const salt = crypto.randomBytes(16).toString("base64url");
  const code = codeFromSalt(salt);
  return { salt, code, hash: hashToken(code) };
}

export function getRegistrationForGroup(groupId) {
  return get("SELECT * FROM event_registrations WHERE group_id = ?", [groupId]);
}

export async function findRegistrationByCode(code) {
  if (!code || typeof code !== "string" || code.length > 64) return null;
  return get(
    `SELECT r.*, g.name AS group_name, g.year AS group_year, s.name AS school_name
       FROM event_registrations r
       JOIN groups g ON g.id = r.group_id
       JOIN schools s ON s.id = g.school_id
      WHERE r.token_hash = ?`,
    [hashToken(code)]
  );
}

export async function setWindow(groupId, start, end, userId) {
  const existing = await getRegistrationForGroup(groupId);
  if (existing) {
    await run(
      `UPDATE event_registrations SET starts_at = ?, ends_at = ?, set_by = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
      [start, end, userId, existing.id]
    );
    return;
  }
  const { salt, hash } = newCode();
  await run(
    `INSERT INTO event_registrations (group_id, token_salt, token_hash, starts_at, ends_at, set_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [groupId, salt, hash, start, end, userId]
  );
}

// Close early: a window that hasn't started is cleared; an open one ends now.
export async function closeWindow(registration, now = new Date()) {
  const state = windowState(registration, now);
  if (state === "scheduled") {
    await run(
      "UPDATE event_registrations SET starts_at = NULL, ends_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [registration.id]
    );
  } else if (state === "open") {
    await run(
      "UPDATE event_registrations SET ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [now, registration.id]
    );
  }
}

// New code: old printouts, downloads and screen links stop working.
export async function resetCode(registration) {
  const { salt, hash } = newCode();
  await run(
    "UPDATE event_registrations SET token_salt = ?, token_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [salt, hash, registration.id]
  );
}

async function studentsThisWindow(registration) {
  if (!registration.starts_at) return 0;
  const row = await get(
    `SELECT COUNT(*)::int AS n FROM event_registration_entries
      WHERE registration_id = ? AND role = 'student' AND window_starts_at = ?`,
    [registration.id, registration.starts_at]
  );
  return row?.n || 0;
}

// What staff see on the Group page.
export async function staffStatus(groupId, now = new Date()) {
  const registration = await getRegistrationForGroup(groupId);
  if (!registration) return { state: "unset" };
  const code = codeFromSalt(registration.token_salt);
  const flagged = await all(
    `SELECT e.id, e.needs_review, p.id AS person_id, p.first_name, p.last_name
       FROM event_registration_entries e
       LEFT JOIN people p ON p.id = e.person_id
      WHERE e.registration_id = ? AND e.needs_review IS NOT NULL AND e.reviewed_at IS NULL
      ORDER BY e.created_at`,
    [registration.id]
  );
  return {
    state: windowState(registration, now),
    starts_at: registration.starts_at,
    ends_at: registration.ends_at,
    form_path: `/event/${code}`,
    screen_path: `/event/${code}/screen`,
    registered: await studentsThisWindow(registration),
    flagged,
  };
}

// What anyone holding the code sees: no names, no counts.
export function publicStatus(registration, now = new Date()) {
  return {
    group_name: registration.group_name,
    school_name: registration.school_name,
    year: registration.group_year,
    state: windowState(registration, now),
    starts_at: registration.starts_at,
    ends_at: registration.ends_at,
  };
}

export async function windowIsFull(registration) {
  return (await studentsThisWindow(registration)) >= MAX_STUDENTS_PER_WINDOW;
}

async function roleId(name) {
  const row = await get("SELECT id FROM roles WHERE LOWER(TRIM(name)) = ?", [name]);
  return row?.id ?? null;
}

async function ensureRole(personId, role) {
  if (!role) return;
  const has = await get("SELECT 1 AS x FROM person_roles WHERE person_id = ? AND role_id = ?", [personId, role]);
  if (!has) await run("INSERT INTO person_roles (person_id, role_id) VALUES (?, ?)", [personId, role]);
}

async function ensureMember(table, groupId, personId) {
  const has = await get(`SELECT 1 AS x FROM ${table} WHERE group_id = ? AND person_id = ?`, [groupId, personId]);
  if (!has) await run(`INSERT INTO ${table} (group_id, person_id) VALUES (?, ?)`, [groupId, personId]);
}

// Finds or creates the person a registrant describes. An email already on
// someone with the same name is that person (blank fields get filled in, nothing
// is overwritten). An email already on someone ELSE is not: the registrant gets
// their own record without it, and a note for staff.
async function resolvePerson(p) {
  const owner = await findEmailOwner(p.email);
  if (owner && sameName(owner, p)) {
    await run(
      `UPDATE people SET
         phone = COALESCE(NULLIF(TRIM(phone), ''), ?),
         instagram_handle = COALESCE(NULLIF(TRIM(instagram_handle), ''), ?),
         facebook_handle = COALESCE(NULLIF(TRIM(facebook_handle), ''), ?),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [p.phone || null, p.instagram_handle || null, p.facebook_handle || null, owner.id]
    );
    return { id: owner.id, needsReview: null };
  }

  const result = await run(
    `INSERT INTO people (first_name, last_name, email, phone, instagram_handle, facebook_handle)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      p.first_name,
      p.last_name,
      owner ? null : p.email,
      p.phone || null,
      p.instagram_handle || null,
      p.facebook_handle || null,
    ]
  );
  const needsReview = owner
    ? `Registered with ${p.email}, which is already on ${owner.first_name.trim()} ${owner.last_name.trim()}. Saved without an email.`
    : null;
  return { id: result.lastInsertRowid, needsReview };
}

// Saves one checked registration: the student, their parents, the group and
// the family links between them.
export async function saveSubmission(registration, { student, parents }) {
  const [studentRole, parentRole] = await Promise.all([roleId("student"), roleId("parent")]);
  const entry = (personId, role, note) =>
    run(
      `INSERT INTO event_registration_entries (registration_id, person_id, role, window_starts_at, needs_review)
       VALUES (?, ?, ?, ?, ?)`,
      [registration.id, personId, role, registration.starts_at, note]
    );

  const kid = await resolvePerson(student);
  await ensureRole(kid.id, studentRole);
  await ensureMember("group_students", registration.group_id, kid.id);
  await entry(kid.id, "student", kid.needsReview);

  for (const parent of parents) {
    const adult = await resolvePerson(parent);
    await ensureRole(adult.id, parentRole);
    await ensureMember("group_parents", registration.group_id, adult.id);
    await linkFamily(run, get, kid.id, adult.id, "parent");
    await entry(adult.id, "parent", adult.needsReview);
  }
}

export async function markReviewed(registrationId, entryId) {
  await run(
    "UPDATE event_registration_entries SET reviewed_at = CURRENT_TIMESTAMP WHERE id = ? AND registration_id = ?",
    [entryId, registrationId]
  );
}
