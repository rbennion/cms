# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the Fight Club CRM (Contact Relationship Management) application built with Next.js 14 for managing people, companies, donations, certifications, and notes for Fight Club programs.

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Run ESLint
npm run migrate      # Apply pending database migrations
npm run migrate:status  # Show which migrations are applied/pending
npm run migrate:dry-run # Preview what would run
npm run backup       # pg_dump to backups/ with rotation
npm run restore      # Restore from a backup file (requires --confirm)
npm run seed         # Seed sample data (lib/seed.js)
npm run reset-db     # Drop all tables (requires --confirm)
```

Schema is managed via numbered SQL files in `migrations/`. See `BACKUP.md` for full procedures.

## Architecture

### Tech Stack

- **Framework**: Next.js 14.2.5 with App Router
- **Database**: PostgreSQL via pg (Neon-hosted)
- **Styling**: Tailwind CSS with Radix UI components
- **Language**: JavaScript (no TypeScript)

### Key Directories

- `app/api/` - RESTful API routes for all entities (people, companies, donations, certifications, notes)
- `app/[entity]/` - Page routes using Next.js App Router with dynamic `[id]` segments
- `components/ui/` - Reusable UI components built on Radix UI primitives
- `components/[entity]/` - Entity-specific components (forms, tables, dialogs)
- `lib/db.js` - Database wrapper that converts `?` placeholders to PostgreSQL `$1, $2` syntax
- `lib/utils.js` - Formatting utilities (currency, dates, class merging)
- `migrations/` - Numbered SQL migration files (single source of truth for schema)
- `scripts/` - CLI tools: migrate.js, backup.js, restore.js, reset-db.js

### Database Schema

Core tables: `people`, `companies`, `donations`, `certifications`, `notes`, `schools`, `person_types`, `roles`, `engagement_stages`, `groups`, `app_settings`, `users`
Junction tables: `person_type_assignments`, `person_companies`, `person_schools`, `person_roles`, `group_leaders`, `family_relationships`
Schema tracked in: `schema_migrations` table + `migrations/*.sql` files

### Rendering Patterns

- Pages use `"use client"` for interactive components
- API routes use `export const dynamic = 'force-dynamic'` to prevent build-time database queries
- Path alias: `@/*` maps to root directory

### Data Flow

Client components fetch from `/api/` endpoints → API routes use `lib/db.js` query functions → PostgreSQL executes parameterized queries → JSON responses returned with pagination support

## UX Patterns & Conventions

### Navigation Structure

- **Main entities**: Dashboard, People, Companies, Schools, Groups, Donations, Certifications, Waivers, Settings (in that order)
- Schools is a first-class entity in main nav, NOT in settings
- Settings contains only: Person Types and Users (admin only)

### Detail Pages (Person/Company/School)

- **Layout**: 3-column grid (lg:grid-cols-3) - info card left, details right
- **NO TABS** - All information displayed in vertical card stack for easy scanning
- **Inline editing**: Click pencil icon on card header to edit, Save/Cancel buttons appear
- **No separate edit pages** - Everything edits in place on detail view

### Association Management (Bidirectional)

- All associations work both ways: Person↔Company, Person↔School, Company↔Person, School↔Person
- **Pattern**: "Add" button → inline search dropdown (MultiSelectSearch with singleSelect=true) → instant add with X button to remove
- **API endpoints**: `/api/[entity]/[id]/[association]/route.js` with POST (add) and DELETE (remove)
- State management: Local state + fetch after changes, toast notifications

### Component Conventions

- `MultiSelectSearch` component supports `singleSelect` prop for add-one-at-a-time flows
- Cards have consistent header structure: `<CardHeader className="flex flex-row items-center justify-between">`
- Remove buttons use ghost variant: `<Button size="sm" variant="ghost">`
- Version displayed in sidebar under app title

## Environment Variables

Required for database connection (set in `.env.local` or Vercel):

- `POSTGRES_URL` - Pooled connection string
- `POSTGRES_URL_NON_POOLING` - Direct connection for migrations
- `SETUP_SECRET` (optional) - Protects database initialization endpoints
