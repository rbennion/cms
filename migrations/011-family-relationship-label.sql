-- 011-family-relationship-label.sql
-- Label family links. `relationship` says what related_person_id is to
-- person_id: 'parent', 'child', 'sibling', 'other'. NULL means "related",
-- which is what every link recorded before this migration means.

ALTER TABLE family_relationships ADD COLUMN IF NOT EXISTS relationship TEXT;
