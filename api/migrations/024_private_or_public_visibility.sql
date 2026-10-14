-- Migration 024: private or public before submission (Phase 29, D-06).
-- Every survey submitted so far was visible to every member (Phase 11). The cross-member read
-- paths now filter on visibility again, so every submitted survey is set to 'public' to keep it
-- visible. Drafts keep their value. One 'backfilled' event is written per backfilled survey that
-- still has an author, so the owner's phone pulls the new value (GET /v1/sync/changes returns the
-- survey row for any event newer than the cursor). Safe to run twice: the second run matches no row.
WITH backfilled AS (
  UPDATE surveys
  SET visibility = 'public'
  WHERE status = 'submitted' AND visibility <> 'public'
  RETURNING id, user_id
)
INSERT INTO survey_events (id, survey_id, actor_id, event_type, payload)
SELECT gen_random_uuid()::text, b.id, NULL, 'backfilled',
       jsonb_build_object('reason', 'migration_024', 'visibility', 'public')
FROM backfilled b
WHERE b.user_id IS NOT NULL;

-- The public read paths filter on visibility again (reverts the 017 shape, back to the 015 one).
DROP INDEX IF EXISTS idx_surveys_public_submitted;
CREATE INDEX IF NOT EXISTS idx_surveys_public_submitted
  ON surveys (submitted_at DESC)
  WHERE status = 'submitted' AND visibility = 'public' AND deleted_at IS NULL;
