const { pool } = require("../lib/db-cjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

function sha256(content) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    "SELECT filename, checksum FROM schema_migrations ORDER BY filename"
  );
  return new Map(rows.map((r) => [r.filename, r.checksum]));
}

function getPendingMigrations(applied) {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const pending = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    const checksum = sha256(content);

    if (applied.has(file)) {
      // Verify checksum of already-applied migration
      if (applied.get(file) !== checksum) {
        console.error(
          `\nChecksum mismatch for ${file}!` +
            `\n  Applied: ${applied.get(file)}` +
            `\n  Current: ${checksum}` +
            `\n\nAn already-applied migration was modified. This is dangerous.` +
            `\nIf intentional, manually update schema_migrations and re-run.`
        );
        process.exit(1);
      }
    } else {
      pending.push({ filename: file, content, checksum });
    }
  }

  return pending;
}

async function showStatus() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = fs.existsSync(MIGRATIONS_DIR)
      ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
      : [];

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    console.log("\nMigration Status:\n");
    for (const file of files) {
      const status = applied.has(file) ? "applied" : "PENDING";
      const marker = applied.has(file) ? "\u2713" : "\u2022";
      console.log(`  ${marker} ${file}  [${status}]`);
    }
    console.log(
      `\n  ${applied.size} applied, ${files.length - applied.size} pending\n`
    );
  } finally {
    client.release();
  }
}

async function baseline() {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = fs.existsSync(MIGRATIONS_DIR)
      ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
      : [];

    const baselineFile = files[0];
    if (!baselineFile) {
      console.error("No migration files found.");
      process.exit(1);
    }

    if (applied.has(baselineFile)) {
      console.log(`Baseline already recorded: ${baselineFile}`);
      return;
    }

    const content = fs.readFileSync(
      path.join(MIGRATIONS_DIR, baselineFile),
      "utf8"
    );
    const checksum = sha256(content);

    await client.query(
      "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
      [baselineFile, checksum]
    );
    console.log(
      `Baseline recorded: ${baselineFile} (marked as applied without executing)`
    );
  } finally {
    client.release();
  }
}

async function autoBaseline(client, applied) {
  // If schema_migrations is empty but the DB already has tables,
  // record the baseline as applied (skip executing it).
  if (applied.size > 0) return applied;

  const { rows } = await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'people' LIMIT 1"
  );
  if (rows.length === 0) return applied;

  const files = fs.existsSync(MIGRATIONS_DIR)
    ? fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort()
    : [];
  const baselineFile = files[0];
  if (!baselineFile) return applied;

  const content = fs.readFileSync(path.join(MIGRATIONS_DIR, baselineFile), "utf8");
  const checksum = sha256(content);

  await client.query(
    "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
    [baselineFile, checksum]
  );
  console.log(`  Auto-baselined: ${baselineFile} (existing DB detected)`);
  applied.set(baselineFile, checksum);
  return applied;
}

async function migrate(dryRun) {
  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    let applied = await getAppliedMigrations(client);
    applied = await autoBaseline(client, applied);
    const pending = getPendingMigrations(applied);

    if (pending.length === 0) {
      console.log("Database is up to date. No pending migrations.");
      return;
    }

    if (dryRun) {
      console.log("\nDry run -- the following migrations would be applied:\n");
      for (const m of pending) {
        console.log(`  \u2022 ${m.filename}`);
      }
      console.log(`\n  ${pending.length} migration(s) pending.\n`);
      return;
    }

    console.log(`\nApplying ${pending.length} migration(s)...\n`);

    for (const m of pending) {
      const start = Date.now();
      try {
        await client.query("BEGIN");
        await client.query(m.content);
        await client.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [m.filename, m.checksum]
        );
        await client.query("COMMIT");
        const elapsed = Date.now() - start;
        console.log(`  \u2713 ${m.filename}  (${elapsed}ms)`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`\n  \u2717 ${m.filename} FAILED:\n    ${err.message}\n`);
        console.error("Migration aborted. Database unchanged for this migration.");
        process.exit(1);
      }
    }

    console.log(`\nDone. ${pending.length} migration(s) applied.\n`);
  } finally {
    client.release();
  }
}

// CLI
const args = process.argv.slice(2);

let action;
if (args.includes("--status")) action = showStatus;
else if (args.includes("--baseline")) action = baseline;
else if (args.includes("--dry-run")) action = () => migrate(true);
else action = () => migrate(false);

action()
  .catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
  })
  .finally(() => pool.end());
