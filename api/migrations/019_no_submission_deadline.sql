-- Migration 019: no submission deadline (OA-41, owner scope decision 2026-10-05).
-- A survey no longer expires: the server used to set `expires_at` to creation + 7 days, refuse a
-- later submit and mark the survey `expired` for good. Nothing reads the column any more and the
-- `expired` status is never written, so both go.
--
-- A survey the old rule had marked `expired` goes back to `draft`, so it can be submitted like any
-- other (the production data is the owner's test data, nothing is preserved beyond that). The
-- `expired` events already recorded stay in `survey_events` as history: that table has no CHECK on
-- its event types.
--
-- Safe to run twice: every statement is a no-op the second time.

UPDATE surveys SET status = 'draft' WHERE status = 'expired';

ALTER TABLE surveys DROP CONSTRAINT IF EXISTS chk_surveys_status;
ALTER TABLE surveys
  ADD CONSTRAINT chk_surveys_status CHECK (status IN ('draft', 'submitted', 'synced', 'error'));

ALTER TABLE surveys DROP COLUMN IF EXISTS expires_at;
