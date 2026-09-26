-- Migration 016: IBP method version and cas per survey (phase 01.8, D-02, D-08 and D-10 amended)
-- Every survey carries the IBP method it was recorded under. ibp_method_version holds a known
-- method tag; NULL means v3.0 (every survey recorded before this migration), so there is no
-- backfill. ibp_cas (1-4) and ibp_cas3_scale are the v3.2 station inputs; v3.0 rows keep them
-- NULL. The columns are nullable with no default, so adding them is a metadata-only change.
-- The CHECK constraints are added NOT VALID, then validated (RESEARCH A8). The runner applies the
-- whole file in one transaction, so the ACCESS EXCLUSIVE lock taken by ADD COLUMN is held until
-- COMMIT anyway; the split keeps the add itself scan-free and lets a future large-table rerun
-- move VALIDATE to its own transaction. The table holds test surveys only (D-04): the scan is
-- one short pass.
-- Runs inside the runner's BEGIN/COMMIT under the advisory lock; every statement is guarded, so
-- running the file again is a no-op. The previous API keeps serving while this runs: its
-- explicit column lists ignore the new columns.
ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS ibp_method_version TEXT,
  ADD COLUMN IF NOT EXISTS ibp_cas SMALLINT,
  ADD COLUMN IF NOT EXISTS ibp_cas3_scale BOOLEAN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_ibp_method_version'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_ibp_method_version
      CHECK (ibp_method_version IS NULL OR ibp_method_version IN
             ('cnpf_ibp_fr_v3_0_2023-03-23', 'cnpf_ibp_fr_v3_2_2026-02-02'))
      NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_surveys_ibp_cas'
      AND conrelid = 'surveys'::regclass
  ) THEN
    ALTER TABLE surveys ADD CONSTRAINT chk_surveys_ibp_cas
      CHECK (ibp_cas IS NULL OR ibp_cas IN (1, 2, 3, 4))
      NOT VALID;
  END IF;
END
$$;

-- Validating an already valid constraint is a no-op, so this stays safe on a second run.
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_ibp_method_version;
ALTER TABLE surveys VALIDATE CONSTRAINT chk_surveys_ibp_cas;
