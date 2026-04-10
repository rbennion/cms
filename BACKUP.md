# Database Migration & Backup Runbook

## Migrations

Schema is managed via numbered SQL files in `migrations/`. A `schema_migrations` table tracks what has been applied.

### Commands

```bash
npm run migrate          # Apply all pending migrations
npm run migrate:status   # Show applied vs pending
npm run migrate:dry-run  # Preview without executing
```

### Adopting an existing database

If the database already has tables but no `schema_migrations` table:

```bash
npm run migrate -- --baseline   # Records 001-baseline.sql as applied without running it
npm run migrate                 # Applies remaining migrations (002+)
```

### Creating a new migration

1. Create `migrations/NNN-description.sql` (zero-padded 3-digit number)
2. Write forward-only SQL (no down migrations)
3. Use `IF NOT EXISTS` / `IF EXISTS` for safety where possible
4. Test locally: `npm run migrate`
5. Commit the file, deploy, run `npm run migrate` in production

### Pre-deploy checklist

1. `npm run backup` (take a backup first)
2. `npm run migrate:dry-run` (verify what will run)
3. `npm run migrate` (apply)
4. Smoke test the app
5. Deploy to Vercel

## Backups

### Local backups (pg_dump)

```bash
npm run backup                    # Dump to backups/ (gzipped, rotated)
npm run backup -- --plain         # Uncompressed .sql
npm run backup -- --keep 20       # Keep last 20 backups instead of 10
```

Backups go to `backups/fightclub-YYYY-MM-DD-HHmmss.sql.gz`. Old backups auto-rotate (default: keep 10).

### Restoring

```bash
npm run restore -- backups/fightclub-2026-04-09.sql.gz --confirm
```

The restore script warns if `POSTGRES_URL` points to Neon (production). Set it to your local DB first.

### Neon PITR (Production)

Neon provides automatic point-in-time recovery:
- **Free tier**: 24 hours of history
- **Pro tier**: 7 days of history

Use Neon branching to test migrations safely:
1. Create a branch in Neon console
2. Point `POSTGRES_URL` at the branch
3. Run `npm run migrate`
4. Verify, then run against the main branch

### Full reset

```bash
npm run reset-db -- --confirm   # Drop ALL tables
npm run migrate                 # Rebuild from scratch
npm run seed                    # Optional: load sample data
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | Primary connection string |
| `POSTGRES_URL_NON_POOLING` | Direct connection for pg_dump (Neon) |
| `PG_DUMP_PATH` | Path to pg_dump v17 binary |
| `PSQL_PATH` | Path to psql v17 binary |
