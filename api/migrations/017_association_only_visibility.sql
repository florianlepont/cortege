-- Migration 017: Association-only sharing (Phase 2)
-- GET /public/map-items, GET /public/parcels/status and the parcel survey-history query now show
-- every submitted survey to every authenticated member, not only ones marked visibility = 'public'
-- (api/src/surveys/public-map.queries.ts, api/src/surveys/parcels.service.ts). The `visibility`
-- column and its CHECK constraint stay: REQ-X-visibility is restored by a future privacy-choice
-- milestone, so nothing about the column itself changes here, only the index that the read
-- queries rely on to avoid a sequential scan.
--
-- idx_surveys_public_submitted (migration 015) must keep matching the predicate the queries now
-- use, or the planner falls back to a sequential scan on surveys. Drop and recreate it without
-- the visibility clause. Runs inside the runner's BEGIN/COMMIT under the advisory lock; both
-- statements are idempotent, so a second run is a no-op.
DROP INDEX IF EXISTS idx_surveys_public_submitted;

CREATE INDEX IF NOT EXISTS idx_surveys_public_submitted
  ON surveys (submitted_at DESC)
  WHERE status = 'submitted' AND deleted_at IS NULL;
