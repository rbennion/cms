# Changelog

All notable changes to the Fight Club CRM application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.9.4] - 2026-08-18

### Added
- Notes can now be entered while creating a person, instead of having to save the record and go back in.

### Changed
- Document uploads now accept files up to 100 MB, up from 10 MB. Large files are sent in chunks, so a dropped connection resumes instead of starting the whole upload over. Applies to certification documents and paper waivers.

### Fixed
- Nothing in the Certification Status section could be saved in production. Every save — Application Received, Background Check status and date, QPR Training Complete and its dates — is written by a single database statement, and that statement referenced a column the production database never had, so all of it failed with "Could not save certification". Reading a record still worked, which is why the section looked fine until you touched it. Document uploads were unaffected; they use a different statement. Migration 010 restores the missing columns.
- Dates no longer land a day early. Picking July 7th on a calendar recorded and displayed July 6th for anyone in a US timezone, because the server stored the day as an instant in UTC rather than as a calendar date. Affects donation dates, note dates, and the certification date fields.
- Certification checkboxes and the background check dropdown now respond the moment you click them. Previously they did not move until the save came back from the server, which on a slow connection looked like a dead control — clicking again cancelled out the first click, so the setting appeared stuck. The control now updates immediately and ignores further clicks until the save finishes. If a save fails, the control returns to its saved state and shows the reason. Affects Application Received, QPR Training Complete, and Background Check status.

### Operations
- Migration 010 adds the two missing certification columns (QPR training date, and the background check document path). Both are defined in the baseline schema but were never created in production: the baseline only creates the table if it does not already exist, and production's certifications table predates it, so the baseline was a no-op there. Additive only — it adds the columns where absent and does nothing where they already exist. Applies automatically during the Vercel build.

## [0.9.3] - 2026-07-24

### Changed
- CSV export now respects the filters you have applied. Selecting a View (for example "Donors") and clicking Export now downloads only the records shown in that View, not the entire database. Applies to People, Companies, Schools, and Groups.
- Groups can now be exported — the Groups page has an Export button.
- The People export now includes a Role column.

## [0.9.2] - 2026-07-24

### Changed
- Document uploads now support files up to 10 MB, up from 4 MB. Files upload from your browser directly to secure storage instead of passing through the app server, which is what imposed the old limit. Applies to certification documents and paper waivers.
- PDF, JPG, and PNG were always accepted formats — large scanned PDFs were being rejected for size, not format. Those now upload normally.

## [0.9.1] - 2026-07-22

### Added
- Groups on the People record — a new Groups card shows every group a person belongs to with their role (Primary Leader, Support Leader, Student, or Parent). Add someone to a group right from their record by picking a role and searching for the group; remove with the X. The primary leader is still set on the group page.
- Name, email, and phone are now required when creating or editing a person.

### Changed
- The Training document slot is removed from the QPR block — the QPR Certificate is the only QPR document. Previously uploaded training files remain in storage but are no longer shown.
- Files larger than 4 MB are rejected up front with a clear message ("This file is 5.0 MB — the limit is 4 MB") instead of failing with a confusing network error. Applies to certification documents and paper waivers.

### Fixed
- Entering QPR training and renewal dates right after an upload no longer fails with "Could not save certification". Rapid edits were racing the record being created behind the scenes; saves now run one at a time and the server resolves the collision safely.
- Typing in a date field no longer gets wiped or locked up while a previous change is still saving.
- Uploaded certification documents keep their original file name in the display.

## [0.9.0] - 2026-07-20

