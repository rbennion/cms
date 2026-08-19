# Browser tests

```bash
npm run test:e2e            # all journeys
npm run test:e2e -- --headed   # watch them happen
```

These drive the real app in a real browser. They answer what the API tests
cannot: is the screen actually wired to the endpoint? The certification bug that
started all this looked fine from the API's side — the control simply was not
connected.

## What they run against

Their own database (`fightclub_e2e`) and their own storage area
(`fightclub-e2e`). Never dev, never staging, never production. The runner refuses
to start if pointed anywhere that is not an `_e2e` database.

Before each run the database is rebuilt from the real migrations, every table is
emptied, and one sign-in is seeded. Starting from empty means a failure means
something, rather than depending on what the last run left behind.

Settings live in `.env.e2e`, which is not committed. Create the database once:

```sql
CREATE DATABASE fightclub_e2e OWNER fightclub;
```

The app is built and served on port 3100 automatically — a production build, not
the development server, so it is closer to what actually ships. Expect a couple
of minutes on a cold run, seconds after that.

## What is covered

| File | Journey |
|---|---|
| `certifications.spec.mjs` | Every control on the checklist: ticking, dates, double clicks, the status line, and that no error appears during ordinary use |
| `records.spec.mjs` | Creating a person with a note, searching, required fields, donations dated correctly, companies and schools, every main page loading |
| `access-and-uploads.spec.mjs` | Signed-out visitors turned away, wrong passwords refused, sessions surviving a reload, documents uploaded and opened, oversized files refused |

## Rules

Nothing sends email. The waiver send and resend flows reach real parents and are
never exercised here.
