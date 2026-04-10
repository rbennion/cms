const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const url = require("url");

const BACKUPS_DIR = path.join(__dirname, "..", "backups");
const DEFAULT_KEEP = 10;

// Prefer non-pooling URL (required for Neon pg_dump), fall back to POSTGRES_URL
const connString =
  process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!connString) {
  console.error("POSTGRES_URL is not set.");
  process.exit(1);
}

// Find pg_dump binary
const pgDumpPath =
  process.env.PG_DUMP_PATH ||
  "/opt/homebrew/opt/postgresql@17/bin/pg_dump";

try {
  execSync(`${pgDumpPath} --version`, { stdio: "pipe" });
} catch {
  console.error(
    `pg_dump not found at: ${pgDumpPath}\n` +
      "Set PG_DUMP_PATH env var or install: brew install postgresql@17"
  );
  process.exit(1);
}

// Parse CLI args
const args = process.argv.slice(2);
const keepIdx = args.indexOf("--keep");
const keep = keepIdx !== -1 ? parseInt(args[keepIdx + 1], 10) : DEFAULT_KEEP;
const plain = args.includes("--plain");

// Ensure backups dir exists
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// Build filename
const now = new Date();
const ts = now.toISOString().replace(/[T:]/g, "-").replace(/\..+/, "");
const ext = plain ? ".sql" : ".sql.gz";
const filename = `fightclub-${ts}${ext}`;
const outputPath = path.join(BACKUPS_DIR, filename);

// Detect if this is a Neon/production DB
const parsed = new url.URL(connString);
if (parsed.hostname.includes("neon.tech")) {
  console.log("Backing up PRODUCTION (Neon) database...");
} else {
  console.log(`Backing up ${parsed.hostname}...`);
}

// Run pg_dump
const dumpCmd = plain
  ? `${pgDumpPath} --column-inserts --no-owner --no-acl "${connString}" > "${outputPath}"`
  : `${pgDumpPath} --column-inserts --no-owner --no-acl "${connString}" | gzip > "${outputPath}"`;

try {
  execSync(dumpCmd, { stdio: "pipe", shell: true });
} catch (err) {
  console.error("pg_dump failed:", err.stderr?.toString() || err.message);
  process.exit(1);
}

const size = fs.statSync(outputPath).size;
const sizeStr =
  size > 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${(size / 1024).toFixed(1)} KB`;

console.log(`Backup saved: ${outputPath} (${sizeStr})`);

// Rotate old backups
const backups = fs
  .readdirSync(BACKUPS_DIR)
  .filter((f) => f.startsWith("fightclub-") && (f.endsWith(".sql") || f.endsWith(".sql.gz")))
  .sort()
  .reverse();

if (backups.length > keep) {
  const toDelete = backups.slice(keep);
  for (const f of toDelete) {
    fs.unlinkSync(path.join(BACKUPS_DIR, f));
    console.log(`  Rotated out: ${f}`);
  }
}

console.log(`Retaining ${Math.min(backups.length, keep)} backup(s).`);
