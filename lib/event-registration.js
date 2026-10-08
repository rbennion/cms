// Event registration rules shared by the server and the browser. Database and
// code handling live in event-registration-server.js.

export const MAX_WINDOW_HOURS = 4;
export const MAX_PARENTS = 4;
// A ceiling per window so a leaked code can't flood a group.
export const MAX_STUDENTS_PER_WINDOW = 300;

const HOUR_MS = 60 * 60 * 1000;

// "unset": no window yet · "scheduled": starts later · "open": taking
// registrations now · "ended": the window has passed (or was closed early).
export function windowState(registration, now = new Date()) {
  if (!registration?.starts_at || !registration?.ends_at) return "unset";
  const start = new Date(registration.starts_at);
  const end = new Date(registration.ends_at);
  if (now < start) return "scheduled";
  if (now < end) return "open";
  return "ended";
}

// Checks a window staff entered. Returns { error } or { start, end }.
export function validateWindow({ starts_at, ends_at } = {}, now = new Date()) {
  const start = new Date(starts_at);
  const end = new Date(ends_at);
  if (!starts_at || !ends_at || isNaN(start) || isNaN(end)) {
    return { error: "Enter a date, a start time and an end time" };
  }
  if (end <= start) {
    return { error: "The end time must be after the start time" };
  }
  if (end - start > MAX_WINDOW_HOURS * HOUR_MS) {
    return { error: `Registration can be open for ${MAX_WINDOW_HOURS} hours at most` };
  }
  if (end <= now) {
    return { error: "That time has already passed" };
  }
  return { start, end };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FIELDS = ["first_name", "last_name", "email", "phone", "instagram_handle", "facebook_handle"];

function cleanPerson(raw) {
  const p = {};
  for (const field of FIELDS) p[field] = String(raw?.[field] ?? "").trim();
  return p;
}

function personError(p, who) {
  if (!p.first_name || !p.last_name) return `Enter ${who} first and last name`;
  if (!p.email) return `Enter ${who} email`;
  if (!EMAIL.test(p.email)) return `Check ${who} email address`;
  if (!p.phone) return `Enter ${who} phone number`;
  return null;
}

// Checks a public registration form. Returns { error } or { student, parents }.
export function validateSubmission(body) {
  const student = cleanPerson(body?.student);
  const studentError = personError(student, "your");
  if (studentError) return { error: studentError };

  const rawParents = Array.isArray(body?.parents) ? body.parents : [];
  if (rawParents.length > MAX_PARENTS) {
    return { error: `Add ${MAX_PARENTS} parents at most` };
  }
  const parents = rawParents.map(cleanPerson);
  for (let i = 0; i < parents.length; i++) {
    const parentError = personError(parents[i], `parent ${i + 1}'s`);
    if (parentError) return { error: parentError };
  }

  const emails = [student, ...parents].map((p) => p.email.toLowerCase());
  if (new Set(emails).size !== emails.length) {
    return { error: "Each person needs their own email address" };
  }

  return { student, parents };
}

export function sameName(a, b) {
  const norm = (s) => String(s ?? "").trim().toLowerCase();
  return norm(a.first_name) === norm(b.first_name) && norm(a.last_name) === norm(b.last_name);
}

// The time line on the registration screen and the phone form.
export function statusLine(info, now = new Date()) {
  const state = windowState(info, now);
  if (state === "open") {
    const end = new Date(info.ends_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `Open now until ${end}`;
  }
  if (state === "scheduled") return `Opens ${formatWindow(info.starts_at, info.ends_at)}`;
  return "Registration is closed";
}

// "Thursday, October 9 · 6:00 – 8:00 PM" in the viewer's own time zone.
export function formatWindow(starts_at, ends_at) {
  if (!starts_at || !ends_at) return "";
  const start = new Date(starts_at);
  const end = new Date(ends_at);
  const day = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  // "6:00 – 8:00 PM", but "11:00 AM – 1:00 PM" when the window crosses noon.
  const samePeriod = (start.getHours() < 12) === (end.getHours() < 12);
  const startText = samePeriod ? time(start).replace(/\s?[AP]M$/, "") : time(start);
  return `${day} · ${startText} – ${time(end)}`;
}
