-- 009-reconcile-bg-passed.sql
-- The UI now derives background_check_passed from background_check_status
-- (passed ⇔ approved). Before this, the two fields were set independently and
-- can disagree on existing rows. Reconcile once so no record loses its
-- "passed" tick on its next edit:
--   1. A ticked "passed" on a still-pending row means the check really passed
--      — promote the status.
--   2. Then align the boolean with the status everywhere.

UPDATE certifications
SET background_check_status = 'approved', updated_at = CURRENT_TIMESTAMP
WHERE background_check_passed = TRUE
  AND (background_check_status IS NULL OR background_check_status = 'pending');

UPDATE certifications
SET background_check_passed = (background_check_status = 'approved'),
    updated_at = CURRENT_TIMESTAMP
WHERE background_check_passed IS DISTINCT FROM (background_check_status = 'approved');
