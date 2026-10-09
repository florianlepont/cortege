-- Migration 022: accent-insensitive search (phase 25, D-16).
--
-- The global search matches "foret" to "Forêt de Bercé" on survey names and member display names,
-- and the phone folds accents the same way (mobile/src/app/search-text.ts). PostgreSQL ILIKE alone
-- does not fold accents, so the queries compare unaccent(column) ILIKE unaccent(pattern).
--
-- The extension is pinned to the public schema: migration specs re-run the whole chain inside
-- scratch schemas, and the extension (a database-wide object) must never belong to one of them.
-- If a host ever lacked the contrib package, the fallback would be the SQL translate() function
-- over a fixed character list (not implemented: the postgres:16 image ships contrib).
--
-- The parcels key index serves the parcel search by commune, section and number (plan 25-10); it
-- is a plain CREATE INDEX (the runner applies each file in a transaction, see README.md).
--
-- Safe to run twice: IF NOT EXISTS on the extension and on the index.

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;

CREATE INDEX IF NOT EXISTS idx_parcels_commune_section_number
  ON parcels (commune_code, section, number);
