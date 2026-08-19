// Shared helpers for the API tests. Session stubbing lives in each test file,
// at the top level, because module mocks are hoisted and must be declared there.

export const json = (url, method, body) =>
  new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

export const params = (id) => ({ params: { id: String(id) } });

// Test records are prefixed so anything left behind by a crashed run is obvious
// and easy to sweep up.
export const TEST_PREFIX = "ZZTest";

export async function cleanupTestRecords() {
  const { query } = await import("@/lib/db");
  await query("DELETE FROM donations WHERE note LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM notes WHERE content LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM groups WHERE name LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM schools WHERE name LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM companies WHERE name LIKE ?", [`${TEST_PREFIX}%`]);
  await query("DELETE FROM people WHERE first_name LIKE ?", [`${TEST_PREFIX}%`]);
}
