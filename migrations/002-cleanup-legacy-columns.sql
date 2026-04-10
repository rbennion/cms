-- 002-cleanup-legacy-columns.sql
-- Drop columns that have been migrated to the roles system.
-- Rename certifications columns to match codebase (prod drift fix).

-- Drop legacy columns from people
ALTER TABLE people DROP COLUMN IF EXISTS is_board_member;
ALTER TABLE people DROP COLUMN IF EXISTS is_donor;
ALTER TABLE people DROP COLUMN IF EXISTS is_fc_certified;
ALTER TABLE people DROP COLUMN IF EXISTS children;

-- Rename certifications columns if they still have old names
-- (production Neon DB has training_complete / training_attachment_path)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certifications' AND column_name = 'training_complete'
  ) THEN
    ALTER TABLE certifications RENAME COLUMN training_complete TO qpr_gatekeeper_training;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'certifications' AND column_name = 'training_attachment_path'
  ) THEN
    ALTER TABLE certifications RENAME COLUMN training_attachment_path TO qpr_training_attachment_path;
  END IF;
END $$;

-- Add stage_id FK constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'people_stage_id_fkey'
  ) THEN
    BEGIN
      ALTER TABLE people ADD CONSTRAINT people_stage_id_fkey
        FOREIGN KEY (stage_id) REFERENCES engagement_stages(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;
