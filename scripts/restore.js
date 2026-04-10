const { execSync } = require("child_process");
const fs = require("fs");
const url = require("url");

const connString = process.env.POSTGRES_URL;

if (!connString) {
  console.error("POSTGRES_URL is not set.");
  process.exit(1);
}

// Find psql binary (same Homebrew path pattern as pg_dump)
const psqlPath =
  process.env.PSQL_PATH ||
  "/opt/homebrew/opt/postgresql@17/bin/psql";

// Parse CLI args
const args = process.argv.slice(2);
const confirm = args.includes("--confirm");
const filePath = args.find((a) => !a.startsWith("--"));

if (!filePath) {
  console.error("Usage: node scripts/restore.js <backup-file> --confirm");
  console.error("  e.g. npm run restore -- backups/fightclub-2026-04-09.sql.gz --confirm");
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

// Safety check: warn if restoring to production
const parsed = new url.URL(connString);
if (parsed.hostname.includes("neon.tech")) {
  console.error(
    "\n  WARNING: POSTGRES_URL points to Neon (production)!" +
      "\n  Restoring to production is dangerous." +
      "\n  Set POSTGRES_URL to your local/dev database first.\n"
  );
  if (!confirm) {
    console.error("  Add --confirm to proceed anyway.\n");
    process.exit(1);
  }
  console.error("  Proceeding with --confirm...\n");
}

if (!confirm) {
  console.error("Add --confirm to execute the restore.");
  console.error(`  Target: ${parsed.hostname}`);
  console.error(`  Source: ${filePath}`);
  process.exit(1);
}

// Detect compressed backup
const isGzipped = filePath.endsWith(".gz");

console.log(`Restoring ${filePath} to ${parsed.hostname}...`);

const cmd = isGzipped
  ? `gunzip -c "${filePath}" | ${psqlPath} "${connString}"`
  : `${psqlPath} "${connString}" < "${filePath}"`;

try {
  execSync(cmd, { stdio: "inherit", shell: true });
  console.log("\nRestore complete.");
} catch (err) {
  console.error("\nRestore failed. Check output above for details.");
  process.exit(1);
}
