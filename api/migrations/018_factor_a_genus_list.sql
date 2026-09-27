-- Migration 018: Factor A genus list (phase 5, ADR-002 D-15, ADR-003 CH-12).
-- Factor A moves from a bare `native_genus_count` number to a list of observed native genera,
-- drawn from the closed CNPF regional list (packages/ibp-domain genus.ts), with the count
-- derived from it. The list lives inside the existing `factors` JSONB column
-- (`factors -> 'A' -> 'genera'`), exactly like the bare count did before it: JSONB is
-- schemaless, so no ALTER TABLE / ADD COLUMN is needed for the new shape itself, and genus-code
-- whitelist validation (against the CNPF list) stays in the application layer
-- (@cortege/ibp-domain), the same way `native_genus_count` was never validated by the database.
--
-- Surveys already recorded as a bare count cannot be decomposed into named genera: there is no
-- way to know, after the fact, which genera an observer counted to reach a stored number. Their
-- Factor A score is unchanged; this migration does not touch, backfill or reinterpret any
-- existing `factors` value. A row whose `factors -> 'A'` has no `genera` key keeps scoring from
-- its legacy `native_genus_count` (packages/ibp-domain rules/common.ts).
--
-- The one thing this migration does add is a cheap shape guard: when a survey's Factor A does
-- carry a `genera` key, it must be a JSON array (not a string, number or object) — a structural
-- sanity check, not a content whitelist. This mirrors the constraint style of migration 016
-- (chk_surveys_ibp_method_version / chk_surveys_ibp_cas): the database enforces the JSON shape,
-- the package enforces which genus codes are valid.
--
-- Guarded and NOT VALID + VALIDATE, so a second run of this file or of the runner is a no-op; the
-- runner applies the whole file in one transaction under its advisory lock, and the previous API
-- keeps serving while this runs (a JSONB shape guard on new writes only affects rows this API
-- version or a newer one writes; the table holds test surveys only, D-04, so the initial
-- validation scan is one short pass).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_factor_a_genera_is_array'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_factor_a_genera_is_array
      CHECK (
        factors -> 'A' -> 'genera' IS NULL
        OR jsonb_typeof(factors -> 'A' -> 'genera') = 'array'
      )
      NOT VALID;
  END IF;
END
$$;

-- Validating an already valid constraint is a no-op, so this stays safe on a second run.
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_factor_a_genera_is_array;