### Added
- Waivers page in the main navigation — every waiver request in one list with plain-language status, a Sent → Signed → Document progress line, name/email search, and count cards (Waiting for Signature / Link Expired / Signed) that filter on click.
- Record Paper Waiver — upload a scan or phone photo (PDF, JPG, PNG) of a form signed in person, right from the person's Waivers card. Stored as a signed waiver marked "Paper form on file" with the same View button as e-signed waivers. (migration 008)
- Background check Check Date field. Expiration is computed from the check date plus a policy period (default 2 years, stored in app settings) and shown in plain words — "Valid until Jun 3, 2028" or "Expired May 1, 2025 — needs a new check". Expiring and expired checks drive the overall certification status automatically. (migration 007)
- Certification documents now show their file name, size, and upload date. Original file names are preserved on new uploads; older files show accurate dates recovered from storage.
- Overall certification status line with the reason spelled out — for example "Expired — background check expired May 1, 2025" or "In Progress — 2 of 3 requirements met".

### Changed
- Certifications page redesigned as a roster: one computed status per person (Certified / In Progress / Needs Attention / Not Started), check icons for the three requirements, and clicking a row opens the checklist in a side panel. The Add Certification dialog is gone — every person implicitly has a checklist, created automatically on first edit or upload.
- The certification checklist is now a single edit surface used on both the Certifications page and the People record. Controls are live and save on change — no edit mode, no pencil icon. Document actions are labeled buttons: Upload, View, Replace.
- Replacing a certification document now deletes the old file from storage instead of leaving it orphaned.
- Background check "passed" is derived from the status (Passed means approved) — the separate Passed checkbox is gone and the two fields can no longer disagree. The manual "Expired" dropdown option is removed; expiry is computed from the check date. Migration 009 reconciles existing rows once so no record loses its passed state.
- QPR Certificate is folded into the QPR Training block — the card reads as exactly three steps: Application, Background Check, QPR Training.
- Waiver rows state their step in a sentence — "Sent Jul 20 — link expires Aug 19", "Link expired Jul 15 — send a new one", "Signed by Jane Doe on May 10". Expired links are detected automatically instead of showing "pending" forever, and the resend button relabels to "Send new link" when the link is dead.
- Viewing a signed waiver generates the PDF automatically on first view — the separate "Generate PDF" step is gone.

### Fixed
- All four Certifications regressions from the 5/27 QA (FCC034): saving a certification from the People record no longer errors (the API now updates the existing record instead of rejecting), document attach is available from the start, selecting a person in a search dropdown now visibly shows the selection, and adding a certification from the list view works via the new panel.
- Single-select search dropdowns across People, Companies, and Schools association flows now display the chosen item instead of appearing to do nothing.

### Operations
- Migrations 007 (background check date + policy setting), 008 (paper waivers), and 009 (background check field reconciliation) apply automatically during the Vercel build.
- README deployment section rewritten to match the real pipeline (push to main, build-time migrations, full environment variable table).

## [0.8.1] - 2026-05-26

### Fixed
- Create Certification dialog on People detail now surfaces server errors as a toast instead of silently swallowing them. Previously, clicking Create Certification on a person who already had a cert appeared to do nothing because the 400 response was dropped. (FCC033)
- Add Certification dialog Initial Status dropdown was sending a field name the API did not read, and offered values that violate the database enum. Rewired to background_check_status with the real enum values (pending, approved, denied, expired).
- QPR Certificate, QPR Training, and Application document uploads now succeed in production. All certification upload routes were passing access public to a Vercel Blob store that v0.7.1 switched to private, causing every new upload since to return HTTP 500. Existing pre-v0.7.1 attachment URLs still resolve via a legacy redirect. (FCC032)

### Changed
- Certification document uploads now store the blob pathname (private access) instead of a public URL. New auth-gated GET endpoints stream the file to logged-in users only — QPR Certificate, QPR Training, and Application attachments are no longer addressable as public URLs.
- Upload dialogs on People detail and Certifications list now show accepted file types (PDF, JPG, PNG, DOC, DOCX) and add an accept filter on the file picker so users no longer pick a .txt only to be rejected.

## [0.8.0] - 2026-05-20

