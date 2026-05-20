-- 006-migrate-meeting-location.sql
-- v0.8.0 FCC021 — Resolve duplicate "Meeting Location" UI
--
-- The legacy `groups.meeting_location` (single text column) duplicates the
-- structured `group_meeting_locations` table. The structured table is the
-- canonical form (supports multiple locations + is_primary flag).
--
-- This migration copies any legacy `meeting_location` value into the structured
-- table as the primary location, for groups that have no structured entries yet.
-- The legacy column is left in place for back-compat (sunset in a later cleanup).

INSERT INTO group_meeting_locations (group_id, name, is_primary)
SELECT g.id, g.meeting_location, TRUE
FROM groups g
WHERE g.meeting_location IS NOT NULL
  AND g.meeting_location != ''
  AND NOT EXISTS (
    SELECT 1 FROM group_meeting_locations gml WHERE gml.group_id = g.id
  );
