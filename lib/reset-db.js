const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
const sql = Object.assign(
  (strings, ...values) => {
    const text = strings.reduce((prev, curr, i) => prev + '$' + i + curr);
    return pool.query(text, values);
  },
  { query: (text, params) => pool.query(text, params) }
);

async function resetDatabase() {
  console.log("Dropping all tables...");

  // Drop tables in correct order (respecting foreign key constraints)
  await sql`DROP TABLE IF EXISTS notes CASCADE`;
  await sql`DROP TABLE IF EXISTS certifications CASCADE`;
  await sql`DROP TABLE IF EXISTS donations CASCADE`;
  await sql`DROP TABLE IF EXISTS person_schools CASCADE`;
  await sql`DROP TABLE IF EXISTS person_companies CASCADE`;
  await sql`DROP TABLE IF EXISTS person_type_assignments CASCADE`;
  await sql`DROP TABLE IF EXISTS person_types CASCADE`;
  await sql`DROP TABLE IF EXISTS schools CASCADE`;
  await sql`DROP TABLE IF EXISTS companies CASCADE`;
  await sql`DROP TABLE IF EXISTS people CASCADE`;

  console.log("All tables dropped successfully!");
}

resetDatabase().catch(console.error);
