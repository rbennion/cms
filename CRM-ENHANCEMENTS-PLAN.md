# CRM Enhancements Plan - 3/14/26

## Context

The Fight Club CRM needs enhancements to support Groups as a first-class entity, simplify the People data model by removing unused fields, and improve Certifications management. This aligns the CRM with actual workflow needs: Groups are core to organizing Fight Club programs, while fields like "Donor" and "FC Certified" on People are legacy and redundant (Certifications has its own table).

---

## Phase 1: Schema Changes

### 1.1 Groups Table Enhancements
**Files:** `app/api/setup/route.js`, `lib/init-db.js`

- Change `year TEXT` to `year INTEGER` (4-digit year)
- Add `primary_leader_id INTEGER REFERENCES people(id) ON DELETE SET NULL`
- Add `status TEXT CHECK(status IN ('Active', 'Inactive', 'Alumni')) DEFAULT 'Active'`

### 1.2 New Group Meeting Locations Table
**Files:** `app/api/setup/route.js`, `lib/init-db.js`

```sql
CREATE TABLE group_meeting_locations (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 People Table Removals
**Files:** `app/api/setup/route.js`, `lib/init-db.js`

Remove columns:
- `children TEXT`
- `is_donor BOOLEAN`
- `is_fc_certified BOOLEAN`

Keep: `is_board_member`

---

## Phase 2: People Simplification

### 2.1 PersonForm Updates
**File:** `components/people/person-form.js`

Remove:
- `is_donor` checkbox
- `is_fc_certified` checkbox
- `children` textarea (entire "Additional Information" card)
- Remove from formData state

### 2.2 People API Updates
**Files:** `app/api/people/route.js`, `app/api/people/[id]/route.js`

- Remove `is_donor`, `is_fc_certified`, `children` from SELECT, INSERT, UPDATE
- Remove filter parameters for `is_donor`, `is_fc_certified`

### 2.3 People List Page Updates
**File:** `app/people/page.js`

- Remove `is_donor` and `is_fc_certified` filter dropdowns
- Remove "Donor" and "Certified" badges from Status column

### 2.4 People Detail Page Updates
**File:** `app/people/[id]/page.js`

- Remove `children` display section
- Remove "Donor" and "FC Certified" status badges

---

## Phase 3: Groups as First-Class Entity

### 3.1 Add to Navigation
**File:** `components/layout/sidebar.js`

Insert after Schools:
```javascript
{ href: "/groups", label: "Groups", icon: UsersRound },
```

### 3.2 Create Groups List Page
**New file:** `app/groups/page.js`

Features:
- Search by group name, school name, leader name
- Filter by: school, gender, status, year
- Table: Name, School, Gender, Year, Status, Primary Leader, Leaders Count
- Add/Edit/Delete actions
- Export/Import buttons

### 3.3 Create Group Detail Page
**New file:** `app/groups/[id]/page.js`

Layout (3-column grid):
- Left: Group info card (inline edit)
- Right: Primary Leader card, Additional Leaders card, Meeting Locations card

### 3.4 Update GroupForm Component
**File:** `components/groups/group-form.js`

Changes:
- Replace checkbox list with MultiSelectSearch for leaders
- Sort leaders alphabetically by first name
- Change year input to number type with 4-digit validation
- Add status dropdown (Active/Inactive/Alumni)
- Add separate primary_leader_id field (MultiSelectSearch with singleSelect)
- Ensure Save button is present

### 3.5 Groups API Updates
**Files:** `app/api/groups/route.js`, `app/api/groups/[id]/route.js`

- Accept/return `primary_leader_id`, `status`, `year` (as integer)
- Include primary leader details via JOIN
- Add status filter parameter

### 3.6 Meeting Locations API
**New file:** `app/api/groups/[id]/meeting-locations/route.js`

- GET: List locations for group
- POST: Add location
- DELETE: Remove location

---

## Phase 4: Export/Import Enhancements

### 4.1 Family Export
**File:** `app/api/export/route.js`, `app/api/people/export/route.js`

Add `family_members` column to people export:
- Query `family_relationships` table
- Format: "FirstName1 LastName1; FirstName2 LastName2"

### 4.2 Family Import
**File:** `app/api/import/route.js`

Add `family_members` field mapping:
- Split by semicolon
- Lookup person by "FirstName LastName"
- Insert into `family_relationships`

### 4.3 Groups Export
**File:** `app/api/export/route.js`

Add `entityType === "groups"` support:
- Fields: name, school_name, gender, year, status, primary_leader_name, notes

### 4.4 Groups Import
**File:** `app/api/import/route.js`

Add groups import:
- Required: name, school_name, gender
- Optional: year, status, primary_leader_name

### 4.5 Import/Export UI
**Files:** `components/shared/export-button.js`, `components/shared/import-dialog.js`

- Add groups to entity type options
- Add FIELD_OPTIONS.groups mapping

---

## Phase 5: Certifications Enhancements

### 5.1 Add Search
**File:** `app/certifications/page.js`

- Add search input above filters
- Add `search` to filter state
- Pass search param to API

### 5.2 API Search Support
**File:** `app/api/certifications/route.js`

- Add `search` parameter
- Search across `first_name`, `last_name`, `email` with ILIKE

### 5.3 Enhanced Editing
**File:** `app/certifications/page.js`

Current capabilities:
- Status editing via dialog
- Training toggle
- Application/Training file upload

Enhancements:
- Add application_received toggle (similar to training)
- Consider full edit dialog for all fields

---

## Verification

1. **Schema**: Run `npm run init-db` or hit `/api/setup?reset=true` to apply changes
2. **People**: Create/edit person, verify removed fields don't appear
3. **Groups**: Navigate to Groups, create group with primary/non-primary leaders, multiple meeting locations
4. **Export**: Export people CSV, verify family_members column present
5. **Import**: Import people CSV with family_members, verify relationships created
6. **Certifications**: Search by name, verify results filter correctly

---

## Key Files Summary

| Area | Files |
|------|-------|
| Schema | `lib/init-db.js`, `app/api/setup/route.js` |
| Navigation | `components/layout/sidebar.js` |
| People | `components/people/person-form.js`, `app/api/people/route.js`, `app/api/people/[id]/route.js`, `app/people/page.js`, `app/people/[id]/page.js` |
| Groups | `app/groups/page.js` (new), `app/groups/[id]/page.js` (new), `components/groups/group-form.js`, `app/api/groups/route.js`, `app/api/groups/[id]/route.js` |
| Export/Import | `app/api/export/route.js`, `app/api/people/export/route.js`, `app/api/import/route.js`, `components/shared/export-button.js`, `components/shared/import-dialog.js` |
| Certifications | `app/certifications/page.js`, `app/api/certifications/route.js` |

---

## Reusable Components

- `MultiSelectSearch` (`components/ui/multi-select-search.js`) - use with `singleSelect` prop for primary leader
- `SearchInput` - for certifications search
- `ExportButton` / `ImportDialog` - extend for groups