### Added
- QPR Certificate attachment slot on certifications — distinct from QPR Training attachment. New column `qpr_certificate_attachment_path` (migration 004). Upload and display wired on People detail and Certifications list.
- Background Check Passed explicit boolean — replaces the previous file-upload requirement. New column `background_check_passed` (migration 004). Checkbox in cert edit forms; Passed / Not Passed badge in read mode.
- Students and Parents membership on Groups — two new junction tables `group_students` and `group_parents` (migration 005). New API routes for adding and removing students or parents. Two new cards on the Group detail page mirroring the Support Leaders pattern.
- Primary leader now shown on School view's Groups table, labeled with a "Primary" badge above support leaders.
- Address fields (street, city, state, zip) on the People detail Contact Information edit form.

### Changed
- "Additional Leaders" renamed to "Support Leaders" in the group form dialog and on the Group detail card.
- School view "People" card renamed to "Staff".
- Groups list rows are now fully clickable — clicking anywhere on the row navigates to the group. Same on School view's Groups table.
- Background Check upload UI removed from People detail and Certifications list. Status dropdown plus the new Passed checkbox are the records of pass.
- Certification upload error toasts now surface the server-side error message (file too big, invalid type, etc.) instead of a generic "Failed to upload file".
- Removed duplicate "Meeting Location" surface on the Group detail and edit form. The legacy single-string field is no longer rendered or editable in the UI; the structured Meeting Locations card is now the canonical store. Migration 006 copies any legacy values into the structured table as the primary location. School view's Meeting Location column now reads from the structured table.

### Fixed
- Leader count was undercounting groups with a primary leader. The count now adds 1 when a primary leader is set, both on the Groups list and the School view.

### Operations
- Migrations 004, 005, and 006 must be applied on prod via `npm run migrate`.

### Pending / Out of scope
- Real-device mobile signature pad test — manual QA, will log results separately.
- Mailbox alias for `waiver@fightclub-us.com` — blocked on custom-domain decision.

## [0.7.2] - 2026-05-15

### Fixed
- Waiver email sometimes failed with M365 `430 4.2.0 STOREDRV AuthenticationContext has no rights on this session` — a transient Exchange permission-propagation hiccup. SMTP send now retries up to 4 times with 1s/2s/4s backoff and mints a fresh OAuth token each attempt.

## [0.7.1] - 2026-05-15

### Fixed
- Public sign page button rendered literal "Sign &amp; Submit" — JSX entity inside a JS string literal isn't decoded. Now plain "Sign & Submit".
- Signed waiver PDF storage now uses Vercel Blob's `access: 'private'` (was `'public'`, which is rejected by private stores). Signed minor waivers were never meant to be world-readable.

### Changed
- Email transport switched from SMTP basic auth to **M365 OAuth2 client-credentials**. Removes dependency on App Passwords (M365 Security Defaults blocks them) and basic auth (deprecated by Microsoft).
  - New env vars: `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`.
  - Retired: `SMTP_PASS`.
- `GET /api/waivers/[id]/pdf` added — admin-only route that streams the signed PDF from the private blob store. UI now links to this route instead of the raw blob URL.

### Operations
- Azure AD app `Fight Club CRM — Waiver SMTP` registered, granted `SMTP.SendAsApp`. Service principal granted `FullAccess` on `waiver@fightclubus.onmicrosoft.com` via Exchange Online PowerShell.
- All M365 OAuth creds stored in 1Password "Clients" vault.

## [0.7.0] - 2026-05-13

