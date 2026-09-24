# Handoff: waiver sign-on-the-spot + parent/student linking from Group

Branch: `claude/waiver-parent-student-linking-d2rn74` (based on `main` at eecdf29)

## Request (from Rick)

1. Ability to sign the waiver on the spot (in person, on a staff device).
2. From a Group record:
   - Add a new Parent and tie that Parent to a Student.
   - Add a new Student and tie that Student to a Parent.

## Current state

Discussion only. No code has been written. The only file on this branch
beyond `main` is this handoff.

## Findings from the codebase

- E-sign flow: `POST /api/waivers` creates a waiver row with a random token
  and emails a link to `/sign/[token]`. The sign page (`app/sign/[token]/page.js`)
  needs no login and already holds the full form and signature pad. The
  signing URL is returned in the POST response only outside production.
- Paper flow: `POST /api/waivers/paper` inserts a row born `signed` with
  `source = 'paper'`.
- `waivers.source` exists (migration 008). Status labels come from
  `lib/waivers.js` (`deriveWaiverStatus`).
- Group page (`app/groups/[id]/page.js`, Students card ~line 776, Parents card
  ~line 860) adds existing people only, via `MultiSelectSearch` and
  `POST /api/groups/[id]/students` or `/parents`.
- Parent/student link = `family_relationships` (person_id, related_person_id).
  It is undirected: no column says which side is the parent. The person page
  writes it through `PUT /api/people/[id]` with `family_member_ids`.
- `POST /api/people` requires first_name, last_name, email, and phone.
  Students often have no email or phone, so this rule must be relaxed for
  the inline create form.

## Agreed plan (proposed to Rick; not yet approved)

### Item 1: Sign Now
- Add `in_person` as a `source` value. Extend `POST /api/waivers` with
  `{ mode: "in_person" }` (or a new route) that inserts the row, skips email,
  and returns the signing URL to the admin.
- Add a "Sign Now" button in `components/waivers/waivers-card.js` next to
  "Request Waiver". It opens `/sign/[token]` in a new tab.
- Add an "in person" label in `deriveWaiverStatus`.
- Size: about 60 lines.

### Item 2: Create + link from Group
- New routes: `POST /api/groups/[id]/students/create` and
  `POST /api/groups/[id]/parents/create`. Each creates the person, inserts
  the group membership row, and inserts `family_relationships` rows for the
  chosen people from the other card. Wrap in one transaction.
- Relax `POST /api/people` (or the new routes) to require name only.
- Shared inline form component (first, last, email, phone, multi-select of
  the other card's members) used by both cards.
- `GET /api/groups/[id]` should return, for each student, its linked parents,
  and for each parent, its linked students, so the pairing is visible on
  the group page.
- Size: about 300 lines.

## Uncommitted work

None.

## Exact next step

Wait for Rick to say "proceed" (he may also ask for two separate PRs).
Then build Item 1 first, run `npm run lint` and the test suites
(`vitest.config.mjs`, `playwright.config.mjs`), commit, push, and continue
with Item 2.

## How to resume

```
git fetch origin claude/waiver-parent-student-linking-d2rn74
git checkout claude/waiver-parent-student-linking-d2rn74
```
Read this file, then start at "Exact next step".
