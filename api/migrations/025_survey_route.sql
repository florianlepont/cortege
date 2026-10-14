-- Migration 025: recorded route per survey (phase 30, D-08 and D-09)
-- surveys.survey_route holds the "parcours utilise" recorded with the survey: a small JSON object
-- owned by the shared package (@cortege/ibp-domain, type SurveyRoute): the route method, the
-- counting mode, the zone, the guide the observer followed and the complement, if any.
-- The column is nullable with no default, so adding it is a metadata-only change and every
-- existing survey stays NULL: there is no backfill and no two-step migration. A survey stored
-- before the phase keeps no route and stays valid (O-07). The route is mandatory for a new survey
-- of the new client (enforced by the service, plan 30-10) and read-only after submit (enforced by
-- the service, not by the database), like ibp_method_version.
-- The CHECK constraints are added NOT VALID, then validated, as in migration 023. The runner
-- applies the whole file in one transaction; the split keeps the add itself scan-free.
-- Runs inside the runner's BEGIN/COMMIT under the advisory lock; every statement is guarded, so
-- running the file again is a no-op. The previous API keeps serving while this runs: its explicit
-- column lists ignore the new column.
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS survey_route JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_survey_route_object'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_survey_route_object
      CHECK (survey_route IS NULL OR jsonb_typeof(survey_route) = 'object')
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_survey_route_size'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_survey_route_size
      CHECK (survey_route IS NULL OR octet_length(survey_route::text) <= 4096)
      NOT VALID;
  END IF;
END
$$;

-- Validating an already valid constraint is a no-op, so this stays safe on a second run.
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_survey_route_object;
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_survey_route_size;
