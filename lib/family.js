// A family link is stored once, from person_id to related_person_id, and
// `relationship` says what the related person is to the person. Read from
// the other side, the label flips: my parent's child is me.

export const RELATIONSHIPS = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "other", label: "Other" },
];

const INVERSE = { parent: "child", child: "parent", sibling: "sibling", other: "other" };

export function isRelationship(value) {
  return RELATIONSHIPS.some((r) => r.value === value);
}

export function inverseRelationship(value) {
  return value ? INVERSE[value] || value : null;
}

export function relationshipLabel(value) {
  return RELATIONSHIPS.find((r) => r.value === value)?.label || null;
}

// SQL for a person's family members with the label seen from their side.
// Takes the person id four times.
export const FAMILY_MEMBERS_SQL = `
  SELECT p.id, p.first_name, p.last_name, p.email, p.phone,
         CASE
           WHEN fr.person_id = ? THEN fr.relationship
           WHEN fr.relationship = 'parent' THEN 'child'
           WHEN fr.relationship = 'child' THEN 'parent'
           ELSE fr.relationship
         END AS relationship
  FROM family_relationships fr
  JOIN people p
    ON p.id = CASE WHEN fr.person_id = ? THEN fr.related_person_id ELSE fr.person_id END
  WHERE fr.person_id = ? OR fr.related_person_id = ?
  ORDER BY p.last_name, p.first_name
`;

// Create a link between two people, or relabel it if one already exists in
// either direction. `relationship` is what `relatedId` is to `personId`.
export async function linkFamily(run, get, personId, relatedId, relationship) {
  const a = parseInt(personId, 10);
  const b = parseInt(relatedId, 10);
  if (a === b) return;
  const forward = await get(
    "SELECT id FROM family_relationships WHERE person_id = ? AND related_person_id = ?",
    [a, b]
  );
  if (forward) {
    await run("UPDATE family_relationships SET relationship = ? WHERE id = ?", [relationship || null, forward.id]);
    return;
  }
  const reverse = await get(
    "SELECT id FROM family_relationships WHERE person_id = ? AND related_person_id = ?",
    [b, a]
  );
  if (reverse) {
    await run("UPDATE family_relationships SET relationship = ? WHERE id = ?", [
      inverseRelationship(relationship),
      reverse.id,
    ]);
    return;
  }
  await run(
    "INSERT INTO family_relationships (person_id, related_person_id, relationship) VALUES (?, ?, ?)",
    [a, b, relationship || null]
  );
}

export async function unlinkFamily(run, personId, relatedId) {
  await run(
    `DELETE FROM family_relationships
     WHERE (person_id = ? AND related_person_id = ?) OR (person_id = ? AND related_person_id = ?)`,
    [personId, relatedId, relatedId, personId]
  );
}
