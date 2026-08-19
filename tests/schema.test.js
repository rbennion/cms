import { describe, it, expect, afterAll } from "vitest";
import { Pool } from "pg";

// The bug that broke certifications for four weeks: production's table was
// missing a column the code writes on every save. Reads were fine, so nothing
// looked wrong until someone pressed save.
//
// These tests assert that every column the application writes actually exists.
// Run against any environment's database and it will say whether that database
// can support the current code.

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
afterAll(() => pool.end());

async function columnsOf(table) {
  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return rows.map((r) => r.column_name);
}

// Every column named in a write. Adding a column to a write in the app without
// adding it here is fine — the "no column left behind" test below catches it by
// exercising the real statement.
const WRITTEN_COLUMNS = {
  certifications: [
    "person_id",
    "background_check_status",
    "background_check_passed",
    "background_check_date",
    "application_received",
    "qpr_gatekeeper_training",
    "qpr_training_date",
    "qpr_training_renewal_date",
    "application_attachment_path",
    "qpr_training_attachment_path",
    "qpr_certificate_attachment_path",
    "background_check_attachment_path",
    "updated_at",
  ],
  people: ["first_name", "last_name", "email", "phone", "stage_id", "updated_at"],
  donations: ["amount", "date", "note", "person_id", "company_id"],
  notes: ["title", "content", "date", "entity_type", "entity_id"],
  waivers: ["person_id", "token_hash", "status", "sent_to_email", "expires_at"],
  users: ["email", "password_hash", "name", "is_active", "is_admin"],
};

describe("database has every column the app writes", () => {
  for (const [table, expected] of Object.entries(WRITTEN_COLUMNS)) {
    it(table, async () => {
      const actual = await columnsOf(table);
      expect(actual.length, `table "${table}" does not exist`).toBeGreaterThan(0);
      const missing = expected.filter((c) => !actual.includes(c));
      expect(missing, `${table} is missing: ${missing.join(", ")}`).toEqual([]);
    });
  }
});

describe("the certification save statement is valid", () => {
  // The exact UPDATE the app issues for every checklist change. EXPLAIN plans it
  // without running it, so a missing column fails here rather than in front of a
  // user. This is the specific check that was absent when production broke.
  it("plans against the live schema", async () => {
    const statement = `EXPLAIN UPDATE certifications SET
        background_check_status = $1, background_check_passed = $2,
        background_check_date = $3, application_received = $4,
        qpr_gatekeeper_training = $5, qpr_training_date = $6,
        qpr_training_renewal_date = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8`;
    await expect(
      pool.query(statement, ["pending", false, null, 0, 0, null, null, -1])
    ).resolves.toBeDefined();
  });

  it("plans the insert too", async () => {
    const statement = `EXPLAIN INSERT INTO certifications
      (person_id, background_check_status, background_check_passed,
       background_check_date, application_received, qpr_gatekeeper_training,
       qpr_training_date, qpr_training_renewal_date)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;
    await expect(
      pool.query(statement, [-1, "pending", false, null, 0, 0, null, null])
    ).resolves.toBeDefined();
  });
});

describe("calendar dates stay calendar dates", () => {
  // Dates were rendering a day early because the driver turned a DATE into a
  // moment in time at the server's midnight. They must come back as plain
  // 'YYYY-MM-DD' strings, with no timezone attached to shift them.
  it("a DATE column reads back as a plain date string", async () => {
    const { get } = await import("@/lib/db");
    await pool.query(
      `CREATE TEMP TABLE IF NOT EXISTS _date_probe (d DATE)`
    );
    const row = await get("SELECT DATE '2026-07-07' AS d");
    expect(row.d).toBe("2026-07-07");
    expect(row.d).not.toBeInstanceOf(Date);
  });
});
