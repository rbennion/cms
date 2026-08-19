# Tests

```bash
npm test          # run everything once
npm run test:watch
```

## What they run against

Tests use their **own database**, never dev and never production. `tests/setup.js`
refuses to run if `POSTGRES_URL` does not name a database ending in `_test`.

Two local files supply the connection details. Neither is committed.

**`.env.test`** — required.

```
POSTGRES_URL=postgresql://fightclub:<password>@192.168.1.250:5435/fightclub_test
```

Create the database once:

```sql
CREATE DATABASE fightclub_test OWNER fightclub;
```

The schema is built by running the real migrations before the suite starts, so
the tests exercise the migrations themselves rather than a hand-kept copy.

**`.env.storage.test`** — optional. Points at a storage service for the document
tests. Without it those tests are skipped rather than silently passing.

```
S3_ENDPOINT=http://192.168.1.250:9000
S3_PUBLIC_ENDPOINT=http://192.168.1.250:9000
S3_BUCKET=fightclub
S3_ACCESS_KEY_ID=fightclub
S3_SECRET_ACCESS_KEY=<password>
S3_REGION=us-east-1
```

## What is covered

| File | Area |
|---|---|
| `schema.test.js` | Every column the app writes exists; the certification save statement is valid against the live schema; dates come back as calendar dates |
| `dates.test.js` | Calendar-date handling pinned to a US timezone, background check expiry, overall certification status |
| `certifications-api.test.js` | The checklist: create, update, partial saves, all three dates, colliding saves, error cases |
| `people-api.test.js` | People: required fields, search, edit, notes, delete |
| `entities-api.test.js` | Companies, schools, groups, and joining people to each |
| `donations-notes-api.test.js` | Donations, notes, dashboard figures |
| `storage.test.js` | Document storage, signed upload links, allowed types, size enforcement |
| `settings-waivers-api.test.js` | Reference lists, waivers (read only), saved views, exports, release notes |

## Rules

**Nothing sends email.** Waiver send, waiver resend and password reset all mail
real people from the real mailbox. Tests cover everything around them and never
call them.

**Test records are prefixed `ZZTest`** and cleaned up afterwards, so anything left
behind by an interrupted run is obvious.

## Known gaps

`people-api.test.js` carries one deliberate expected failure: deleting a person
leaves their notes behind, because notes are attached by type and id rather than
by a database relationship. It is marked as an expected failure so it stays
visible instead of being forgotten.