### Added
- Parental waiver e-signing feature
  - New `waivers` table tracking liability + photo/name release decisions per participant
  - Admin "Request Waiver" flow on person detail page emails parent a unique signing link
  - Public `/sign/[token]` page with waiver text, radio choices, name input, and signature pad — no login required
  - Audit trail captured per signing: IP address, user agent, timestamp, SHA256 of signed PDF
  - Signed PDF generated via `pdf-lib` with appended Signature & Audit page
  - Admin "Generate PDF" button on signed waivers without a PDF (out-of-band generation)
  - `guardian_email` column added to `people` for parent contact (separate from participant's own email)
- Email via SMTP / nodemailer (env vars: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `EMAIL_FROM_NAME`, `NEXT_PUBLIC_APP_URL`); falls back to console log when credentials absent (dev)
- Signed PDFs stored via `@vercel/blob` for serverless persistence (matches existing certifications upload pattern)

### Changed
- Middleware now allows `/sign` and `/api/sign` as public routes
- Sidebar + MainContent hide on `/sign/[token]` for clean parent-facing UI

### Migration
- `003-waivers.sql` adds `waivers` table + `people.guardian_email` column

## [0.6.1] - 2026-04-10

### Security
- Auth checks on all 44 API routes (requireAuth/requireAdmin)
- File type validation on certification document uploads (PDF, JPG, PNG, DOC, DOCX only)
- Admin-only gating on setup, debug, and purge endpoints

### Added
- Database migration system with numbered SQL files and version tracking (`npm run migrate`)
- Backup/restore scripts with pg_dump rotation and Neon production safety guards (`npm run backup`)
- Migrations run automatically during Vercel builds (pre-build step)
- `BACKUP.md` operational runbook

### Changed
- All remaining `sql` tagged template calls migrated to `get()/all()/run()` helpers
- Export endpoint consolidated to `/api/export` (removed duplicate `/api/people/export`)
- Setup route simplified to point at migration system (no more inline DDL)

### Fixed
- Production schema drift: certifications column renames applied via migration 002
- `params.id` async access in schools/companies detail routes
- Stale column references (is_donor, is_fc_certified) removed from seed data and exports

### Removed
- `lib/init-db.js`, `lib/reset-db.js` (replaced by `scripts/migrate.js`, `scripts/reset-db.js`)
- Ad-hoc migration routes (`/api/setup/migrate`, `/api/setup/migrate-roles`)
- Duplicate schools settings pages (`/settings/schools/`)
- Unused tabs component and `@radix-ui/react-tabs` dependency
- `lib/import-csv.js` and `/api/setup/import-csv` (stale column references)

## [0.6.0] - 2026-04-09

### Added
- Inline row editing on certifications list (status, checkboxes, dates — save in place)
- Document upload buttons for all three certification types (Background Check, Application, QPR Training) on both certifications list and people detail pages
- Document link icons appear when attachments exist
- QPR Training Renewal Date field throughout (add dialog, inline edit, people detail)
- Application Received checkbox in add certification dialog
- Certification edit mode on people detail page (pencil icon on cert card)
- Person addresses displayed on school detail page

### Changed
- Renamed "QPR Gatekeeper Training" to "QPR Training" across all UI labels
- File uploads now use Vercel Blob storage instead of local filesystem (persistent across deployments)
- Default branch simplified to `main` (removed legacy claude branch)

### Fixed
- Column name mismatch: code referenced `training_complete` but DB column is `qpr_gatekeeper_training` — fixed in 8 files
- Training upload endpoint was broken in production due to wrong column names
- Removed reference to dropped `is_fc_certified` column in certification creation
- Database schema in `init-db.js` now matches `setup/route.js`

## [0.5.0] - 2026-03-14

### Added
- Groups promoted to first-class entity with dedicated main navigation item
- Groups list page with search, filters, and DataTable
- Groups detail page with 3-column grid layout and inline editing
- Group meeting locations management with dedicated API endpoints
- Primary and non-primary leader support for groups
- Groups export and import support (CSV)
- Family members column in people export/import
- Certifications search by name and email
- Clickable application_received toggle on certifications page

### Changed
- Groups schema enhanced: added `primary_leader_id`, `status`, and `year` as INTEGER
- New `group_meeting_locations` table added to schema

### Removed
- `is_donor`, `is_fc_certified`, and `children` fields removed from people schema, form, API, list, and detail pages

## [0.4.0] - 2026-02-27

### Added
- Groups as sub-entity under Schools with gender, year, leaders, meeting location, and notes
- Family relationships between People records (bidirectional)
- Filtered export functionality (CSV and Email List) for People
- Add certifications directly from People detail page
- Background check attachment upload for certifications
- Groups management section on school detail page with stat cards, filterable table, and add/edit/delete
- Missing database tables: `roles`, `engagement_stages`, `person_roles`
- `stage_id` column on people table

### Changed
- Training field renamed to "QPR Gatekeeper Training" with date field
- Groups management moved from orphaned settings route to main school detail page

### Fixed
- Escape quotes in JSX to resolve ESLint build errors

## [0.3.0] - 2026-02-03

### Added
- User account page with password change functionality
- Uploadable logo in app settings (displayed on login and sidebar)
- Configurable app name in settings
- Show/hide password toggle on login screen
- Certification status selection on person detail page
- DataTable component with sorting, filtering, and pagination
- Column definitions for People, Companies, Donations, and Schools
- SearchableSelect, MultiSelectFilter, and AddressFields shared components
- Association manager component for bidirectional entity relationships
- Roles and engagement stages management in settings
- Export API with broader entity support
- Import dialog with enhanced functionality
- Accordion, RadioGroup, and Sheet UI components
- Navigation configuration module (`lib/navigation.js`)

### Changed
- People, Companies, Donations, and Schools list pages rebuilt with DataTable
- Person form and detail page significantly enhanced
- Sidebar updated with app logo and name from settings
- Settings page streamlined with cleaner menu structure

### Removed
- Self-registration option from login page
- Redundant breadcrumbs from detail pages

### Fixed
- Logo stored as base64 in database for Vercel compatibility
- ESLint errors from unescaped quotes and apostrophes in JSX
- Login page layout issues
- Mobile navigation with hamburger menu and drawer

## [0.2.0] - 2026-01-31

### Added
- Rebrand to "Fight Club CRM"
- Schools promoted to main navigation (from Settings)
- Inline editing on Person, Company, and School detail pages
- Bidirectional association management (Person-Company, Person-School, Company-Person, School-Person)
- Inline add/remove for associations with search dropdowns
- MultiSelectSearch component with single-select mode
- Version display in sidebar
- User management in settings (create, edit, reset passwords)
- Authentication system with NextAuth v5 (login, registration, forgot/reset password)
- Export and import functionality for all entities (CSV)
- Saved views with save/load dialogs
- Middleware for route protection
- Database CLI import script (`lib/import-csv.js`)
- Comprehensive README.md and CLAUDE.md

### Changed
- All detail pages display information in vertical card stack (no tabs)
- Settings page simplified to Person Types and Users only
- People and certifications features enhanced: inline company creation, type editing, partial updates
- Mobile-friendly UI with responsive card views and wrapping filters
- Amber-minimal theme applied (warm amber tones, dark mode support)

### Fixed
- AUTH_SECRET used instead of NEXTAUTH_SECRET for NextAuth v5 compatibility

## [0.1.0] - 2026-01-29

### Added
- Initial application built with Next.js 14 (App Router), Tailwind CSS, and Radix UI
- Dashboard with summary stats, recent donations, and activity feed
- People management with filtering, search, and person type assignments
- Company management with linked contacts
- Donation tracking with statistics and date range filtering
- FC certification management with status tracking and file uploads
- Notes system for people and companies
- Settings pages for schools and person types
- Database layer with PostgreSQL via @vercel/postgres (parameterized query wrapper)
- Database initialization and seed scripts

### Fixed
- PostgreSQL compatibility and client-side routing issues
- Build-time database queries prevented with `force-dynamic` exports
- Migrated from sql.js to Turso, then to Vercel Postgres for deployment compatibility
