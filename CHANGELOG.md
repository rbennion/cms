# Changelog

All notable changes to the Fight Club CRM application will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
