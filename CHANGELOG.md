# Changelog

All notable changes to the Fight Club CRM application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
