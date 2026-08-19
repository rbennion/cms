// Builds a clean database for the browser tests and seeds the one account they
// sign in with. Runs once, before any test.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import pg from "pg";
import bcrypt from "bcryptjs";

export const E2E_USER = { email: "e2e@fightclub.test", password: "e2e-test-password" };

export default async function globalSetup() {
  const env = { ...process.env };
  for (const line of readFileSync(".env.e2e", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  if (!/_e2e(\?|$)/.test(env.POSTGRES_URL || "")) {
    throw new Error(`Refusing to run: not an _e2e database (${env.POSTGRES_URL})`);
  }

  // Real migrations, so the tests run against the schema that ships.
  execFileSync("node", ["scripts/migrate.js"], { env, stdio: "pipe" });

  const pool = new pg.Pool({ connectionString: env.POSTGRES_URL });

  // Empty every table, so a test failing means something rather than depending
  // on whatever the last run happened to leave behind.
  await pool.query(`
    DO $$ DECLARE t record; BEGIN
      FOR t IN SELECT tablename FROM pg_tables
               WHERE schemaname = 'public' AND tablename <> 'schema_migrations' LOOP
        EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t.tablename);
      END LOOP; END $$;
  `);

  await pool.query(
    `INSERT INTO users (email, password_hash, name, is_active, is_admin)
     VALUES ($1, $2, $3, TRUE, TRUE)`,
    [E2E_USER.email, bcrypt.hashSync(E2E_USER.password, 10), "End To End"]
  );

  // A couple of reference rows the forms expect to be able to pick from.
  await pool.query(`INSERT INTO roles (name) VALUES ('Volunteer'), ('Donor')`);
  await pool.query(`INSERT INTO person_types (name) VALUES ('Leader'), ('Student')`);

  await pool.end();
  console.log("e2e database ready");
}
