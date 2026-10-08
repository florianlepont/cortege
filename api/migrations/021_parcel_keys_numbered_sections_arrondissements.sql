-- Migration 021: the commune, section and number of every parcel registered by its IGN identifier
-- (IDU) follow the IDU, numbered sections and arrondissements included (owner request 2026-10-08).
--
-- On the Explorer the IGN polygons are matched to the registered parcels by commune, section and
-- number (PUBLIC_STUDIED_BY_COMMUNES_SQL). Two kinds of parcel never matched:
-- - Alsace-Moselle: sections are numbered ("09"). The parser kept letters only, so such a parcel
--   was registered with the placeholder 00000 / AA / 0000 (migration 020 only repaired IDUs whose
--   section has a letter), and its polygon was dropped.
-- - Paris, Lyon and Marseille: the IDU carries the arrondissement (75112, 69381, 13201), the
--   reverse geocoder the city (75056, 69123, 13055). A parcel found by point was registered with
--   the city code, a parcel registered by id with the arrondissement code.
--
-- The key is now the IDU's on both sides (parseParcelIdu): commune = the IDU's first 5 digits (the
-- arrondissement, since sections restart in every arrondissement), section = the letters of the
-- IDU section ("0A" becomes "A", as migration 020) or, without a letter, its two digits ("09"),
-- number = the IDU's 4 digits. An IDU section "00" is not a section and is left alone, as are the
-- ids that are not an IDU. Only rows whose fields differ change.
--
-- Safe to run twice: the second run finds every IDU row already in its canonical form.

UPDATE parcels p
SET commune_code = canonical.commune_code,
    section = canonical.section,
    number = canonical.number,
    updated_at = NOW()
FROM (
  SELECT id,
         substr(parcel_id, 1, 5) AS commune_code,
         CASE WHEN substr(parcel_id, 9, 2) ~ '[A-Z]'
              THEN regexp_replace(substr(parcel_id, 9, 2), '[^A-Z]', '', 'g')
              ELSE substr(parcel_id, 9, 2)
         END AS section,
         substr(parcel_id, 11, 4) AS number
  FROM parcels
  WHERE parcel_id ~ '^[0-9]{8}[0-9A-Z]{2}[0-9]{4}$'
    AND substr(parcel_id, 9, 2) <> '00'
) canonical
WHERE p.id = canonical.id
  AND (p.commune_code, p.section, p.number)
      IS DISTINCT FROM (canonical.commune_code, canonical.section, canonical.number);
