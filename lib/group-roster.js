// A group's family roster: one row per student and parent, with notes that
// flag gaps in the contact data. Pure functions so the page, the API route
// and the tests all share one definition of what the roster says.

export const ROSTER_COLUMNS = [
  "Student",
  "Student Email",
  "Student Phone",
  "Parent",
  "Parent Email",
  "Parent Phone",
  "Notes",
];

const fullName = (p) => [p.first_name, p.last_name].filter(Boolean).join(" ");
const byName = (a, b) =>
  (a.last_name || "").localeCompare(b.last_name || "") ||
  (a.first_name || "").localeCompare(b.first_name || "");
const blank = (v) => !v || !String(v).trim();
const sameEmail = (a, b) =>
  !blank(a) && !blank(b) && a.trim().toLowerCase() === b.trim().toLowerCase();

// students, parents: the group's members. links: { student_id, ...parent }
// for every parent tied to a student in the group, whether or not that parent
// is also listed as one of the group's parents.
export function buildRosterRows({ students = [], parents = [], links = [] }) {
  const rows = [];
  const linkedParentIds = new Set();

  for (const student of [...students].sort(byName)) {
    const studentNotes = [];
    if (blank(student.email)) studentNotes.push("Student has no email");
    if (blank(student.phone)) studentNotes.push("Student has no phone");

    const own = links.filter((l) => l.student_id === student.id).sort(byName);
    if (own.length === 0) {
      rows.push(row(student, null, [...studentNotes, "No parent listed"]));
      continue;
    }
    for (const parent of own) {
      linkedParentIds.add(parent.id);
      const notes = [...studentNotes];
      if (blank(parent.email)) notes.push("Parent has no email");
      if (blank(parent.phone)) notes.push("Parent has no phone");
      if (sameEmail(student.email, parent.email)) {
        notes.push("Student and parent share the same email");
      }
      rows.push(row(student, parent, notes));
    }
  }

  for (const parent of [...parents].sort(byName)) {
    if (linkedParentIds.has(parent.id)) continue;
    const notes = ["Parent not linked to a student in this group"];
    if (blank(parent.email)) notes.push("Parent has no email");
    if (blank(parent.phone)) notes.push("Parent has no phone");
    rows.push(row(null, parent, notes));
  }

  return rows;
}

function row(student, parent, notes) {
  return {
    Student: student ? fullName(student) : "",
    "Student Email": student?.email || "",
    "Student Phone": student?.phone || "",
    Parent: parent ? fullName(parent) : "",
    "Parent Email": parent?.email || "",
    "Parent Phone": parent?.phone || "",
    Notes: notes.join("; "),
  };
}

const escapeCSV = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export function rosterToCsv(rows) {
  const lines = rows.map((r) => ROSTER_COLUMNS.map((c) => escapeCSV(r[c])).join(","));
  return [ROSTER_COLUMNS.join(","), ...lines].join("\n");
}

// "2030 roster 2026-09-23.csv" — the date tells two downloads apart.
export function rosterFilename(groupName, date = new Date()) {
  const safe = String(groupName || "group").replace(/[\\/:*?"<>|]+/g, "-").trim();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${safe} roster ${y}-${m}-${d}.csv`;
}
