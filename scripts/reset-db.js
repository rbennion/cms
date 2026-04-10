const { pool } = require("../lib/db-cjs");

const args = process.argv.slice(2);

if (!args.includes("--confirm")) {
  console.error("This will DROP ALL TABLES. Run with --confirm to proceed.");
  console.error("  node scripts/reset-db.js --confirm");
  process.exit(1);
}

async function resetDatabase() {
  console.log("Dropping all tables...\n");

  const tables = [
    "schema_migrations",
    "saved_views",
    "user_permissions",
    "password_reset_tokens",
    "users",
    "notes",
    "certifications",
    "donations",
    "person_schools",
    "person_companies",
    "person_type_assignments",
    "person_roles",
    "person_types",
    "roles",
    "engagement_stages",
    "family_relationships",
    "group_meeting_locations",
    "group_leaders",
    "groups",
    "app_settings",
    "schools",
    "companies",
    "people",
  ];

  for (const table of tables) {
    await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    console.log(`  Dropped ${table}`);
  }

  console.log("\nAll tables dropped. Run 'npm run migrate' to rebuild schema.");
}

resetDatabase()
  .catch((err) => {
    console.error("Reset failed:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
