-- Migration 020: commune, section and number of the parcels registered by their IGN identifier
-- (12.2-19, owner report "quand je zoome, je perds l'information de la parcelle avec un IBP").
--
-- The app sends the IGN identifier (IDU: commune 5 digits, prefix 3, section 2, number 4, e.g.
-- 94080000AB0012) of a parcel picked on the map. `parseParcelIdentifier` did not know that form,
-- so every such parcel was registered with the placeholder 00000 / AA / 0000. On the Explorer the
-- IGN polygons are matched to the registered parcels by commune, section and number
-- (PUBLIC_STUDIED_BY_COMMUNES_SQL), so a studied parcel never matched its polygon: the polygon
-- came back "not studied" without its score, while the survey's dot was correct.
--
-- The parser now reads the IDU; this repairs the rows already written, with the same rules
-- (section letters only, as `parseWfsFeatures` keys the IGN features: "0A" becomes "A"). Only rows
-- that still carry the exact placeholder and whose id is an IDU with a lettered section change.
--
-- Safe to run twice: the second run finds no placeholder row left.

UPDATE parcels
SET commune_code = substr(parcel_id, 1, 5),
    section = regexp_replace(substr(parcel_id, 9, 2), '[^A-Z]', '', 'g'),
    number = substr(parcel_id, 11, 4),
    updated_at = NOW()
WHERE parcel_id ~ '^[0-9]{8}[0-9A-Z]{2}[0-9]{4}$'
  AND substr(parcel_id, 9, 2) ~ '[A-Z]'
  AND commune_code = '00000'
  AND section = 'AA'
  AND number = '0000';
