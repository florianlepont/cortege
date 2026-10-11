-- Migration 023: survey note and weather per survey (phase 27, D-01)
-- surveys.survey_note holds the free observation note of the whole survey (at most 1000
-- characters). surveys.weather holds the weather of the visit as a small JSON object (sky code,
-- temperature, wind, rain over 24 hours, observation and request times, source, edited keys). Both
-- columns are nullable with no default, so adding them is a metadata-only change and every
-- existing survey stays NULL: there is no backfill and no two-step migration (the table holds test
-- surveys only).
-- The CHECK constraints are added NOT VALID, then validated, as in migration 016. The runner
-- applies the whole file in one transaction; the split keeps the add itself scan-free.
-- Runs inside the runner's BEGIN/COMMIT under the advisory lock; every statement is guarded, so
-- running the file again is a no-op. The previous API keeps serving while this runs: its explicit
-- column lists ignore the new columns.
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS survey_note TEXT,
  ADD COLUMN IF NOT EXISTS weather JSONB;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_survey_note_length'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_survey_note_length
      CHECK (survey_note IS NULL OR char_length(survey_note) <= 1000)
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_weather_object'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_weather_object
      CHECK (weather IS NULL OR jsonb_typeof(weather) = 'object')
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_weather_size'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_weather_size
      CHECK (weather IS NULL OR octet_length(weather::text) <= 2048)
      NOT VALID;
  END IF;
END
$$;

-- Validating an already valid constraint is a no-op, so this stays safe on a second run.
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_survey_note_length;
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_weather_object;
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_weather_size;
